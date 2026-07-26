// lib/orderJourney.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabaseServer";
/* =========================================================
   ORDER JOURNEY STAGES
========================================================= */

export type OrderJourneyStage =
  | "Booked"
  | "In Verification"
  | "Cancellation Request"
  | "New Order"
  | "In Kitchen"
  | "Out for Delivery"
  | "Restro Marked Delivered"
  | "Complaints"
  | "Delivered"
  | "Cancelled"
  | "Not Delivered"
  | "Bad Delivery"
  | "Partial Delivery"
  | "Refund";

type OrderJourneyStagePrefix =
  | "Booked"
  | "InVerification"
  | "CancellationRequest"
  | "NewOrder"
  | "InKitchen"
  | "OutForDelivery"
  | "RestroMarkedDelivered"
  | "Complaints"
  | "Delivered"
  | "Cancelled"
  | "NotDelivered"
  | "BadDelivery"
  | "PartialDelivery"
  | "Refund";

/* =========================================================
   ORDER MASTER DETAILS
========================================================= */

export type OrderJourneyMasterData = {
  restroCode?: string | number | null;
  restroName?: string | null;
  stationCode?: string | null;
  stationName?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
};

/* =========================================================
   UPDATE INPUT
========================================================= */

export type UpdateOrderJourneyInput = {
  /**
   * Optional Supabase service-role client.
   * Agar nahi doge to helper serviceClient use karega.
   */
  supabase?: SupabaseClient<any, any, any>;

  orderId: string;

  /**
   * Journey ka actual stage.
   * Example: "In Kitchen", "Delivered"
   */
  stage: OrderJourneyStage | string;

  /**
   * Orders table ka current Status.
   * Agar nahi diya to normalized stage use hoga.
   */
  status?: string | null;

  subStatus?: string | null;
  remarks?: string | null;

  /**
   * Example:
   * Customer
   * Admin
   * Restro
   * System
   * Auto
   */
  userType?: string | null;

  /**
   * Example:
   * Customer name
   * Admin name
   * Restro name
   * System
   */
  userName?: string | null;

  /**
   * Example:
   * Website
   * Admin Panel
   * Restro Panel
   * Auto Cron
   */
  source?: string | null;

  /**
   * Optional order master details.
   * Create ke waqt dena recommended hai.
   */
  order?: OrderJourneyMasterData | null;

  /**
   * Default false.
   *
   * false:
   * Ek baar kisi stage ke columns fill ho gaye to dobara overwrite nahi honge.
   *
   * true:
   * Existing stage details overwrite ho sakti hain.
   */
  overwriteStage?: boolean;

  /**
   * Optional custom action timestamp.
   * Nahi diya to current time use hoga.
   */
  actionAt?: Date | string | null;
};

export type UpdateOrderJourneyResult = {
  ok: true;
  created: boolean;
  orderId: string;
  stage: OrderJourneyStage;
  prefix: OrderJourneyStagePrefix;
  stageUpdated: boolean;
};

/* =========================================================
   STAGE MAPPING
========================================================= */

const STAGE_PREFIX: Record<OrderJourneyStage, OrderJourneyStagePrefix> = {
  Booked: "Booked",
  "In Verification": "InVerification",
  "Cancellation Request": "CancellationRequest",
  "New Order": "NewOrder",
  "In Kitchen": "InKitchen",
  "Out for Delivery": "OutForDelivery",
  "Restro Marked Delivered": "RestroMarkedDelivered",
  Complaints: "Complaints",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  "Not Delivered": "NotDelivered",
  "Bad Delivery": "BadDelivery",
  "Partial Delivery": "PartialDelivery",
  Refund: "Refund",
};

