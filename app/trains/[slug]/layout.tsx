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
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "RailEats",
      type: "website",
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
}: {
  children: ReactNode;
}) {
  return children;
}
