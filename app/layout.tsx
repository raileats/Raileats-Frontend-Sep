// app/layout.tsx
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "RailEats",
  description: "Order Food on Trains Online with RailEats",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto bg-white min-h-screen shadow-sm">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
