import { NextResponse } from "next/server";
import { serviceClient } from "../../lib/supabaseServer";

function digitsOnly(v: string) {
  return String(v || "").replace(/\D/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();

  if (!search) {
    return NextResponse.json([]);
  }

  const supa = serviceClient;
  const digits = digitsOnly(search);

  const orParts = [`trainName.ilike.%${search}%`];

  if (digits) {
    orParts.push(`trainNumber.ilike.%${digits}%`);
    if (digits.length < 5) {
      orParts.push(`trainNumber.ilike.%${digits.padStart(5, "0")}%`);
    }
  }

  const { data, error } = await supa
    .from("TrainRoute")
    .select("trainNumber, trainName")
    .or(orParts.join(","))
    .limit(50);

  if (error) {
    console.error(error);
    return NextResponse.json([]);
  }

  const seen = new Set();
  const result = [];

  for (const row of data || []) {
    const key = `${row.trainNumber}-${row.trainName}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        train_no: row.trainNumber,
        train_name: row.trainName,
      });
    }
  }

  return NextResponse.json(result);
}
