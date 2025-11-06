// app/lib/priceUtil.ts

/** Format a number as Indian Rupees. Drops .00 for whole amounts. */
export function formatINRCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  const s = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return "₹" + s.replace(/\.00$/, "");
}

/** Strict formatter with currency style (always shows decimals per locale). */
export function formatINR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Safe parse from any input to a finite number (else 0). */
export function toAmount(x: unknown): number {
  const n = typeof x === "string" ? Number(x.replace(/[^\d.]/g, "")) : Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** Sum helper */
export function sum(nums: Array<number | null | undefined>): number {
  let t = 0;
  for (let i = 0; i < nums.length; i++) {
    const v = Number(nums[i] ?? 0);
    if (Number.isFinite(v)) t += v;
  }
  return t;
}

/** Cart line type (loose) */
export type CartLineLike = {
  qty?: number | string | null;
  price?: number | string | null;
};

/** Compute basic cart totals (no taxes/fees yet). */
export function calcCartSummary(lines: CartLineLike[]) {
  let itemCount = 0;
  let subtotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const q = toAmount(lines[i]?.qty ?? 0);
    const p = toAmount(lines[i]?.price ?? 0);
    if (q > 0 && p >= 0) {
      itemCount += q;
      subtotal += q * p;
    }
  }

  return {
    itemCount,
    subtotal,
    subtotalLabel: formatINRCompact(subtotal),
  };
}

/** Optional: apply flat discount % (e.g., for offers) */
export function applyPercentDiscount(amount: number, percent: number) {
  const a = toAmount(amount);
  const p = toAmount(percent);
  const off = (a * p) / 100;
  const total = Math.max(0, a - off);
  return {
    discount: off,
    discountLabel: formatINRCompact(off),
    total,
    totalLabel: formatINRCompact(total),
  };
}

/** Alias to match pages that import { priceStr } */
export const priceStr = formatINRCompact;

/** Default export for legacy imports */
export default formatINRCompact;
