"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import FooterLinks from "./components/FooterLinks";

export default function HomePage() {
  const search = useSearchParams();

  const [showBulkModal, setShowBulkModal] = useState(false);

  /* 🔹 SCROLL LOGIC */
  useEffect(() => {
    const goto = search.get("goto");

    if (goto === "offers") {
      document.getElementById("offers")?.scrollIntoView({
        behavior: "smooth",
      });
    }

    if (goto === "bulk") {
      document.getElementById("bulk-order")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [search]);

  return (
    <main className="bg-gray-50 min-h-screen">

      <div className="mx-auto w-full md:max-w-4xl md:px-6">

        {/* Welcome Strip */}
        <div className="mt-0">
          <div className="md:rounded-lg md:bg-gradient-to-r md:from-yellow-400 md:via-yellow-500 md:to-yellow-600 md:text-black md:py-3 md:px-6">
            <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 md:bg-none md:py-0">
              <div className="mx-auto max-w-full px-4 text-center">
                <h1 className="text-lg md:text-xl font-bold">
                  Welcome to <span className="font-extrabold">RailEats.in</span>
                </h1>
                <p className="text-sm md:text-base mt-1 font-medium">
                  Ab Rail Journey ka Swad Only{" "}
                  <span className="font-semibold">RailEats</span> ke Saath
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Slider */}
        <section className="mt-3 px-3 md:px-0">
          <HeroSlider />
        </section>

        {/* Search */}
        <section className="mt-4 px-3 md:px-0">
          <SearchBox />
        </section>

        {/* Explore */}
        <section className="mt-4 px-3 md:px-0">
          <ExploreRailInfo />
        </section>

        {/* Offers */}
        <section id="offers" className="mt-6 px-3 md:px-0">
          <Offers />
        </section>

        {/* Steps */}
        <section className="mt-6 px-3 md:px-0">
          <Steps />
        </section>

        {/* 🔥 BULK ORDER SECTION (UPDATED CLEAN UI) */}
        <section id="bulk-order" className="mt-8 px-3 md:px-0">
          <div
            onClick={() => setShowBulkModal(true)}
            className="bg-white rounded-xl p-4 shadow border cursor-pointer hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-base font-semibold">
                  Bulk Order Query
                </h2>
                <p className="text-sm text-gray-500">
                  Bulk Food Order for Groups in Train – Submit Your Enquiry
                </p>
              </div>

              <span className="text-xl text-gray-400">›</span>

            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="mt-8 px-3 md:px-0 mb-16">
          <FooterLinks />
        </section>
      </div>

      
{/* 🔥 BULK MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-[90%] max-w-md space-y-4">

            <h2 className="text-lg font-semibold">
              Bulk Food Order for Groups in Train
            </h2>

            {success ? (
              <div className="text-green-600 text-sm text-center">
                Your query submitted, our team will contact you soon
              </div>
            ) : (
              <>
                {!user && (
                  <>
                    <input
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />

                    <input
                      placeholder="Mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />

                    <input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </>
                )}

                <input
                  placeholder="Train Number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />

                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />

                <input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />

                <button
                  onClick={() => setSuccess(true)}
                  className="w-full bg-yellow-600 text-white py-2 rounded"
                >
                  Submit Enquiry
                </button>
              </>
            )}

            <button
              onClick={() => {
                setShowBulkModal(false);
                setSuccess(false);
              }}
              className="w-full bg-gray-300 py-2 rounded"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </main>
  );
}
