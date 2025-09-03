"use client";
import { useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const handleLogin = () => {
    // OTP Login logic here
    setIsLoggedIn(true);
    setCustomerName("Amit");
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-black text-white z-50 shadow">
      <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="RailEats" className="h-8 w-8 rounded-full" />
          <span className="font-bold text-lg">
            <span className="text-yellow-400">Rail</span>Eats
          </span>
        </div>

        {/* Login / Profile only */}
        <div>
          {!isLoggedIn ? (
            <button
              onClick={handleLogin}
              className="bg-yellow-400 text-black px-3 py-1 rounded"
            >
              Login
            </button>
          ) : (
            <div className="relative group">
              <button className="font-semibold">{customerName}</button>
              <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow-lg hidden group-hover:block">
                <a href="/profile" className="block px-4 py-2 hover:bg-gray-200">
                  My Profile
                </a>
                <a href="/orders" className="block px-4 py-2 hover:bg-gray-200">
                  My Orders
                </a>
                <a href="/wallet" className="block px-4 py-2 hover:bg-gray-200">
                  Wallet Balance
                </a>
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-200"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
