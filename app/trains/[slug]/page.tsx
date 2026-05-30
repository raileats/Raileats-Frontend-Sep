import type { Metadata } from "next";
import TrainResultsClient from "./TrainResultsClient";

type Props = {
  params: { slug: string };
  searchParams: {
    date?: string;
    boarding?: string;
    trainName?: string;
  };
};

const siteUrl = "https://www.raileats.in";

function getTrainNumber(slug: string) {
  return String(slug || "").match(/^(\d+)/)?.[1] || "";
}

function cleanTrainName(value?: string) {
  return decodeURIComponent(String(value || "")).trim();
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const trainNumber = getTrainNumber(params.slug);
  const trainName = cleanTrainName(searchParams.trainName);
  const boarding = String(searchParams.boarding || "").toUpperCase();
  const date = searchParams.date || "";

  const title = trainName
    ? `Food Delivery in ${trainNumber} ${trainName}`
    : `Food Delivery in Train ${trainNumber}`;

  const description = `Order fresh food in train ${trainNumber}${
    trainName ? ` ${trainName}` : ""
  }${boarding ? ` from boarding station ${boarding}` : ""}${
    date ? ` for journey date ${date}` : ""
  }. View available railway stations, restaurants, cutoff time and meal options.`;

  const canonical = `/trains/${params.slug}${
    date || boarding
      ? `?${new URLSearchParams({
          ...(date ? { date } : {}),
          ...(boarding ? { boarding } : {}),
        }).toString()}`
      : ""
  }`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | RailEats`,
      description,
      url: `${siteUrl}${canonical}`,
      siteName: "RailEats",
      images: [
        {
          url: "/raileats-logo.png",
          width: 512,
          height: 512,
          alt: "RailEats train food delivery",
        },
      ],
    },
  };
}

export default function TrainPage({ params, searchParams }: Props) {
  const trainNumber = getTrainNumber(params.slug);
  const trainName = cleanTrainName(searchParams.trainName);
  const boarding = String(searchParams.boarding || "").toUpperCase();
  const date = searchParams.date || "";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: trainName
          ? `${trainNumber} ${trainName}`
          : `Train ${trainNumber}`,
        item: `${siteUrl}/trains/${params.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <TrainResultsClient
        slug={params.slug}
        trainNumber={trainNumber}
        trainName={trainName}
        urlDate={date}
        boarding={boarding}
      />
    </>
  );
}
