"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Gift, Menu, User } from "lucide-react";

type Tab = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs: Tab[] = [
    {
      href: "/",
      label: "Home",
      icon: <Home className="h-6 w-6 text-blue-600" />,
    },
    {
      label: "Vendor",
      icon: (
        <img
          src="/logo.png"
          alt="Vendor"
          className="h-6 w-6"
        />
      ),
      onClick: () => router.push("/vendor"),
    },
    {
      href: "/offers",
      label: "Offers",
      icon: <Gift className="h-6 w-6 text-pink-600" />,
    },
    {
      href: "/menu",
      label: "My Menu",
      icon: <Menu className="h-6 w-6 text-green-600" />,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-6 w-6 text-purple-600" />,
    },
  ];

  const isActive = (href?: string, label?: string) => {
    if (!href && label === "Vendor") return pathname.startsWith("/vendor");
    if (href === "/") return pathname === "/";
    return href ? pathname.startsWith(href) : false;
  };

  return (
    <nav className="bottom-nav border-t">
      <ul className="mx-auto grid max-w-screen-md grid-cols-5">
        {tabs.map((t, i) => {
          const active = isActive(t.href, t.label);
          const base =
            "flex h-[56px] flex-col items-center justify-center gap-0.5 text-xs transition-colors";
          const color = active ? "text-yellow-600" : "text-gray-500";

          const inner = (
            <>
              <div className={color}>{t.icon}</div>
              <span className={color}>{t.label}</span>
            </>
          );

          return (
            <li key={i} className="w-full">
              {t.href ? (
                <Link href={t.href} className={base}>
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={t.onClick}
                  className={`${base} w-full`}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
