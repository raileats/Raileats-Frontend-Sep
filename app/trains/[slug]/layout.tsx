// app/trains/[slug]/layout.tsx

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { serviceClient } from "../../lib/supabaseServer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.raileats.in";

function cleanTrainName(value: any) {
  const name = String(value ?? "").trim();

  if (
    !name ||
    name.toLowerCase() === "train" ||
    name.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return name;
}

async function getTrainName(trainNumber: string) {
  if (!trainNumber) return "";

  const numericTrain = Number(trainNumber) || 0;
  const { data } = await serviceClient
    .from("TrainRoute")
    .select("*")
    .or(`trainNumber.eq.${trainNumber},trainNumber.eq.${numericTrain}`)
    .order("StnNumber", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    cleanTrainName(data?.trainName) ||
    cleanTrainName(data?.TrainName) ||
    cleanTrainName(data?.train_name)
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = String(params?.slug || "");
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  if (!trainNumber) {
    return {
      title: "Train Food Delivery | RailEats",
      robots: { index: false, follow: true },
    };
  }

  const trainName = await getTrainName(trainNumber);
  const fullTrain = trainName
    ? `${trainNumber} - ${trainName}`
    : trainNumber;
  const canonical = `${SITE_URL}/trains/${trainNumber}-train-food-delivery-in-train`;
  const title = `Order Food in Train ${fullTrain} | RailEats`;
  const description = `Order fresh food in train ${fullTrain}. View active restaurants on the route and enter your PNR for delivery at your seat.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
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
      title,
      description,
      url: canonical,
      siteName: "RailEats",
      type: "website",
      locale: "en_IN",
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
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const slug = String(params?.slug || "");
  const trainNumber = slug.match(/^(\d+)/)?.[1] || "";

  if (!trainNumber) return children;

  const canonical = `${SITE_URL}/trains/${trainNumber}-train-food-delivery-in-train`;
  const faq = [
    {
      question: `Can I order food online in train ${trainNumber}?`,
      answer: `Yes. Enter your valid 10-digit PNR on RailEats to check eligible delivery stations and active restaurants for train ${trainNumber}.`,
    },
    {
      question: "Why is a PNR required for train food delivery?",
      answer:
        "PNR verification confirms the train, journey date and eligible delivery stations before an order is placed.",
    },
    {
      question: "Where is the food delivered?",
      answer:
        "The order is delivered at the railway station selected during booking using the coach and seat details supplied with the order.",
    },
    {
      question: "Why can restaurant availability change?",
      answer:
        "Availability depends on the delivery station, journey date, train arrival time, restaurant status and order cut-off time.",
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: `Order Food in Train ${trainNumber}`,
        description: `View active restaurants for train ${trainNumber} and enter your PNR to check food delivery options for your journey.`,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "RailEats",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Food in Train",
            item: `${SITE_URL}/order-food-in-train`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `Train ${trainNumber}`,
            item: canonical,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonical}#faq`,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
