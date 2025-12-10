// app/api/train-restros/route.ts
import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const train = url.searchParams.get("train"); // trainNumber
  const date = url.searchParams.get("date");   // YYYY-MM-DD
  const boarding = url.searchParams.get("boarding"); // station code

  if (!train || !date || !boarding) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    // 1) fetch route
    const { data: stops, error: stopsErr } = await serviceClient
      .from("train_stops")
      .select("station_code,station_name,state,stop_sequence,arrival_time")
      .eq("train_number", train)
      .order("stop_sequence", { ascending: true });

    if (stopsErr) throw stopsErr;

    if (!stops || stops.length === 0) {
      return NextResponse.json({ route: [], stations: [] });
    }

    // find boarding index
    const boardingIndex = stops.findIndex(s => s.station_code === boarding);
    const routeFromBoarding = boardingIndex >= 0 ? stops.slice(boardingIndex) : stops;

    // limit next N stops
    const nextN = 12;
    const candidateStops = routeFromBoarding.slice(0, nextN);

    // station codes
    const stationCodes = candidateStops.map(s => s.station_code);

    // 2) fetch vendors
    const { data: vendors, error: vendorsErr } = await serviceClient
      .from("vendors")
      .select("id,name,station_code,short_description,logo_url,menu_link")
      .in("station_code", stationCodes)
      .eq("active", true); // adjust if date logic needed

    if (vendorsErr) throw vendorsErr;

    // group vendors by station
    const grouped: Record<string, any[]> = {};
    vendors.forEach(v => {
      if (!grouped[v.station_code]) grouped[v.station_code] = [];
      grouped[v.station_code].push(v);
    });

    const stationsWithVendors = candidateStops
      .map(s => ({
        ...s,
        vendors: grouped[s.station_code] || []
      }))
      .filter(s => s.vendors.length > 0);

    // 3) fetch train meta
    const { data: trainMeta } = await serviceClient
      .from("trains")
      .select("train_number,train_name")
      .eq("train_number", train)
      .single();

    return NextResponse.json({
      train: trainMeta || { train_number: train, train_name: "" },
      stations: stationsWithVendors
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
