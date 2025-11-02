// app/layout.tsx
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// ✅ NEW: mini cart bubble
import CartWidget from "./components/CartWidget";

export const metadata = {
  title: "RailEats",
  description: "Fresh Food on Trains | RailEats",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Fixed top Navbar */}
        <Navbar />

        {/* Force reload / spinner behaviour on back / refresh */}
        <ForceReloadOnBack />

        {/* GLOBAL CENTER SPINNER (hidden by default) */}
        {/* toggle with: document.getElementById('global-raileats-spinner')?.classList.add('show') */}
        <div id="global-raileats-spinner" aria-hidden>
          <div className="outer-ring" aria-hidden>
            <div className="inner-logo" aria-hidden>
              <img src="/raileats-logo.png" alt="RailEats" />
            </div>
          </div>
        </div>

        {/* Main content wrapper */}
        <main className="main-content">
          <div className="site-container">{children}</div>
        </main>

        {/* ✅ Mini Cart bubble (floats, high z-index so it stays above BottomNav) */}
        <CartWidget />

        {/* Fixed Bottom Nav */}
        <BottomNav />
      </body>
    </html>
  );
}
