import "./globals.css";
import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata: Metadata = {
  title: "RailEats - Fresh Food on Trains",
  description: "Order hygienic and fresh food in trains with RailEats.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {/* Top Navbar */}
        <Navbar />

        {/* Main Content */}
        <main className="min-h-screen">{children}</main>

        {/* Bottom Navbar */}
        <BottomNav />
      </body>
    </html>
  );
}
