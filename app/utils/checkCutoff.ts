// app/utils/checkCutoff.ts

export function canPlaceOrder(
  deliveryDate: string,   // "27-11-2025" ya "2025-11-27"
  deliveryTime: string,   // "00:35"
  cutoffMinutes: number   // yahi RestroMaster.CutOffTime se aayega
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
    // yyyy-MM-dd
    [yyyy, mm, dd] = parts.map(Number);
  } else {
    // dd-MM-yyyy
    [dd, mm, yyyy] = parts.map(Number);
  }

  const now = new Date();

  // today (date only)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deliveryDateOnly = new Date(yyyy, mm - 1, dd);

  // 1) agar delivery date aaj se different hai -> cutoff mat lagao (allowed)
  if (deliveryDateOnly.getTime() !== today.getTime()) {
    return { ok: true };
  }

  // 2) yahan aaye matlab delivery date == aaj
  // ab time parse karo
  const [HH, MM] = deliveryTime.split(":").map(Number);
  const deliveryDateTime = new Date(yyyy, mm - 1, dd, HH, MM, 0, 0);

  if (isNaN(deliveryDateTime.getTime())) {
    return { ok: false, message: "Invalid journey date or time." };
  }

  // cutoff time = delivery time - CutOffTime (minutes)
  const cutoffTime = new Date(
    deliveryDateTime.getTime() - cutoffMinutes * 60 * 1000
  );

  // agar current time > cutoff time -> error
  if (now > cutoffTime) {
    return {
      ok: false,
      message: `Booking closed. Today’s orders must be placed at least ${cutoffMinutes} minutes before delivery time.`,
    };
  }

  // otherwise allowed
  return { ok: true };
}
