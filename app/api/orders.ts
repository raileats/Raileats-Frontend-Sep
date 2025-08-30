import { NextResponse } from 'next/server';
import orders from '../../data/dummyOrders.json';

export async function GET() {
  return NextResponse.json(orders);
}
