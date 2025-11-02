// app/orders/checkout/page.tsx
import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Checkout | RailEats",
  description:
    "Review your cart and enter delivery details to place your RailEats order.",
};

export default function Page({
  searchParams,
}: {
  searchParams: { restro?: string };
}) {
  const restro = searchParams?.restro ?? "";
  return <CheckoutClient restroCode={restro} />;
}
