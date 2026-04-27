"use client";

import { create } from "zustand";

/* ================= USER TYPE ================= */
type User = {
  mobile: string;
  name?: string;
  email?: string;
};

/* ================= STORE TYPE ================= */
type AuthState = {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
  loadUser: () => void;
};

/* ================= STORE ================= */
export const useAuth = create<AuthState>((set) => ({
  user: null,

  setUser: (u) => {
    localStorage.setItem("raileats_user", JSON.stringify(u));
    set({ user: u });
  },

  logout: () => {
    localStorage.removeItem("raileats_user");
    set({ user: null });
  },

  loadUser: () => {
    try {
      const saved = localStorage.getItem("raileats_user");
      if (saved) {
        set({ user: JSON.parse(saved) });
      }
    } catch (e) {
      console.log("Auth load error", e);
    }
  },
}));
