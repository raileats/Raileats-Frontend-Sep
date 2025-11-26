// app/utils/checkCutoff.ts

export function canPlaceOrder(
  deliveryDate: string,  // "27-11-2025" ya "2025-11-27"
  deliveryTime: string,  // "00:35"
  cutoffMinutes: number = 90
): { ok: boolean; message?: string } {
  if (!deliveryDate || !deliveryTime) {
    return { ok: false, message: "Please select delivery date and time." };
  }

  // ---- DATE PARSING (dd-MM-yyyy OR yyyy-MM-dd dono support) ----
  const parts = deliveryDate.split("-");

  let dd: number, mm: number, yyyy: number;

  if (parts[0].length === 4) {
    // Format: yyyy-MM-dd  (HTML date input ka actual value)
    [yyyy, mm, dd] = parts.map(Number);
  } else {
    // Assume: dd-MM-yyyy  (jo tum UI me dikhte ho)
    [dd, mm, yyyy] = parts.map(Number);
  }

  const [HH, MM] = deliveryTime.split(":").map(Number);

  // Browser ka local time (India me IST)
  const journey = new Date(yyyy, mm - 1, dd, HH, MM, 0, 0);

  if (isNaN(journey.getTime())) {
    console.error("Invalid journey date/time:", { deliveryDate, deliveryTime, dd, mm, yyyy, HH, MM });
    return { ok: false, message: "Invalid journey date or time" };
  }

  const now = new Date();

  // 1) Agar train time nikal chuka hai -> direct error
  if (journey <= now) {
    return { ok: false, message: "Train / delivery time already passed" };
  }

  // 2) Kitna time bacha hai (minutes me)
  const diffMs = journey.getTime() - now.getTime();
  const diffMinutes = diffMs / 60000;

  // 3) Agar bacha hua time cutoff se kam hai -> error
  if (diffMinutes < cutoffMinutes) {
    return {
      ok: false,
      message: `Booking closed. Orders must be placed at least ${cutoffMinutes} minutes before delivery time.`,
    };
  }

  // 4) Warna allowed
  return { ok: true };
}
