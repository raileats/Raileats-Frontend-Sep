"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Home, TrainFront, User } from "lucide-react";

type ItemProps = {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const goTop = useCallback(() => {
    if (pathname !== "/") router.push("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }, [pathname, router]);

  const Item = ({ active, children, onClick, href }: ItemProps) => {
    const content = (
      <div className={`bottom-nav-item ${active ? "active" : ""}`}>
        {children}
      </div>
    );

    return href ? (
      <Link href={href} className="bottom-nav-hit">
        {content}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className="bottom-nav-hit">
        {content}
      </button>
    );
  };

  return (
    <nav className="bottom-nav" aria-label="Primary mobile navigation">
      <ul className="bottom-nav-grid">
        <li>
          <Item active={pathname === "/"} onClick={goTop}>
            <Home className="bottom-nav-icon text-blue-600" />
            <span>Home</span>
          </Item>
        </li>

        <li>
          <Item active={pathname.startsWith("/pnr-status")} href="/pnr-status">
            <ClipboardList className="bottom-nav-icon text-pink-600" />
            <span>PNR Status</span>
          </Item>
        </li>

        <li>
          <Item
            active={pathname.startsWith("/live-train-status")}
            href="/live-train-status"
          >
            <TrainFront className="bottom-nav-icon text-amber-600" />
            <span>Train Status</span>
          </Item>
        </li>

        <li>
          <Item
            active={pathname.startsWith("/profile")}
            onClick={() => router.push("/profile")}
          >
            <User className="bottom-nav-icon text-purple-600" />
            <span>Profile</span>
          </Item>
        </li>
      </ul>
    </nav>
  );
}
