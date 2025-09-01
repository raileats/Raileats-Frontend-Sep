"use client";
import Image from "next/image";
import Link from "next/link";


export default function Navbar() {
return (
<nav className="fixed top-0 left-0 w-full bg-black text-white shadow-md z-50 flex items-center justify-between px-6 py-3">
{/* Logo */}
<div className="flex items-center space-x-2">
<Image public="/logo.png" alt="RailEats Logo" width={40} height={40} />
<span className="text-xl font-bold">RailEats</span>
</div>


{/* Links */}
<div className="hidden md:flex space-x-6">
<Link href="/">Home</Link>
<Link href="/train-tools">Train Tools</Link>
<Link href="/offers">Offers</Link>
<Link href="/orders">Orders</Link>
<Link href="/menu">Menu</Link>
</div>
</nav>
);
}
