import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between bg-black px-6 py-3">
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/logo.png" alt="RailEats" width={60} height={60} /> {/* बड़ा लोगो */}
        <span className="text-yellow-400 font-bold text-2xl">Raileats.in</span>
      </Link>
      <div className="space-x-6 text-white">
        <Link href="/">Home</Link>
        <Link href="/menu">Menu</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/track">Track Order</Link>
        <Link href="/group">Group Order</Link>
        <Link href="/jain">Jain Food</Link>
        <Link href="/tools">Rail Tools</Link>
        <Link href="/login">Login</Link>
      </div>
    </nav>
  );
}
