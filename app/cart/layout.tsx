import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Your Cart | RailEats", "/cart");

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
