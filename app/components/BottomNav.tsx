"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Gift, Menu, User } from "lucide-react";
import { useCallback } from "react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const goTop = useCallback(() => {
    if (pathname !== "/") router.push("/");
    // little delay if route changes
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }, [pathname, router]);

  const goOffers = useCallback(() => {
    if (pathname !== "/") {
      router.push("/?goto=offers");
    } else {
      const el = document.getElementById("offers");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pathname, router]);

  const goVendor = () => router.push("/vendor");
  const goMenu = () => router.push("/menu");
  const goProfile = () => router.push("/menu#profile");

  const Item = ({
    active,
    children,
    onClick,
    href,
  }: {
    active?: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
  }) => {
    const base =
      "flex h-[56px] min-w-[64px] flex-col items-center justify-center gap-0.5 text-[11px] transition-colors";
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
    <nav className="bottom-nav border-t">
      <ul className="mx-auto grid max-w-screen-md grid-cols-5">
        <li className="w-full">
          <Item active={pathname === "/"} onClick={goTop}>
            <Home className="h-6 w-6 text-blue-600" />
            <span>Home</span>
          </Item>
        </li>

        <li className="w-full">
          <Item active={pathname.startsWith("/vendor")} onClick={goVendor}>
            <img src="/logo.png" alt="Vendor" className="h-6 w-6" />
            <span>Vendor</span>
          </Item>
        </li>

        <li className="w-full">
          <Item onClick={goOffers} active={false}>
            <Gift className="h-6 w-6 text-pink-600" />
            <span>Offers</span>
          </Item>
        </li>

        <li className="w-full">
          <Item onClick={goMenu} active={pathname.startsWith("/menu")}>
            <Menu className="h-6 w-6 text-green-600" />
            <span>My Menu</span>
          </Item>
        </li>

        <li className="w-full">
          <Item onClick={goProfile} active={pathname === "/menu#profile"}>
            <User className="h-6 w-6 text-purple-600" />
            <span>Profile</span>
          </Item>
        </li>
      </ul>
    </nav>
  );
}
