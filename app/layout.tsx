import "./globals.css";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import Providers from "./components/Providers";

// 🔥 EXISTING
import CartPopup from "./components/CartPopup";

// ✅ NEW (LOGIN MODAL)
import LoginModal from "./components/LoginModal";

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
          {/* Navbar */}
          <Navbar />

          {/* Back reload fix */}
          <ForceReloadOnBack />

          {/* Spinner */}
          <div id="global-raileats-spinner" aria-hidden>
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <main className="main-content">
            <div
              className="site-container"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
              }}
            >
              {children}
            </div>
          </main>

          {/* 🔥 CART POPUP */}
          <CartPopup />

          {/* 🔥 LOGIN MODAL (NEW ADD) */}
          <LoginModal />

          {/* Bottom Nav */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}