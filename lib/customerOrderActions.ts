// lib/customerOrderActions.ts
export type CustomerResponse = {
  action: "Delivered" | "Issue";
  issueType: string;
  rating: number | null;
  remarks: string;
  createdAt: string;
};

export type CustomerActionOrder = {
  deliveryDate: string;
  deliveryTime: string;
  status: string;
  customerResponse?: CustomerResponse | null;
};

const INDIA_OFFSET_MINUTES = 330;
const CANCELLATION_CUTOFF_MINUTES = 90;
const CUSTOMER_RESPONSE_DELAY_MINUTES = 30;

export function normalizeOrderStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseDate(value: unknown) {
  const input = String(value ?? "").trim();
  let match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  match = input.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (!match) return null;
  return {
    year: Number(match[3]),
    month: Number(match[2]),
    day: Number(match[1]),
  };
}

function parseTime(value: unknown) {
  const input = String(value ?? "00:00").trim().toUpperCase();
  const match = input.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/,
  );
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = match[4] || "";

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  return { hour, minute, second };
}

export function parseIndiaDeliveryDateTime(
  deliveryDate: unknown,
  deliveryTime: unknown,
) {
  const date = parseDate(deliveryDate);
  const time = parseTime(deliveryTime);
  if (!date || !time) return null;

  const validation = new Date(
    Date.UTC(
      date.year,
      date.month - 1,
      date.day,
      time.hour,
      time.minute,
      time.second,
    ),
  );
  if (
    validation.getUTCFullYear() !== date.year ||
    validation.getUTCMonth() !== date.month - 1 ||
    validation.getUTCDate() !== date.day
  ) {
    return null;
  }

  return new Date(
    validation.getTime() - INDIA_OFFSET_MINUTES * 60_000,
  );
}

export function canCustomerCancel(
  order: CustomerActionOrder,
  nowMs = Date.now(),
) {
  const status = normalizeOrderStatus(order.status);
  if (
    !["booked", "verification", "inverification", "neworder"].includes(status)
  ) {
    return false;
  }

  const delivery = parseIndiaDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  return Boolean(
    delivery &&
      nowMs <=
        delivery.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000,
  );
}

export function canSubmitCustomerDeliveryResponse(
  order: CustomerActionOrder,
  nowMs = Date.now(),
) {
  const status = normalizeOrderStatus(order.status);
  if (
    order.customerResponse ||
    ["cancelled", "cancellationrequest", "notdelivered"].includes(status)
  ) {
    return false;
  }

  const delivery = parseIndiaDeliveryDateTime(
    order.deliveryDate,
    order.deliveryTime,
  );
  return Boolean(
    delivery &&
      nowMs >=
        delivery.getTime() + CUSTOMER_RESPONSE_DELAY_MINUTES * 60_000,
  );
}
