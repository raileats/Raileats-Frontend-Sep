export function canPlaceOrder(
  deliveryDate: string,  // "26-11-2025"
  deliveryTime: string,  // "21:50"
  cutoffMinutes: number = 90
): { ok: boolean; message?: string } {
  // Parse date "dd-MM-yyyy"
  const [dd, mm, yyyy] = deliveryDate.split("-").map(Number);
  const [HH, MM] = deliveryTime.split(":").map(Number);

  const journey = new Date(yyyy, mm - 1, dd, HH, MM, 0, 0); // IST browser local
  if (isNaN(journey.getTime())) {
    return { ok: false, message: "Invalid journey date or time" };
  }

  const now = new Date();

  // --- DATE only (ignore time)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const journeyDateOnly = new Date(yyyy, mm - 1, dd);

  if (journeyDateOnly < today) {
    return { ok: false, message: "Train date is already in the past" };
  }

  if (journeyDateOnly > today) {
    return { ok: true };
  }

  // Same date ⇒ Check cutoff
  const cutoff = new Date(journey.getTime() - cutoffMinutes * 60 * 1000);

  if (now > journey) {
    return { ok: false, message: "Train / delivery time already passed" };
  }

  if (now > cutoff) {
    return {
      ok: false,
      message: `Booking closed. Orders must be placed at least ${cutoffMinutes} minutes before delivery time.`,
    };
  }

  return { ok: true };
}
