import RestroMenuClient from "./RestroMenuClient";

type MenuItem = {
  id: number;
  restro_code: string | number;
  item_name: string;
  item_category?: string | null;
  menu_type?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  base_price?: number | null;
  status?: string | null;
};

export default async function Page({
  params,
  searchParams,
}: {
  params: { slug: string; restroSlug: string };
  searchParams: { [key: string]: string };
}) {
  // ✅ HEADER DATA
  const header = {
    stationCode: params.slug?.split("-")[0] || "",
    restroCode: params.restroSlug?.split("-")[0] || "",
    outletName:
      params.restroSlug?.split("-").slice(1).join(" ") || "Restaurant",
    stationName: searchParams.stationName || "",
  };

  // ✅ ITEMS (TEMP EMPTY — API baad me connect karenge)
  const items: MenuItem[] = [];

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      {/* ❌ offer hata diya */}
      <RestroMenuClient header={header} items={items} />
    </main>
  );
}
