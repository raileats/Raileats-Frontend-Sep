import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Customer Profile | RailEats", "/profile");

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
