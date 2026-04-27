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

  setUser: (u) => {
    localStorage.setItem("raileats_user", JSON.stringify(u));
    set({ user: u });
  },

  logout: () => {
    localStorage.removeItem("raileats_user");

    // 🔥 IMPORTANT: cart clear trigger
    window.dispatchEvent(new Event("raileats:logout"));

    set({ user: null });
  },

  loadUser: () => {
    const saved = localStorage.getItem("raileats_user");
    if (saved) {
      try {
        set({ user: JSON.parse(saved) });
      } catch {}
    }
  },
}));
