const LAST_PNR_KEY = "raileats_last_pnr";

const ACTIVE_BOOKING_LOCAL_KEYS = [
  "cart",
  "journey",
  "raileats_pnr_details",
  "raileats_min_order",
  "order_data",
];

const ACTIVE_BOOKING_SESSION_KEYS = [
  "raileats_order_draft",
  "raileats_payment_payload",
];

export function normalizePnr(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

export function rememberLastPnr(value: unknown) {
  if (typeof window === "undefined") return;

  const pnr = normalizePnr(value);
  if (pnr.length !== 10) return;

  localStorage.setItem(LAST_PNR_KEY, pnr);
}

export function getLastPnr() {
  if (typeof window === "undefined") return "";
  return normalizePnr(localStorage.getItem(LAST_PNR_KEY));
}

export function clearCompletedBookingState(pnr?: unknown) {
  if (typeof window === "undefined") return;

  rememberLastPnr(pnr);

  for (const key of ACTIVE_BOOKING_LOCAL_KEYS) {
    localStorage.removeItem(key);
  }

  for (const key of ACTIVE_BOOKING_SESSION_KEYS) {
    sessionStorage.removeItem(key);
  }
}
