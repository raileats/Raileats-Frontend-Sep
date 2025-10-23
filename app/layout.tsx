// app/layout.tsx
import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
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

        {/* ForceReloadOnBack handles spinner on back/refresh/SPA nav */}
        <ForceReloadOnBack />

        {/* Global fixed spinner (hidden by default) */}
        <div id="global-raileats-spinner" aria-hidden>
          <div className="outer-ring" aria-hidden>
            <div className="inner-logo" aria-hidden>
              <img src="/raileats-logo.png" alt="RailEats" />
            </div>
          </div>
        </div>

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
