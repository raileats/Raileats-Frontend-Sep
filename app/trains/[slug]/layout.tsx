// app/trains/[slug]/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE_URL = "https://www.raileats.in";

type TrainLayoutProps = {
  children: ReactNode;
  params: {
    slug: string;
  };
};

function getTrainNumber(slug: string) {
  return String(slug || "").match(/^(\d{5})/)?.[1] || "";
}

export async function generateMetadata({
  params,
}: TrainLayoutProps): Promise<Metadata> {
  const trainNumber = getTrainNumber(params.slug);

  if (!trainNumber) {
    return {
      title: "Train Food Delivery - RailEats",
      description:
        "Order fresh food online for delivery during your train journey with RailEats.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const canonicalUrl =
    `${SITE_URL}/trains/${trainNumber}-train-food-delivery-in-train`;

  const title = `Order Food in Train ${trainNumber} - RailEats`;

  const description =
    `Order fresh food online in train ${trainNumber}. ` +
    `Choose available restaurants and get food delivered at your railway station with RailEats.`;

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
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

    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "RailEats",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function TrainLayout({
  children,
}: TrainLayoutProps) {
  return children;
}
