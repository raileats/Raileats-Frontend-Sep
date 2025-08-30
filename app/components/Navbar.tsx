'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="RailEats Logo" className="w-10 h-10"/>
          <span className="font-bold text-xl">Raileats.in</span>
        </div>
        <div className="hidden md:flex space-x-6">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <a href="#">Track Order</a>
          <a href="#">Group Order</a>
          <a href="#">Jain Food</a>
          <a href="#">Rail Tools</a>
          <a href="#">Login</a>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-black px-4 py-2 space-y-2">
          <Link href="/" onClick={()=>setOpen(false)}>Home</Link><br/>
          <Link href="/menu" onClick={()=>setOpen(false)}>Menu</Link><br/>
          <Link href="/about" onClick={()=>setOpen(false)}>About</Link><br/>
          <Link href="/contact" onClick={()=>setOpen(false)}>Contact</Link><br/>
          <a href="#">Track Order</a><br/>
          <a href="#">Group Order</a><br/>
          <a href="#">Jain Food</a><br/>
          <a href="#">Rail Tools</a><br/>
          <a href="#">Login</a><br/>
        </div>
      )}
    </nav>
  )
}
