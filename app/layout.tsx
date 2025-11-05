// app/layout.tsx
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import Providers from "./components/Providers";

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
        <Providers>
          {/* Fixed top Navbar */}
          <Navbar />

          {/* Force reload / spinner behaviour on back / refresh */}
          <ForceReloadOnBack />

          {/* GLOBAL CENTER SPINNER */}
          <div id="global-raileats-spinner" aria-hidden>
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>

          {/* Main content wrapper */}
          <main className="main-content">
            {/* ✅ Mobile font 10% smaller, Desktop normal */}
            <div className="site-container text-[90%] sm:text-[100%]">
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
