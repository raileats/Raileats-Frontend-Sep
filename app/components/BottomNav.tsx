"use client"
import Link from "next/link"

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 shadow-md flex justify-around py-2 md:hidden z-50">
      <Link href="/" className="flex flex-col items-center text-xs">
        <span>🏠</span> Home
      </Link>
      <Link href="/tools" className="flex flex-col items-center text-xs">
        <span>🚆</span> Tools
      </Link>
      <Link href="/offers" className="flex flex-col items-center text-xs">
        <span>🎁</span> Offers
      </Link>
      <Link href="/orders" className="flex flex-col items-center text-xs">
        <span>📦</span> Orders
      </Link>
      <Link href="/menu" className="flex flex-col items-center text-xs">
        <span>📖</span> Menu
      </Link>
    </div>
  )
}