/* =========================================================
   NORMALIZATION
========================================================= */

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  return text || null;
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const STAGE_ALIASES: Record<string, OrderJourneyStage> = {
  booked: "Booked",
  booking: "Booked",
  orderbooked: "Booked",
  ordercreated: "Booked",

  verification: "In Verification",
  inverification: "In Verification",
  verify: "In Verification",

  cancellationrequest: "Cancellation Request",
  cancelrequest: "Cancellation Request",
  cancellationrequested: "Cancellation Request",

  neworder: "New Order",
  accepted: "New Order",
  accept: "New Order",
  restroaccepted: "New Order",
  restaurantaccepted: "New Order",

  inkitchen: "In Kitchen",
  kitchen: "In Kitchen",
  preparing: "In Kitchen",
  preparation: "In Kitchen",

  outfordelivery: "Out for Delivery",
  dispatched: "Out for Delivery",
  dispatch: "Out for Delivery",

  restromarkeddelivered: "Restro Marked Delivered",
  restaurantmarkeddelivered: "Restro Marked Delivered",
  vendormarkeddelivered: "Restro Marked Delivered",

  complaint: "Complaints",
  complaints: "Complaints",

  delivered: "Delivered",
  autodelivered: "Delivered",

  cancelled: "Cancelled",
  canceled: "Cancelled",

  notdelivered: "Not Delivered",
  undelivered: "Not Delivered",

  baddelivery: "Bad Delivery",

  partialdelivery: "Partial Delivery",
  partiallydelivered: "Partial Delivery",

  refund: "Refund",
  refunded: "Refund",
};

export function normalizeOrderJourneyStage(
  value: OrderJourneyStage | string
): OrderJourneyStage {
  const key = normalizeKey(value);
  const stage = STAGE_ALIASES[key];

  if (!stage) {
    throw new Error(`Unsupported OrderJourney stage: ${String(value)}`);
  }

  return stage;
}

export function getOrderJourneyStagePrefix(
  stage: OrderJourneyStage | string
): OrderJourneyStagePrefix {
  const normalizedStage = normalizeOrderJourneyStage(stage);
  return STAGE_PREFIX[normalizedStage];
}

/* =========================================================
   DATE / TIME HELPERS
   All journey stage dates and times are saved in IST.
========================================================= */

