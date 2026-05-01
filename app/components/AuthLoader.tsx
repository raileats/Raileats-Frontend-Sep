"use client";

import { useEffect } from "react";
import { useAuth } from "../lib/useAuth";

export default function AuthLoader() {
  const loadUser = useAuth((s) => s.loadUser);

  useEffect(() => {
    // 🔥 initial load
    loadUser();

    // 🔥 listen for logout/login changes
    const handleStorage = () => {
      loadUser();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("raileats:logout", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("raileats:logout", handleStorage);
    };
  }, []);

  return null;
}
