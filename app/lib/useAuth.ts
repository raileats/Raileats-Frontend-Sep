import { create } from "zustand";

/* ================= USER AUTH STORE ================= */
type User = {
  mobile: string;
  name?: string;
  email?: string;
};

type AuthState = {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
};

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
}));

/* ================= AUTO LOAD FROM LOCAL ================= */
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("raileats_user");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      useAuth.setState({ user: parsed });
    } catch {}
  }
}