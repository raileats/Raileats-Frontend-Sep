import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CouponRow = Record<string, any>;

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeMobile(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("91") ? digits.slice(-10) : digits.slice(-10);
}

function isActive(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "active";
}

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, success: false, message, error: message }, { status });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calculateDiscount(coupon: CouponRow, subtotal: number) {
  const type = normalizeCode(coupon.CouponType || "FLAT");
  const value = toNumber(coupon.DiscountValue, 0);
  const maxDiscount = toNumber(coupon.MaximumDiscountAmount, 0);

  let discount = 0;

  if (type === "PERCENT" || type === "PERCENTAGE") {
    discount = (subtotal * value) / 100;
    if (maxDiscount > 0) discount = Math.min(discount, maxDiscount);
  } else {
    discount = value;
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return Math.round(discount * 100) / 100;
}

function usageCreatedAt(row: Record<string, any>) {
  return row.CreatedAt || row.created_at || row.UsedAt || row.used_at || row.createdAt;
}

async function getCustomerUsageCount(couponId: unknown, customerMobile: string, frequency: string) {
  if (!couponId || !customerMobile) return 0;

  try {
    const { data, error } = await serviceClient
      .from("CouponUsage")
      .select("*")
      .eq("CouponId", couponId)
      .eq("CustomerMobile", customerMobile);

    if (error || !Array.isArray(data)) {
      if (error) console.error("COUPON USAGE FETCH ERROR =>", error);
      return 0;
    }

    const now = new Date();
    let from: Date | null = null;

    if (frequency === "DAILY") from = startOfDay(now);
    if (frequency === "WEEKLY") from = startOfWeek(now);
    if (frequency === "MONTHLY") from = startOfMonth(now);

    if (!from || frequency === "ONCE" || frequency === "UNLIMITED") {
      return data.length;
    }

    return data.filter((row) => {
      const createdAt = usageCreatedAt(row);
      if (!createdAt) return false;
      const date = new Date(createdAt);
      return !Number.isNaN(date.getTime()) && date >= from;
    }).length;
  } catch (error) {
    console.error("COUPON USAGE FETCH EXCEPTION =>", error);
    return 0;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const couponCode = normalizeCode(body?.couponCode);
    const subtotal = toNumber(body?.subtotal, 0);
    const quantity = toNumber(body?.quantity, 0);
    const restroCode = String(body?.restroCode ?? "").trim();
    const customerMobile = normalizeMobile(body?.customerMobile);

    if (!couponCode) return fail("Please enter a coupon code.");
    if (subtotal <= 0) return fail("Cart subtotal is required.");

    const exactMatch = await serviceClient
      .from("Coupons")
      .select("*")
      .eq("CouponCode", couponCode)
      .limit(1)
      .maybeSingle();

    const fallbackMatch =
      exactMatch.error || !exactMatch.data
        ? await serviceClient
            .from("Coupons")
            .select("*")
            .ilike("CouponCode", couponCode)
            .limit(1)
            .maybeSingle()
        : exactMatch;

    const { data, error } = fallbackMatch;

    if (error) return fail(error.message, 500);
    if (!data) return fail("Invalid coupon code.");

    const coupon = data as CouponRow;
    const now = new Date();
    const provider = normalizeCode(coupon.CouponProvider || "RAILEATS");

    if (!isActive(coupon.IsActive) || !isActive(coupon.ShowToCustomer)) {
      return fail("Coupon is inactive.");
    }

    if (coupon.ValidFrom) {
      const validFrom = new Date(coupon.ValidFrom);
      if (!Number.isNaN(validFrom.getTime()) && validFrom > now) {
        return fail("Coupon is not active yet.");
      }
    }

    if (coupon.ValidTill) {
      const validTill = new Date(coupon.ValidTill);
      if (!Number.isNaN(validTill.getTime()) && validTill < now) {
        return fail("Coupon has expired.");
      }
    }

    

    const minimumOrderValue = toNumber(coupon.MinimumOrderValue, 0);
    const maximumOrderValue = toNumber(coupon.MaximumOrderValue, 0);
    const minimumQuantity = toNumber(coupon.MinimumQuantity, 0);
    const maximumQuantity = toNumber(coupon.MaximumQuantity, 0);
    const usageLimitTotal = toNumber(coupon.UsageLimitTotal, 0);
    const usageLimitPerUser = toNumber(coupon.UsageLimitPerUser, 0);
    const usedCount = toNumber(coupon.UsedCount, 0);
    const frequency = normalizeCode(coupon.CouponFrequency || "UNLIMITED");

    if (minimumOrderValue > 0 && subtotal < minimumOrderValue) {
      return fail(`Add food worth ₹${Math.ceil(minimumOrderValue - subtotal)} more to use this coupon.`);
    }

    if (maximumOrderValue > 0 && subtotal > maximumOrderValue) {
      return fail(`Coupon is valid up to ₹${maximumOrderValue} order value.`);
    }

    if (minimumQuantity > 0 && quantity < minimumQuantity) {
      return fail(`Add ${minimumQuantity - quantity} more item(s) to use this coupon.`);
    }

    if (maximumQuantity > 0 && quantity > maximumQuantity) {
      return fail(`Coupon is valid up to ${maximumQuantity} item(s).`);
    }

    if (usageLimitTotal > 0 && usedCount >= usageLimitTotal) {
      return fail("Coupon usage limit reached.");
    }

    const customerUsageCount = await getCustomerUsageCount(
      coupon.CouponId,
      customerMobile,
      frequency
    );

    if (frequency === "ONCE" && customerUsageCount > 0) {
      return fail("Coupon can be used only once per customer.");
    }

    if (["DAILY", "WEEKLY", "MONTHLY"].includes(frequency) && customerUsageCount > 0) {
      return fail(`Coupon can be used once per ${frequency.toLowerCase()} by this customer.`);
    }

    if (usageLimitPerUser > 0 && customerUsageCount >= usageLimitPerUser) {
      return fail("Per-user coupon usage limit reached.");
    }

    const discountAmount = calculateDiscount(coupon, subtotal);

    if (discountAmount <= 0) {
      return fail("Coupon is not applicable on this order.");
    }

    return NextResponse.json({
      ok: true,
      success: true,
      coupon: {
        CouponId: coupon.CouponId,
        CouponCode: normalizeCode(coupon.CouponCode),
        CouponName: coupon.CouponName || coupon.CouponCode,
        CouponType: coupon.CouponType,
        DiscountValue: toNumber(coupon.DiscountValue, 0),
      },
      discountAmount,
      message: `${normalizeCode(coupon.CouponCode)} applied. You saved ₹${discountAmount}.`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Server error", 500);
  }
}
