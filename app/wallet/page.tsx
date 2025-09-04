"use client";
import { useEffect, useState } from "react";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // demo: local storage me rakh lo; API add kar sakte ho
    const raw = localStorage.getItem("raileats_wallet");
    setBalance(raw ? Number(raw) : 0);
  }, []);

  const addMoney = (amt: number) => {
    const next = balance + amt;
    setBalance(next);
    localStorage.setItem("raileats_wallet", String(next));
  };

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4">
      <h1 className="text-xl font-semibold mb-3">My Wallet</h1>
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <p className="text-lg">Balance: <span className="font-semibold text-yellow-700">₹{balance}</span></p>
        <div className="flex gap-2">
          {[100, 200, 500].map(v=>(
            <button key={v} onClick={()=>addMoney(v)} className="rounded-md border px-3 py-2 hover:bg-gray-50">
              Add ₹{v}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">* Demo only</p>
      </div>
    </main>
  );
}
