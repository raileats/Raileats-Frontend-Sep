import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Checkout | RailEats", "/checkout");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
