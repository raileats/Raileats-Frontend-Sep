import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Your Orders | RailEats", "/orders");

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
