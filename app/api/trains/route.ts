import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

function digitsOnly(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function rankTrain(trainNo: string, searchDigits: string) {
  if (!searchDigits) return 99;

  if (trainNo === searchDigits) return 1;
  if (trainNo.startsWith(searchDigits)) return 2;
  if (trainNo.includes(searchDigits)) return 3;
  return 99;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  if (!search) return NextResponse.json([]);

  const supa = serviceClient;
  const digits = digitsOnly(search);

  const orParts = [`trainName.ilike.%${search}%`];

  if (digits) {
    orParts.push(`trainNumber.ilike.${digits}%`);
    orParts.push(`trainNumber.ilike.%${digits}%`);
  }

  const { data, error } = await supa
    .from("TrainRoute")
    .select("trainNumber, trainName")
    .or(orParts.join(","))
    .limit(300);

  if (error) {
    console.error(error);
    return NextResponse.json([]);
  }

  const seen = new Map<string, any>();

  for (const row of data || []) {
    const trainNo = String(row.trainNumber || "");
    const key = `${trainNo}-${row.trainName}`;
    if (!seen.has(key)) {
      seen.set(key, {
        train_no: trainNo,
        train_name: row.trainName,
        _rank: rankTrain(trainNo, digits),
      });
    }
  }

  const result = Array.from(seen.values())
    .sort((a, b) => {
      if (a._rank !== b._rank) return a._rank - b._rank;
      return String(a.train_no).localeCompare(String(b.train_no));
    })
    .slice(0, 20)
    .map(({ _rank, ...x }) => x);

  return NextResponse.json(result);
}
