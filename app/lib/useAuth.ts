"use client";

import { create } from "zustand";

type User = {
  mobile: string;
  name?: string;
  email?: string;
};

type AuthState = {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
  loadUser: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,

  /* 🔥 SET USER (LOGIN COMPLETE HERE) */
  setUser: (u) => {
    set({ user: u });

    try {
      localStorage.setItem("raileats_user", JSON.stringify(u));
    } catch {}

    // 🔥 ✅ FEEDBACK AUTO OPEN AFTER LOGIN
    try {
      const action = localStorage.getItem("afterLoginAction");

      if (action === "feedback") {
        window.dispatchEvent(new CustomEvent("raileats:open-feedback"));
        localStorage.removeItem("afterLoginAction");
      }
    } catch {}
  },

  /* 🔥 LOGOUT (FULL RESET) */
  logout: () => {
    try {
      localStorage.removeItem("raileats_user");
    } catch {}

    set({ user: null });

    window.dispatchEvent(new Event("raileats:logout"));
  },

  /* 🔥 LOAD USER (SAFE) */
  loadUser: () => {
    try {
      const saved = localStorage.getItem("raileats_user");

      if (saved) {
        set({ user: JSON.parse(saved) });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    }
  },
}));
