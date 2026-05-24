import "./globals.css";
import { Inter } from "next/font/google";

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

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "RailEats | Fresh Food Delivery on Trains",
  description: "Order premium, hygienic, and fresh food directly to your train seat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full scroll-smooth`}
    >
      <body
        className="
          min-h-screen
          bg-slate-50/60
          text-slate-900
          font-sans
          antialiased
          selection:bg-amber-500
          selection:text-white
          touch-pan-y
        "
      >
        <Providers>
          {/* 🔥 LOAD USER */}
          <AuthLoader />

          {/* BACK RELOAD FIX */}
          <ForceReloadOnBack />

          {/* GLOBAL SPINNER */}
          <div id="global-raileats-spinner" aria-hidden className="pointer-events-none transition-all duration-300">
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img
                  src="/raileats-logo.png"
                  alt="RailEats"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* WORLD CLASS FLEX LAYOUT */}
          <div className="flex flex-col min-h-screen isolation-isolate">
            
            {/* FIXED/STICKY NAVBAR CONTAINER */}
            <Navbar />

            {/* MAIN APP CONTENT 
              👉 Added `pt-20` (Padding Top) taaki top navbar ki wajah se content kabhi hide na ho.
              Agar aapka navbar aur bada hai to aap ise `pt-24` bhi kar sakte hain.
            */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
              <div
                className="site-container w-full h-full"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)",
                }}
              >
                {children}
              </div>
            </main>

          </div>

          {/* INTERACTIVE OVERLAYS & MODALS */}
          <CartPopup />
          <LoginModal />
          <FeedbackModal />

          {/* BOTTOM NAVIGATION BAR */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
