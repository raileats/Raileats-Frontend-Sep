import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public/data/dummyOrders.json');
  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(jsonData);
  return NextResponse.json(data);
}
