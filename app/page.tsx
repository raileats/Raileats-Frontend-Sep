"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "./lib/useAuth";
import { supabase } from "./lib/supabaseClient";

import HeroSlider from "./components/HeroSlider";
import SearchBox from "./components/SearchBox";
import Offers from "./components/Offers";
import Steps from "./components/Steps";
import ExploreRailInfo from "./components/ExploreRailInfo";
import FooterLinks from "./components/FooterLinks";

export default function HomePage() {
  const search = useSearchParams();
  const user = useAuth((s) => s.user);

  const [showBulkModal, setShowBulkModal] = useState(false);

  // 🔥 FORM STATES
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);

  /* 🔥 SUBMIT FUNCTION (FIXED) */
  const handleSubmit = async () => {
    console.log("SUBMIT CLICKED");

    if (!trainNumber || !journeyDate || !quantity) {
      alert("Please fill all required fields");
      return;
    }

    if (!user && (!name || !mobile)) {
      alert("Please fill your details");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bulk_order_queries")
        .insert([
          {
            name: user?.name || name,
            mobile: user?.mobile || mobile,
            email: user?.email || email,
            train_number: trainNumber,
            journey_date: journeyDate,
            quantity: quantity,
          },
        ]);

      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);

      if (error) {
        alert("❌ Error submitting enquiry");
        return;
      }

      // ✅ SUCCESS ONLY AFTER INSERT
      setSuccess(true);

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  /* 🔹 SCROLL */
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

        <section className="mt-3 px-3 md:px-0">
          <HeroSlider />
        </section>

        <section className="mt-4 px-3 md:px-0">
          <SearchBox />
        </section>

        <section className="mt-4 px-3 md:px-0">
          <ExploreRailInfo />
        </section>

        <section id="offers" className="mt-6 px-3 md:px-0">
          <Offers />
        </section>

        <section className="mt-6 px-3 md:px-0">
          <Steps />
        </section>

        {/* BULK CARD */}
        <section id="bulk-order" className="mt-8 px-3 md:px-0">
          <div
            onClick={() => setShowBulkModal(true)}
            className="bg-white rounded-xl p-4 shadow border cursor-pointer"
          >
            <h2 className="font-semibold">Bulk Order Query</h2>
            <p className="text-sm text-gray-500">
              Bulk Food Order for Groups in Train – Submit Your Enquiry
            </p>
          </div>
        </section>

        <section className="mt-8 px-3 md:px-0 mb-16">
          <FooterLinks />
        </section>
      </div>

      {/* 🔥 MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-[90%] max-w-md space-y-4">

            <h2 className="text-lg font-semibold">
              Bulk Food Order
            </h2>

            {success ? (
              <div className="text-green-600 text-center">
                ✅ Your query submitted successfully
              </div>
            ) : (
              <>
                {!user && (
                  <>
                    <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full border p-2"/>
                    <input placeholder="Mobile" value={mobile} onChange={(e)=>setMobile(e.target.value)} className="w-full border p-2"/>
                    <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border p-2"/>
                  </>
                )}

                <input placeholder="Train Number" value={trainNumber} onChange={(e)=>setTrainNumber(e.target.value)} className="w-full border p-2"/>
                <input type="date" value={journeyDate} onChange={(e)=>setJourneyDate(e.target.value)} className="w-full border p-2"/>
                <input placeholder="Quantity" value={quantity} onChange={(e)=>setQuantity(e.target.value)} className="w-full border p-2"/>

                {/* 🔥 FIXED BUTTON */}
                <button
                  onClick={handleSubmit}
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
