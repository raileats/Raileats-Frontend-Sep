"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, Home, Menu, User } from "lucide-react";
import PartnerForm from "./PartnerForm";

type ItemProps = {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showPartner, setShowPartner] = useState(false);

  const goTop = useCallback(() => {
    if (pathname !== "/") router.push("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }, [pathname, router]);

  const goOffers = useCallback(() => {
    if (pathname !== "/") {
      router.push("/?goto=offers");
      return;
    }

    const el = document.getElementById("offers");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <>
      <nav className="bottom-nav" aria-label="Primary mobile navigation">
        <ul className="bottom-nav-grid">
          <li>
            <Item active={pathname === "/"} onClick={goTop}>
              <Home className="bottom-nav-icon text-blue-600" />
              <span>Home</span>
            </Item>
          </li>

          <li>
            <Item onClick={goOffers}>
              <Gift className="bottom-nav-icon text-pink-600" />
              <span>Offers</span>
            </Item>
          </li>

          <li>
            <Item onClick={() => setShowPartner(true)}>
              <span className="bottom-logo-pill">
                <Image
                  src="/logo.png"
                  alt="Vendor"
                  width={34}
                  height={34}
                  unoptimized
                />
              </span>
              <span>Vendor</span>
            </Item>
          </li>

          <li>
            <Item
              active={pathname.startsWith("/menu")}
              onClick={() => router.push("/menu")}
            >
              <Menu className="bottom-nav-icon text-green-600" />
              <span>My Menu</span>
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

      {showPartner && <PartnerForm onClose={() => setShowPartner(false)} />}
    </>
  );
}
