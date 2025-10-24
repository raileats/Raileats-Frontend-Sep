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

        {/* Force reload logic for back/refresh navigation */}
        <ForceReloadOnBack />

        {/* ===================== GLOBAL CENTER SPINNER ===================== */}
        <div id="global-raileats-spinner" aria-hidden>
          <div className="spinner-overlay">
            <div className="spinner-center">
              {/* Blue rotating ring */}
              <div className="outer-ring" aria-hidden></div>

              {/* Fixed RailEats logo */}
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>
        </div>
        {/* ===================== END SPINNER ===================== */}

        {/* Main content wrapper */}
        <main className="main-content">
          <div className="site-container">{children}</div>
        </main>

        {/* Fixed Bottom Nav */}
        <BottomNav />
      </body>
    </html>
  );
}
