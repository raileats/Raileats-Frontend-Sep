"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Train, Gift, Menu } from "lucide-react";

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
    { href: "/",        label: "Home",   icon: <Home className="h-6 w-6" /> },
    { href: "/tools",   label: "Tools",  icon: <Train className="h-6 w-6" /> },
    // Center VENDOR button — same size as others
    { label: "Vendor",  icon: <img src="/logo.png" alt="Vendor" className="h-6 w-6" />, onClick: () => router.push("/vendor") },
    { href: "/offers",  label: "Offers", icon: <Gift className="h-6 w-6" /> },
    { href: "/menu",    label: "My Menu",icon: <Menu className="h-6 w-6" /> },
  ];

  // Active color mapping (colorful tabs)
  const colorFor = (label: string) =>
    ({
      Home: "text-blue-600",
      Tools: "text-green-600",
      Vendor: "text-yellow-600",
      Offers: "text-pink-600",
      "My Menu": "text-purple-600",
    }[label] || "text-gray-600");

  const isActive = (href?: string, label?: string) => {
    if (!href) return pathname.startsWith("/vendor"); // for Vendor if routed
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="safe-bottom" />
  ), (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t shadow-sm">
      <ul className="mx-auto grid max-w-screen-md grid-cols-5">
        {tabs.map((t, i) => {
          const active = isActive(t.href, t.label);
          const base =
            "flex h-14 flex-col items-center justify-center gap-1 text-xs transition-colors";
          const color = active ? colorFor(t.label) : "text-gray-500";
          const hover = "hover:text-yellow-700";

          const inner = (
            <>
              <div className={`${color} ${active ? "scale-105" : ""}`}>
                {t.icon}
              </div>
              <span className={`${color}`}>{t.label}</span>
            </>
          );

          return (
            <li key={i} className="w-full">
              {t.href ? (
                <Link href={t.href} className={`${base} ${hover}`}>
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={t.onClick}
                  className={`${base} ${hover} w-full`}
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
