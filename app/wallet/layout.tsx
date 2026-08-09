import { privateRouteMetadata } from "../lib/privateRouteMetadata";

export const metadata = privateRouteMetadata("Customer Wallet | RailEats", "/wallet");

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
