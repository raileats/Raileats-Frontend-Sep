import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Journey Search | RailEats", "/search");

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
