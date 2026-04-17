"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MenuPage() {
  const router = useRouter();

  useEffect(() => {
    // 🚫 Direct redirect — menu page kabhi use nahi hoga
    router.replace("/");
  }, [router]);

  return (
    <div className="p-10 text-center">
      Redirecting...
    </div>
  );
}
