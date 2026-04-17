"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import RestroMenuClient from "../restro/[restroCode]/menu/RestroMenuClient"; // 👈 IMPORTANT

export default function MenuPage() {
  const searchParams = useSearchParams();

  const restro = searchParams.get("restro");
  const arrival = searchParams.get("arrival");
  const stationName = searchParams.get("stationName");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(
          `/api/getMenu?restro=${restro}&arrival=${arrival}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        console.log("MENU API:", data);

        setItems(data.items || []);
      } catch (e) {
        console.error("MENU ERROR:", e);
      } finally {
        setLoading(false);
      }
    }

    if (restro) loadMenu();
  }, [restro, arrival]);

  if (loading) {
    return <div className="p-4">Loading menu...</div>;
  }

  return (
    <div className="p-4">
      <RestroMenuClient
        header={{
          restroCode: restro || "",
          stationCode: "",
          outletName: "Restaurant",
          stationName: stationName || "",
        }}
        items={items}
        offer={null}
      />
    </div>
  );
}
