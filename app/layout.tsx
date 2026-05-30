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
    <html lang="en" className={`${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-screen bg-[#eef3f8] text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <Providers>
          <AuthLoader />
          <ForceReloadOnBack />

          <div
            id="global-raileats-spinner"
            aria-hidden
            className="pointer-events-none transition-all duration-300"
          >
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <img src="/raileats-logo.png" alt="RailEats" />
              </div>
            </div>
          </div>

          <Navbar />

          <main className="customer-app-main">
            <div className="site-container">{children}</div>
          </main>

          <CartPopup />
          <LoginModal />
          <FeedbackModal />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
