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
    set({ user: u });
    localStorage.setItem("raileats_user", JSON.stringify(u));
  },

  logout: () => {
    set({ user: null });

    localStorage.removeItem("raileats_user");

    window.dispatchEvent(new Event("raileats:logout"));
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