function parseActionDate(value?: Date | string | null): Date {
  if (!value) return new Date();

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid actionAt date");
    }

    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid actionAt value: ${String(value)}`);
  }

  return parsed;
}

function getISTDateTime(value?: Date | string | null) {
  const date = parseActionDate(value);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");

  return {
    iso: date.toISOString(),
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

/* =========================================================
   DATABASE HELPERS
========================================================= */

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function addIfProvided(
  target: Record<string, any>,
  column: string,
  value: unknown
) {
  if (value !== undefined) {
    target[column] = value;
  }
}

function buildMasterPayload(
  order?: OrderJourneyMasterData | null
): Record<string, any> {
  if (!order) return {};

  const payload: Record<string, any> = {};

  if (order.restroCode !== undefined) {
    const rawRestroCode = cleanText(order.restroCode);

    payload.RestroCode =
      rawRestroCode === null || Number.isNaN(Number(rawRestroCode))
        ? null
        : Number(rawRestroCode);
  }

  addIfProvided(payload, "RestroName", cleanText(order.restroName));
  addIfProvided(payload, "StationCode", cleanText(order.stationCode));
  addIfProvided(payload, "StationName", cleanText(order.stationName));
  addIfProvided(payload, "DeliveryDate", cleanText(order.deliveryDate));
  addIfProvided(payload, "DeliveryTime", cleanText(order.deliveryTime));

  return payload;
}

function buildStagePayload(args: {
  prefix: OrderJourneyStagePrefix;
  stage: OrderJourneyStage;
  remarks: string | null;
  userType: string | null;
  userName: string | null;
  source: string | null;
  actionDate: string;
  actionTime: string;
}): Record<string, any> {
  const {
    prefix,
    stage,
    remarks,
    userType,
    userName,
    source,
    actionDate,
    actionTime,
  } = args;

  return {
    [`${prefix}Update`]: stage,
    [`${prefix}Remarks`]: remarks,
    [`${prefix}UserType`]: userType,
    [`${prefix}UserName`]: userName,
    [`${prefix}Source`]: source,
    [`${prefix}ActionAtDate`]: actionDate,
    [`${prefix}ActionAtTime`]: actionTime,
  };
}

/* =========================================================
   MAIN FUNCTION
========================================================= */

export async function updateOrderJourney(
  input: UpdateOrderJourneyInput
): Promise<UpdateOrderJourneyResult> {
  const supabase = input.supabase || serviceClient;

  const orderId = cleanText(input.orderId);

  if (!orderId) {
    throw new Error("OrderJourney update failed: OrderId is required");
  }

  const stage = normalizeOrderJourneyStage(input.stage);
  const prefix = STAGE_PREFIX[stage];

  const status = cleanText(input.status) || stage;
  const subStatus = cleanText(input.subStatus);
  const remarks = cleanText(input.remarks);
  const userType = cleanText(input.userType);
  const userName = cleanText(input.userName);
  const source = cleanText(input.source);

  const overwriteStage = input.overwriteStage === true;
  const actionDateTime = getISTDateTime(input.actionAt);

  /*
   * Existing row read karte hain:
   * 1. Row create karni hai ya update
   * 2. Stage pehle fill ho chuki hai ya nahi
   */
  const { data: existingRow, error: existingError } = await supabase
    .from("OrderJourney")
    .select("*")
    .eq("OrderId", orderId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `OrderJourney lookup failed for ${orderId}: ${existingError.message}`
    );
  }

  const stageUpdateColumn = `${prefix}Update`;
  const stageDateColumn = `${prefix}ActionAtDate`;
  const stageTimeColumn = `${prefix}ActionAtTime`;

  const stageAlreadyCaptured =
    !!existingRow &&
    (hasValue(existingRow[stageUpdateColumn]) ||
      hasValue(existingRow[stageDateColumn]) ||
      hasValue(existingRow[stageTimeColumn]));

  const shouldUpdateStage = overwriteStage || !stageAlreadyCaptured;

  const masterPayload = buildMasterPayload(input.order);

  const commonPayload: Record<string, any> = {
    ...masterPayload,
    Status: status,
    SubStatus: subStatus,
    Remarks: remarks,
    UpdatedAt: actionDateTime.iso,
  };

  const stagePayload = shouldUpdateStage
    ? buildStagePayload({
        prefix,
        stage,
        remarks,
        userType,
        userName,
        source,
        actionDate: actionDateTime.date,
        actionTime: actionDateTime.time,
      })
    : {};

  /* =======================================================
     CREATE NEW JOURNEY ROW
  ======================================================= */

  if (!existingRow) {
    const insertPayload = {
      OrderId: orderId,
      ...commonPayload,
      ...stagePayload,
      CreatedAt: actionDateTime.iso,
    };

    const { error: insertError } = await supabase
      .from("OrderJourney")
      .insert(insertPayload);

    /*
     * Rare race condition:
     * Agar do APIs ek hi waqt par same OrderId insert karein,
     * unique constraint error aa sakta hai.
     * Us case me normal update retry karenge.
     */
    if (insertError) {
      const isDuplicate =
        insertError.code === "23505" ||
        String(insertError.message || "")
          .toLowerCase()
          .includes("duplicate");

      if (!isDuplicate) {
        throw new Error(
          `OrderJourney insert failed for ${orderId}: ${insertError.message}`
        );
      }

      const { error: retryUpdateError } = await supabase
        .from("OrderJourney")
        .update({
          ...commonPayload,
          ...stagePayload,
        })
        .eq("OrderId", orderId);

      if (retryUpdateError) {
        throw new Error(
          `OrderJourney race-condition update failed for ${orderId}: ${retryUpdateError.message}`
        );
      }

      return {
        ok: true,
        created: false,
        orderId,
        stage,
        prefix,
        stageUpdated: shouldUpdateStage,
      };
    }

    return {
      ok: true,
      created: true,
      orderId,
      stage,
      prefix,
      stageUpdated: true,
    };
  }

  /* =======================================================
     UPDATE EXISTING JOURNEY ROW
  ======================================================= */

  const updatePayload = {
    ...commonPayload,
    ...stagePayload,
  };

  const { error: updateError } = await supabase
    .from("OrderJourney")
    .update(updatePayload)
    .eq("OrderId", orderId);

  if (updateError) {
    throw new Error(
      `OrderJourney update failed for ${orderId}: ${updateError.message}`
    );
  }

  return {
    ok: true,
    created: false,
    orderId,
    stage,
    prefix,
    stageUpdated: shouldUpdateStage,
  };
}

/* =========================================================
   SAFE VERSION
   Journey failure se main order/status API fail nahi karni ho
   to ye function use kar sakte ho.
========================================================= */

export async function updateOrderJourneySafe(
  input: UpdateOrderJourneyInput
): Promise<UpdateOrderJourneyResult | null> {
  try {
    return await updateOrderJourney(input);
  } catch (error) {
    console.error("OrderJourney update warning:", {
      orderId: input.orderId,
      stage: input.stage,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });

    return null;
  }
}

export default updateOrderJourney;
