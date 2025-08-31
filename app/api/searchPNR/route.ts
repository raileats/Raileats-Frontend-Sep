import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${baseUrl}/data/dummyData.json`);
  const data = await res.json();
  return NextResponse.json(data);
}
