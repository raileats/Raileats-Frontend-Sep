// 🔴 IMPORTANT: force dynamic (Vercel build fix)
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/* ================= IST HELPERS ================= */

function nowIST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

function todayIST(): string {
  return nowIST().toISOString().slice(0, 
