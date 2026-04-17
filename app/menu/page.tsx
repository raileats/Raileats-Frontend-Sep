"use client";

import { useSearchParams } from "next/navigation";
import RestroMenuClient from "../components/RestroMenuClient";

export default function MenuPage() {
  const searchParams = useSearchParams();

  const restro = searchParams.get("restro");
  const arrival = searchParams.get("arrival");
  const stationName = searchParams.get("stationName");

  console.log("MENU PARAMS:", {
    restro,
    arrival,
    stationName,
  });

  if (!restro) {
    return <div className="p-4">Missing restro</div>;
  }

  return (
    <div className="p-4">
      <RestroMenuClient
        header={{
          restroCode: restro,
          stationCode: "",
          outletName: "Loading...",
        }}
        items={[]} // अभी dummy
      />
    </div>
  );
}
