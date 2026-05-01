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

  /* 🔥 SET USER */
  setUser: (u) => {
    set({ user: u });
    try {
      localStorage.setItem("raileats_user", JSON.stringify(u));
    } catch {}
  },

  /* 🔥 LOGOUT (FULL RESET) */
  logout: () => {
    try {
      localStorage.removeItem("raileats_user");
    } catch {}

    set({ user: null });

    // 🔥 cart + other cleanup
    window.dispatchEvent(new Event("raileats:logout"));
  },

  /* 🔥 LOAD USER (SAFE) */
  loadUser: () => {
    try {
      const saved = localStorage.getItem("raileats_user");

      if (saved) {
        set({ user: JSON.parse(saved) });
      } else {
        set({ user: null }); // 🔥 IMPORTANT
      }
    } catch {
      set({ user: null });
    }
  },
}));
