import "./globals.css";
import Image from "next/image";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";

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

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "RailEats | Order Fresh Food Delivery in Train",
    template: "%s | RailEats",
  },

  description:
    "Order fresh, hygienic and affordable food delivery in train from trusted restaurants at railway stations across India.",

  applicationName: "RailEats",

  category: "Food & Drink",

  manifest: "/manifest.webmanifest",

  referrer: "origin-when-cross-origin",

  keywords: [
    "food delivery in train",
    "train food order",
    "railway food delivery",
    "order food in train",
    "food on train",
    "RailEats",
    "IRCTC food delivery",
    "PNR food order",
    "train meal delivery",
    "railway station restaurant",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "RailEats",
    title: "RailEats | Order Fresh Food Delivery in Train",
    description:
      "Book fresh meals from railway station restaurants and get food delivered directly to your train seat.",
    locale: "en_IN",
    images: [
      {
        url: "/raileats-logo.png",
        width: 512,
        height: 512,
        alt: "RailEats Train Food Delivery",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "RailEats | Order Fresh Food Delivery in Train",
    description:
      "Fresh food delivery in train from trusted railway station restaurants across India.",
    images: ["/raileats-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  appleWebApp: {
    capable: true,
    title: "RailEats",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  icons: {
    icon: "/raileats-logo.png",
    shortcut: "/raileats-logo.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f5b800",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "RailEats",
  url: siteUrl,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/raileats-logo.png`,
    width: 512,
    height: 512,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-screen bg-slate-50/60 text-slate-900 font-sans antialiased selection:bg-amber-500 selection:text-white touch-pan-y">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />

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
                <Image
                  src="/raileats-logo.png"
                  alt="RailEats"
                  width={96}
                  height={96}
                  priority
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-screen isolation-isolate">
            <Navbar />

            <main className="customer-app-main" id="main-content">
              <div
                className="site-container"
                style={{
                  paddingBottom:
                    "calc(env(safe-area-inset-bottom, 0px) + 100px)",
                }}
              >
                {children}
              </div>
            </main>
          </div>

          <CartPopup />
          <LoginModal />
          <FeedbackModal />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
