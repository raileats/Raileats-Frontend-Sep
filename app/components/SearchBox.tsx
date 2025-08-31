import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-yellow-400">
        {/* Top Navbar (Desktop) */}
        <Navbar />
        
        <div className="pt-16 pb-16">{children}</div> {/* space for navbars */}

        {/* Bottom Navbar (Mobile) */}
        <BottomNav />
      </body>
    </html>
  );
}
