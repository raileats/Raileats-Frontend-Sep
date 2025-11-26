export function canPlaceOrder(
  deliveryDate: string,  // "27-11-2025"
  deliveryTime: string,  // "00:35"
  cutoffMinutes: number = 90
): { ok: boolean; message?: string } {
  // Parse date "dd-MM-yyyy"
  const [dd, mm, yyyy] = deliveryDate.split("-").map(Number);
  const [HH, MM] = deliveryTime.split(":").map(Number);

  // Browser local time (India me IST)
  const journey = new Date(yyyy, mm - 1, dd, HH, MM, 0, 0);

  if (isNaN(journey.getTime())) {
    return { ok: false, message: "Invalid journey date or time" };
  }

  const now = new Date();

  // 1) Agar journey time already nikal chuka hai -> direct error
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
