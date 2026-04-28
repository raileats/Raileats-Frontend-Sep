"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../lib/useAuth";

export default function LoginMenu() {
  const { user, logout, loadUser } = useAuth();
  const [open, setOpen] = useState(false);

  /* 🔥 LOAD USER ON START */
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <>
      {!user ? (
        <button
          onClick={() => {
            // 🔥 ONLY ONE LOGIN SYSTEM (GLOBAL MODAL)
            window.dispatchEvent(
              new CustomEvent("raileats:open-login")
            );
          }}
          className="rounded-md bg-white px-5 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
        >
          Login
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
          >
            <span>{user.name || "User"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg">

              <a
                href="/profile"
                className="block px-3 py-2 hover:bg-gray-50"
              >
                My Profile
              </a>

              <a
                href="/orders"
                className="block px-3 py-2 hover:bg-gray-50"
              >
                My Orders
              </a>

              <button
                onClick={() => {
                  // 🔥 LOGOUT CLEAN
                  logout();

                  // 🔥 HARD REDIRECT (important)
                  window.location.replace("/");
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
              >
                Logout
              </button>

            </div>
          )}
        </div>
      )}
    </>
  );
}
