import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import Providers from "./components/Providers"; // ⭐ add

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
        {/* Wrap the whole interactive app in CartProvider */}
        <Providers>
          {/* Fixed top Navbar */}
          <Navbar />

          {/* Force reload / spinner behaviour on back / refresh */}
          <ForceReloadOnBack />

          {/* GLOBAL CENTER SPINNER (hidden by default) */}
          <div id="global-raileats-spinner" aria-hidden>
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>

          {/* Main content wrapper
              - add bottom padding so mobile bottom nav doesn't overlap content (safe area)
              - this is intentionally responsive: on desktop no visible change
          */}
          <main className="main-content">
            <div
              className="site-container"
              style={{
                /* extra bottom space for mobile nav overlap (keeps desktop unchanged) */
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
              }}
            >
              {children}
            </div>
          </main>

          {/* Fixed Bottom Nav */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
