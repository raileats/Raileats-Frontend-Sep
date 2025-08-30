import { NextResponse } from 'next/server';
import menus from '../data/dummyMenus.json';

export async function GET() {
  return NextResponse.json(menus);
}
