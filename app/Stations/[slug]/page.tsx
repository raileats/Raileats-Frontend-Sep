import React from "react";

export const dynamic = "force-dynamic";

export default async function Page(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const slug = resolvedParams.slug || "";
  const stationCode = slug.split("-")[0].toUpperCase();

  const arrival = (resolvedSearchParams.arrival || "00:00").slice(0, 5);
  const stationName = resolvedSearchParams.stationName || stationCode;

  const trainNum = resolvedSearchParams.train || "--";

  /* ================= ONLY RESTAURANT ================= */

  const restaurant = {
    RestroCode: "1004",
    RestroName: "Mizaz E Bhopal",
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      <h1 className="text-2xl font-bold mb-4">
        {stationName}
      </h1>

      <p className="mb-6 text-gray-500">
        Arrival: {arrival}
      </p>

      {/* ONLY ONE RESTAURANT */}
      <div className="border p-5 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-3">
          {restaurant.RestroName}
        </h3>

        <a
          href={`/menu?restro=1004&arrival=${arrival}&stationName=${stationName}&train=${trainNum}&halt=--`}
          className="block text-center bg-black text-white py-2 rounded"
        >
          Order Now
        </a>
      </div>

    </main>
  );
}
