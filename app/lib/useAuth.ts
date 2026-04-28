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
    try {
      localStorage.setItem("raileats_user", JSON.stringify(u));
    } catch {}
    set({ user: u });
  },

  logout: () => {
    try {
      localStorage.removeItem("raileats_user");
      localStorage.removeItem("cart");
    } catch {}

    // 🔥 clear zustand state immediately
    set({ user: null });

    // 🔥 notify पूरे app को
    window.dispatchEvent(new Event("raileats:logout"));
  },

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
