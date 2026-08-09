import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Customer Login | RailEats", "/login");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
