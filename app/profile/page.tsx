'use client'
import { useState, useEffect } from 'react'

export default function Profile() {
  const [tab, setTab] = useState('profile')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const saveProfile = () => {
    localStorage.setItem('user', JSON.stringify(user))
    alert('Profile updated')
  }

  if (!user) return <div className="p-6">Please login first</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex space-x-4 mb-4">
        <button onClick={()=>setTab('profile')} className={tab==='profile'?'font-bold':''}>Profile</button>
        <button onClick={()=>setTab('wallet')} className={tab==='wallet'?'font-bold':''}>My Wallet</button>
        <button onClick={()=>setTab('orders')} className={tab==='orders'?'font-bold':''}>My Orders</button>
      </div>

      {tab==='profile' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Profile Info</h2>
          <input type="text" placeholder="Name" value={user.name} onChange={e=>setUser({...user, name:e.target.value})} className="w-full mb-2 p-2 border"/>
          <input type="email" placeholder="Email" value={user.email} onChange={e=>setUser({...user, email:e.target.value})} className="w-full mb-2 p-2 border"/>
          <button onClick={saveProfile} className="bg-black text-white px-4 py-2">Save</button>
        </div>
      )}

      {tab==='wallet' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Wallet Balance</h2>
          <p className="text-lg">₹{user.wallet}</p>
        </div>
      )}

      {tab==='orders' && (
        <div>
          <h2 className="text-xl font-bold mb-2">My Orders</h2>
          <table className="w-full border">
            <thead><tr><th className="border px-2">Order ID</th><th className="border px-2">Date</th><th className="border px-2">Amount</th><th className="border px-2">Status</th></tr></thead>
            <tbody>
              <tr><td className="border px-2">101</td><td className="border px-2">2025-08-01</td><td className="border px-2">₹250</td><td className="border px-2">Delivered</td></tr>
              <tr><td className="border px-2">102</td><td className="border px-2">2025-08-10</td><td className="border px-2">₹400</td><td className="border px-2">Cancelled</td></tr>
              <tr><td className="border px-2">103</td><td className="border px-2">2025-08-20</td><td className="border px-2">₹180</td><td className="border px-2">On the Way</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
