import "./globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "RailEats",
  description: "Fresh Food on Trains | RailEats",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Fixed Navbar */}
        <Navbar />

        {/* Main content */}
        <main className="main-content">{children}</main>

        {/* Fixed Bottom Nav */}
        <BottomNav />
      </body>
    </html>
  );
}
