"use client";

import { useEffect } from "react";
import { useAuth } from "../lib/useAuth";

export default function AuthLoader() {
  const loadUser = useAuth((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, []);

  return null;
}
