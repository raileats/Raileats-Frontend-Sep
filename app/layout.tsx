import "./globals.css";

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import Providers from "./components/Providers";

import CartPopup from "./components/CartPopup";
import LoginModal from "./components/LoginModal";
import FeedbackModal from "./components/FeedbackModal";
import AuthLoader from "./components/AuthLoader";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export const metadata = {
  title: "RailEats",
  description: "Fresh Food on Trains | RailEats",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <html
      lang="en"
      className="h-full overflow-hidden"
    >

      <body
        className="
          h-full
          overflow-hidden
          bg-white
          overscroll-none
          touch-pan-y
        "
      >

        <Providers>

          {/* 🔥 LOAD USER */}
          <AuthLoader />

          {/* NAVBAR */}
          <Navbar />

          {/* BACK RELOAD FIX */}
          <ForceReloadOnBack />

          {/* SPINNER */}
          <div id="global-raileats-spinner" aria-hidden>

            <div className="outer-ring" aria-hidden>

              <div className="inner-logo" aria-hidden>
                <img
                  src="/raileats-logo.png"
                  alt="RailEats"
                />
              </div>

            </div>

          </div>

          {/* APP SCROLL AREA */}

          <div
            className="
              h-screen
              overflow-y-auto
              overscroll-none
              scrollbar-hide
            "
          >

            {/* MAIN */}

            <main className="main-content h-full">

              <div
                className="site-container"
                style={{
                  paddingBottom:
                    "calc(env(safe-area-inset-bottom, 0px) + 90px)",
                }}
              >

                {children}

              </div>

            </main>

          </div>

          {/* CART */}
          <CartPopup />

          {/* LOGIN */}
          <LoginModal />

          {/* FEEDBACK */}
          <FeedbackModal />

          {/* BOTTOM NAV */}
          <BottomNav />

        </Providers>

      </body>

    </html>

  );
}
