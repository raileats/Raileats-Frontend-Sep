import "./globals.css";
import "./home-redesign.css";
import Image from "next/image";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";

import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ForceReloadOnBack from "./components/ForceReloadOnBack";
import Providers from "./components/Providers";
import LazyOverlays from "./components/LazyOverlays";
import DeferredAnalytics from "./components/DeferredAnalytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://www.raileats.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "RailEats | Order Food in Train Online",
    template: "%s",
  },

  description:
    "Order food in train online with RailEats by PNR, train number or railway station from active restaurant partners across India.",

  applicationName: "RailEats",
  category: "Food & Drink",
  manifest: "/manifest.webmanifest",
  referrer: "origin-when-cross-origin",

  keywords: [
    "RailEats",
    "Rail Eats",
    "RailEats.in",
    "food delivery in train",
    "order food in train",
    "train food order",
    "food on train",
    "PNR food order",
    "train food delivery",
    "railway station food delivery",
    "railway food delivery",
    "restaurant food in train",
    "IRCTC food delivery",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: `${siteUrl}/`,
    siteName: "RailEats",
    title: "RailEats | Order Food in Train Online",
    description:
      "Search by PNR, train number or railway station and order fresh meals from available restaurant partners.",
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
    title: "RailEats | Order Food in Train Online",
    description:
      "Order food in train by PNR, train number or station from RailEats restaurant partners.",
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
  themeColor: "#DFFE00",
};

const organizationSchema = {
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "RailEats",
  alternateName: "Rail Eats",
  url: `${siteUrl}/`,
  description:
    "RailEats is an online food delivery platform for train passengers in India.",
  logo: {
    "@type": "ImageObject",
    "@id": `${siteUrl}/#logo`,
    url: `${siteUrl}/raileats-logo.png`,
    contentUrl: `${siteUrl}/raileats-logo.png`,
    width: 512,
    height: 512,
    caption: "RailEats",
  },
};

const websiteSchema = {
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: "RailEats",
  alternateName: ["Rail Eats", "RailEats.in"],
  description:
    "Order food in train online with RailEats by PNR, train number or railway station.",
  publisher: {
    "@id": `${siteUrl}/#organization`,
  },
  inLanguage: "en-IN",
};

const brandSchema = {
  "@context": "https://schema.org",
  "@graph": [organizationSchema, websiteSchema],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-amber-500 selection:text-white touch-pan-y">
        <DeferredAnalytics />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(brandSchema),
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .customer-app-main .customer-app-main {
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                min-height: auto !important;
              }

              .customer-app-main .home-app-shell {
                padding-top: 0 !important;
                margin-top: 0 !important;
              }

              .customer-app-main .mobile-native-home {
                padding-top: 0 !important;
              }

              .customer-app-main .mobile-home-hero {
                margin-top: 0 !important;
              }

              .customer-app-main .home-hero-slider-slot .container-app {
                padding-top: 0 !important;
              }
            `,
          }}
        />

        <Providers>
          <ForceReloadOnBack />

          <div
            id="global-raileats-spinner"
            aria-hidden
            className="pointer-events-none transition-all duration-300"
          >
            <div className="outer-ring" aria-hidden>
              <div className="inner-logo" aria-hidden>
                <Image
                  src="/raileats-header.webp"
                  alt="RailEats"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-screen flex-col isolation-isolate">
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

          <LazyOverlays />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
