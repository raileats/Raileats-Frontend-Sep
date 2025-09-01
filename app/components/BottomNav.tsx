"use client";
import Link from "next/link";
import Image from "next/image";


export default function BottomNav() {
return (
<div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 shadow-inner flex justify-around items-center h-16 md:hidden">
<Link href="/" className="flex flex-col items-center text-xs">
<span>Home</span>
</Link>
<Link href="/train-tools" className="flex flex-col items-center text-xs">
<span>Train Tools</span>
</Link>


{/* Floating logo in center */}
<div className="relative -top-6 bg-yellow-400 rounded-full p-3 shadow-lg border-4 border-white">
<Image src="/logo.png" alt="RailEats Logo" width={40} height={40} />
</div>


<Link href="/offers" className="flex flex-col items-center text-xs">
<span>Offers</span>
</Link>
<Link href="/menu" className="flex flex-col items-center text-xs">
<span>Menu</span>
</Link>
</div>
);
}
