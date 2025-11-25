const { searchParams } = new URL(req.url);
const stationCode = searchParams.get("stationCode")?.toUpperCase();
const q = searchParams.get("query") ?? "";
// ...
const { data, error } = await supa
  .from("TrainRoute")
  .select("trainNumber, trainName, StationCode, StationName, Arrives, Day")
  .eq("StationCode", stationCode)
  .or(`trainNumber::text.ilike.%${q}%,trainName.ilike.%${q}%`)
  .order("trainNumber");
