import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CouponRow = Record<string, any>;

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "active";
}

function normalizeCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function isWithinValidity(coupon: CouponRow, now: Date) {
  const validFrom = coupon.ValidFrom ? new Date(coupon.ValidFrom) : null;
  const validTill = coupon.ValidTill ? new Date(coupon.ValidTill) : null;

  if (validFrom && !Number.isNaN(validFrom.getTime()) && validFrom > now) {
    return false;
  }

  if (validTill && !Number.isNaN(validTill.getTime()) && validTill < now) {
    return false;
  }

  return true;
}

function isProviderValid(
  coupon: CouponRow,
  _restroCode: string
) {
  const provider = normalizeCode(
    coupon.CouponProvider || "RAILEATS"
  );

  return (
    provider === "RAILEATS" ||
    provider === "RESTRO" ||
    provider === "BOTH"
  );
}

function calculateDiscount(coupon: CouponRow, subtotal: number) {
  const type = normalizeCode(coupon.CouponType || "FLAT");
  const value = toNumber(coupon.DiscountValue, 0);
  const maxDiscount = toNumber(coupon.MaximumDiscountAmount, 0);

  let discount = 0;

  if (type === "PERCENT" || type === "PERCENTAGE") {
    discount = (subtotal * value) / 100;
    if (maxDiscount > 0) {
      discount = Math.min(discount, maxDiscount);
    }
  } else {
    discount = value;
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return Math.round(discount * 100) / 100;
}

function buildCouponView(coupon: CouponRow, subtotal: number, quantity: number, restroCode: string) {
  const minimumOrderValue = toNumber(coupon.MinimumOrderValue, 0);
  const maximumOrderValue = toNumber(coupon.MaximumOrderValue, 0);
  const minimumQuantity = toNumber(coupon.MinimumQuantity, 0);
  const maximumQuantity = toNumber(coupon.MaximumQuantity, 0);
  const usageLimitTotal = toNumber(coupon.UsageLimitTotal, 0);
  const usedCount = toNumber(coupon.UsedCount, 0);
  const calculatedDiscount = calculateDiscount(coupon, subtotal);

  let eligible = true;
  let lockedReason = "";
  let amountToAdd = 0;

  if (!isProviderValid(coupon, restroCode)) {
    eligible = false;
    lockedReason = "Coupon is not valid for this restaurant.";
  } else if (minimumOrderValue > 0 && subtotal < minimumOrderValue) {
    eligible = false;
    amountToAdd = Math.max(0, minimumOrderValue - subtotal);
    lockedReason = `Add food worth ₹${Math.ceil(amountToAdd)} more to unlock this coupon.`;
  } else if (maximumOrderValue > 0 && subtotal > maximumOrderValue) {
    eligible = false;
    lockedReason = `Coupon is valid up to ₹${maximumOrderValue} order value.`;
  } else if (minimumQuantity > 0 && quantity < minimumQuantity) {
    eligible = false;
    lockedReason = `Add ${minimumQuantity - quantity} more item(s) to unlock this coupon.`;
  } else if (maximumQuantity > 0 && quantity > maximumQuantity) {
    eligible = false;
    lockedReason = `Coupon is valid up to ${maximumQuantity} item(s).`;
  } else if (usageLimitTotal > 0 && usedCount >= usageLimitTotal) {
    eligible = false;
    lockedReason = "Coupon usage limit reached.";
  } else if (calculatedDiscount <= 0) {
    eligible = false;
    lockedReason = "Coupon is not applicable on this order.";
  }

  const couponCode = normalizeCode(coupon.CouponCode);
  const couponName = String(coupon.CouponName || couponCode || "RailEats coupon");

  return {
    CouponId: coupon.CouponId,
    CouponName: couponName,
    CouponCode: couponCode,
    CouponType: normalizeCode(coupon.CouponType || "FLAT"),
    DiscountValue: toNumber(coupon.DiscountValue, 0),
    Description: coupon.Description || "",
    CouponProvider: coupon.CouponProvider || "RAILEATS",
    RestroCode: coupon.RestroCode ?? null,
    eligible,
    lockedReason,
    amountToAdd: Math.round(amountToAdd * 100) / 100,
    calculatedDiscount,
    displayDiscount:
      normalizeCode(coupon.CouponType) === "PERCENT" ||
      normalizeCode(coupon.CouponType) === "PERCENTAGE"
        ? `${toNumber(coupon.DiscountValue, 0)}% OFF`
        : `₹${calculatedDiscount} OFF`,
    minimumOrderValue,
    maximumOrderValue: maximumOrderValue || null,
    minimumQuantity,
    maximumQuantity: maximumQuantity || null,
    maximumDiscountAmount: toNumber(coupon.MaximumDiscountAmount, 0) || null,
    priority: toNumber(coupon.Priority, 0),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const subtotal = toNumber(url.searchParams.get("subtotal"), 0);
    const quantity = toNumber(url.searchParams.get("quantity"), 0);
    const restroCode = String(url.searchParams.get("restroCode") || "").trim();
    const now = new Date();

    const { data, error } = await serviceClient
      .from("Coupons")
      .select("*")
      .eq("IsActive", true)
      .eq("ShowToCustomer", true);

    if (error) {
      return NextResponse.json(
        { ok: false, success: false, error: error.message, coupons: [], data: [] },
        { status: 500 }
      );
    }

    const coupons = (Array.isArray(data) ? data : [])
      .filter((coupon) => toBoolean(coupon.IsActive))
      .filter((coupon) => toBoolean(coupon.ShowToCustomer))
      .filter((coupon) => isWithinValidity(coupon, now))
      .filter((coupon) => isProviderValid(coupon, restroCode))
      .map((coupon) => buildCouponView(coupon, subtotal, quantity, restroCode))
      .sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        if (b.calculatedDiscount !== a.calculatedDiscount) {
          return b.calculatedDiscount - a.calculatedDiscount;
        }
        return b.priority - a.priority;
      });

    const eligibleCoupons = coupons.filter((coupon) => coupon.eligible);
    const nearestLockedCoupon =
      coupons
        .filter((coupon) => !coupon.eligible && coupon.amountToAdd > 0)
        .sort((a, b) => a.amountToAdd - b.amountToAdd)[0] || null;

    return NextResponse.json({
      ok: true,
      success: true,
      coupons,
      data: coupons,
      hasEligibleCoupons: eligibleCoupons.length > 0,
      nearestLockedCoupon,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Server error",
        coupons: [],
        data: [],
      },
      { status: 500 }
    );
  }
}
