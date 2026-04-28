"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { useRouter } from "next/navigation";

export default function LoginMenu() {
  const { user, logout, loadUser } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);

  /* 🔥 LOAD USER ON START */
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <>
      {/* ================= NOT LOGGED IN ================= */}
      {!user ? (
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("raileats:open-login"));
          }}
          className="rounded-md bg-white px-5 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
        >
          Login
        </button>
      ) : (
        <div className="relative">
          
          {/* 🔥 USER NAME BUTTON (CLICKABLE) */}
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-black font-bold hover:bg-gray-100 transition shadow"
          >
            <span>{user.name || "User"}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* 🔽 DROPDOWN */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-2 text-white"
          >
            ⌄
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg z-50">

              <button
                onClick={() => {
                  router.push("/profile");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                My Profile
              </button>

              <button
                onClick={() => {
                  router.push("/orders");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                My Orders
              </button>

              {/* 🔥 FINAL LOGOUT FIX */}
              <button
                onClick={() => {
                  logout();        // clear user + cart
                  setOpen(false);

                  // ✅ NEXT ROUTER REDIRECT (BEST WAY)
                  router.replace("/");

                  // 🔥 EXTRA SAFETY (force refresh)
                  setTimeout(() => {
                    window.location.href = "/";
                  }, 100);
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
