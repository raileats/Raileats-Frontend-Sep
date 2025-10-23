// app/layout.tsx
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

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

        {/* Main content wrapper: centered & constrained width for desktop */}
        <main className="main-content">
          <div className="site-container">{children}</div>
        </main>

        {/* Fixed Bottom Nav */}
        <BottomNav />
      </body>
    </html>
  );
}
