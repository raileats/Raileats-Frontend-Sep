// app/utils/checkCutoff.ts

export function canPlaceOrder(
  deliveryDate: string,   // "27-11-2025" ya "2025-11-27"
  deliveryTime: string,   // "01:05"
  cutoffMinutes: number   // RestroMaster.CutOffTime (minutes)
): { ok: boolean; message?: string } {
  if (!deliveryDate || !deliveryTime) {
    return { ok: false, message: "Please select delivery date and time." };
  }

  // agar restaurant ne cutoff set hi nahi kiya (0 ya null) -> no restriction
  if (!cutoffMinutes || cutoffMinutes <= 0) {
    return { ok: true };
  }

  // ---- DATE PARSE (dd-MM-yyyy OR yyyy-MM-dd) ----
  const parts = deliveryDate.split("-");
  let dd: number, mm: number, yyyy: number;

  if (parts[0].length === 4) {
    // yyyy-MM-dd  (HTML <input type="date">)
    [yyyy, mm, dd] = parts.map(Number);
  } else {
    // dd-MM-yyyy
    [dd, mm, yyyy] = parts.map(Number);
  }

  const now = new Date();

  // today (date only)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deliveryDateOnly = new Date(yyyy, mm - 1, dd);

  // 👉 Sirf jab booking date == delivery date tab cutoff apply karo
  if (deliveryDateOnly.getTime() !== today.getTime()) {
    return { ok: true };
  }

  // Delivery time parse
  const [HH, MM] = deliveryTime.split(":").map(Number);
  const deliveryDateTime = new Date(yyyy, mm - 1, dd, HH, MM, 0, 0);

  if (isNaN(deliveryDateTime.getTime())) {
    return { ok: false, message: "Invalid journey date or time." };
  }

  // --- Tumhara rule: (delivery - now) > cutoffMinutes hona chahiye ---
  const diffMs = deliveryDateTime.getTime() - now.getTime();
  const diffMinutes = diffMs / 60000;

  // Agar bacha hua time CutOffTime se kam ya barabar hai → error
  // (matlab 1 min bhi extra nahi bacha)
  if (diffMinutes <= cutoffMinutes) {
    return {
      ok: false,
      message: `Booking closed. Today’s orders must be placed more than ${cutoffMinutes} minutes before delivery time.`,
    };
  }

  return { ok: true };
}
