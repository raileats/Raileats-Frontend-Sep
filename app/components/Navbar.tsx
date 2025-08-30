'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) setLoggedIn(true)
  }, [])

  return (
    <nav className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="RailEats Logo" className="w-14 h-14"/>
          <span className="font-bold text-xl">Raileats.in</span>
        </div>
        <div className="flex space-x-6">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          {loggedIn ? (
            <Link href="/profile">My Profile</Link>
          ) : (
            <button onClick={() => setOpen(true)}>Login</button>
          )}
        </div>
      </div>
      {open && <LoginModal setOpen={setOpen} setLoggedIn={setLoggedIn} />}
    </nav>
  )
}

function LoginModal({ setOpen, setLoggedIn }) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')

  const handleLogin = () => {
    if (otp === '1234') {
      const user = { name, mobile, email: '', wallet: 500 }
      localStorage.setItem('user', JSON.stringify(user))
      setLoggedIn(true)
      setOpen(false)
    } else {
      alert('Invalid OTP (use 1234)')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white text-black p-6 rounded shadow w-80">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <input type="text" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="w-full mb-2 p-2 border"/>
        <input type="text" placeholder="Mobile Number" value={mobile} onChange={e=>setMobile(e.target.value)} className="w-full mb-2 p-2 border"/>
        <input type="text" placeholder="OTP (1234)" value={otp} onChange={e=>setOtp(e.target.value)} className="w-full mb-2 p-2 border"/>
        <button onClick={handleLogin} className="bg-black text-white px-4 py-2 w-full">Login</button>
        <button onClick={()=>setOpen(false)} className="mt-2 text-sm">Cancel</button>
      </div>
    </div>
  )
}
