import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Order Confirmation | RailEats", "/order-success");

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
