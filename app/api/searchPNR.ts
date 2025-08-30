import { NextResponse } from 'next/server';
import data from '../../data/dummyData.json';

export async function GET() {
  return NextResponse.json(data);
}
