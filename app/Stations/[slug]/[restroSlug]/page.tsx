import React from "react";
import { extractStationCode } from "../../../lib/stationSlug";
import { extractRestroCode } from "../../../lib/restroSlug";
import RestroMenuClient from "./RestroMenuClient";

export const revalidate = 60;
export const runtime = "nodejs";

/* ================= HELPERS ================= */

function humanizeFromSlug(
  restroSlug: string
) {

  return decodeURIComponent(
    restroSlug
  )
    .replace(/^\d+-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .trim()
    .split(" ")
    .map(
      (w) =>
        w[0]?.toUpperCase() +
        w.slice(1)
    )
    .join(" ");

}

/* ================= FETCH ================= */

async function fetchOnMenu(
  restroCode:
    | string
    | number,
  arrivalTime: string
) {

  try {

    const res = await fetch(

      `https://raileats.in/api/restro-menu?restro=${restroCode}&arrivalTime=${arrivalTime}`,

      {
        cache: "no-store",
      }

    );

    const json =
      await res.json();

    return json?.items || [];

  } catch (e) {

    return [];

  }

}

/* ================= TIME CHECK ================= */

function isTimeInRange(
  arrival: string,
  start?: string,
  end?: string
) {

  if (!start || !end) {
    return true;
  }

  const toMin = (
    t: string
  ) => {

    const [h, m] = t
      .split(":")
      .map(Number);

    return h * 60 + m;

  };

  const a = toMin(
    arrival.slice(0, 5)
  );

  const s = toMin(
    start.slice(0, 5)
  );

  const e = toMin(
    end.slice(0, 5)
  );

  /* NORMAL */

  if (s <= e) {

    return (
      a >= s &&
      a <= e
    );

  }

  /* OVERNIGHT */

  return (
    a >= s ||
    a <= e
  );

}

/* ================= NORMALIZE CATEGORY ================= */

function normalizeCategory(
  category?: string | null,
  itemName?: string | null
) {

  const cat = String(
    category || ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  /* DB VALUE */

  if (
    cat === "non-veg" ||
    cat === "nonveg"
  ) {
    return "Non-Veg";
  }

  if (
    cat === "veg" ||
    cat === "jain"
  ) {
    return "Veg";
  }

  /* AUTO FALLBACK */

  const name = String(
    itemName || ""
  ).toLowerCase();

  if (
    name.includes(
      "chicken"
    ) ||
    name.includes("egg") ||
    name.includes("fish") ||
    name.includes(
      "mutton"
    )
  ) {
    return "Non-Veg";
  }

  return "Veg";

}

/* ================= PAGE ================= */

export default async function Page({
  params,
  searchParams,
}: any) {

  /* PARAMS */

  const stationCode =
    extractStationCode(
      params.slug
    ) || "";

  const restroCode =
    extractRestroCode(
      params.restroSlug
    ) || "";

  const outletName =
    humanizeFromSlug(
      params.restroSlug
    );

  const stationName =
    params.slug
      ?.split("-")
      ?.slice(1)
      ?.join(" ") ||
    stationCode;

  /* URL DATA */

  const deliveryDate =
    searchParams
      ?.deliveryDate ||
    searchParams?.date ||
    "";

  const deliveryTime =
    searchParams
      ?.deliveryTime ||
    searchParams?.arrival?.slice(
      0,
      5
    ) ||
    searchParams?.arrivalTime?.slice(
      0,
      5
    ) ||
    "";

  /* TRAIN */

  const trainName =
    searchParams
      ?.trainName &&
    searchParams
      ?.trainName !==
      "Train"
      ? searchParams.trainName
      : "";

  const trainNumber =
    searchParams?.train ||
    "";

  /* MIN ORDER */

  const minOrderFromUrl =
    searchParams
      ?.minOrder || "0";

  /* ARRIVAL */

  let arrivalTime =
    "12:00:00";

  if (deliveryTime) {

    const clean =
      deliveryTime.slice(
        0,
        5
      );

    arrivalTime =
      clean + ":00";

  }

  /* ================= FETCH ================= */

  const rawItems =
    await fetchOnMenu(
      restroCode,
      arrivalTime
    );

  /* ================= FILTER & CLEAN ================= */

  const items = (
    rawItems || []
  )

    .map((it: any) => {

      const finalCategory =
        normalizeCategory(
          it?.item_category,
          it?.item_name
        );

      return {

        id: Number(
          it?.id
        ),

        item_name:
          it?.item_name ||
          "",

        base_price:
          Number(
            it?.base_price ||
              it?.selling_price ||
              0
          ),

        /* CATEGORY */

        item_category:
          finalCategory,

        /* MENU TYPE */

        menu_type:
          it?.menu_type ||
          it?.item_type ||
          it?.category ||
          "Meals",

        /* DESCRIPTION */

        item_description:
          it?.item_description ||
          it?.description ||
          "",

        /* TIMES */

        start_time:
          it?.start_time ||
          it?.item_start_time ||
          null,

        end_time:
          it?.end_time ||
          it?.item_end_time ||
          null,

        /* STATUS */

        status: String(
          it?.status ||
            "ON"
        ).toUpperCase(),

        /* CUISINE */

        item_cuisine:
          it?.item_cuisine ||
          null,

      };

    })

    .filter((it: any) => {

      /* STATUS */

      if (
        it.status !== "ON"
      ) {
        return false;
      }

      /* TIME */

      return isTimeInRange(
        arrivalTime,
        it.start_time,
        it.end_time
      );

    });

  /* ================= HEADER ================= */

  const header = {

    stationCode,

    restroCode:
      String(restroCode),

    outletName,

    stationName,

    minimumOrder:
      Number(
        minOrderFromUrl
      ),

  };

  /* ================= NEXT PARAMS ================= */

  const nextParams = {

    stationName,

    stationCode,

    deliveryDate,

    deliveryTime,

    trainName,

    trainNumber,

    vendorName:
      outletName,

  };

  /* ================= UI ================= */

  return (

    <main className="container-app">

      <RestroMenuClient
        header={header}
        items={items}
        nextParams={
          nextParams
        }
      />

    </main>

  );

}
