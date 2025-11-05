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
          <Navbar />
          <ForceReloadOnBack />

          {/* GLOBAL CENTER SPINNER (hidden by default) */}
          <div id="global-raileats-spinner" aria-hidden>
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>

          {/* Main content wrapper */}
          <main className="main-content min-h-screen pb-24 md:pb-8">
            <div className="site-container">{children}</div>
          </main>

          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
