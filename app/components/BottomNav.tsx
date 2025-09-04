"use client";
import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Gift, Menu, User } from "lucide-react";
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
    } else {
      const el = document.getElementById("offers");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pathname, router]);

  const goMenu = () => router.push("/menu");
  const goProfile = () => router.push("/profile");

  const Item = ({ active, children, onClick, href }: ItemProps) => {
    const base =
      "flex h-[56px] min-w-[72px] flex-col items-center justify-center gap-1 text-[11px] transition-colors";
    const color = active ? "text-yellow-600" : "text-gray-600";
    const content = <div className={`flex flex-col items-center ${color}`}>{children}</div>;

    return href ? (
      <Link href={href} className={base}>
        {content}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={`${base} w-full`}>
        {content}
      </button>
    );
  };

  return (
    <div>
      <nav className="bottom-nav border-t">
        {/* 5 columns — Vendor tab is the real middle (3rd) */}
        <ul className="mx-auto grid max-w-screen-md grid-cols-5">
          <li className="w-full">
            <Item active={pathname === "/"} onClick={goTop}>
              <Home className="h-6 w-6 text-blue-600" />
              <span>Home</span>
            </Item>
          </li>

          <li className="w-full">
            <Item onClick={goOffers}>
              <Gift className="h-6 w-6 text-pink-600" />
              <span>Offers</span>
            </Item>
          </li>

          {/* CENTER = Vendor (bubble logo, opens modal) */}
          <li className="w-full">
            <Item onClick={() => setShowPartner(true)}>
              <img
                src="/logo.png"
                alt="Vendor"
                className="h-7 w-7 rounded-full animate-bubbleGlow"
              />
              <span>Vendor</span>
            </Item>
          </li>

          <li className="w-full">
            <Item onClick={goMenu} active={pathname.startsWith("/menu")}>
              <Menu className="h-6 w-6 text-green-600" />
              <span>My Menu</span>
            </Item>
          </li>

          <li className="w-full">
            <Item onClick={goProfile} active={pathname.startsWith("/profile")}>
              <User className="h-6 w-6 text-purple-600" />
              <span>Profile</span>
            </Item>
          </li>
        </ul>
      </nav>

      {showPartner && <PartnerForm onClose={() => setShowPartner(false)} />}
    </div>
  );
}
