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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  /* 🔹 SCROLL */
  useEffect(() => {
    const goto = search.get("goto");

    if (goto === "offers") {
      document.getElementById("offers")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [search]);

  /* 🔥 FEEDBACK EVENT */
  useEffect(() => {
    const open = () => setShowFeedbackModal(true);
    window.addEventListener("raileats:open-feedback", open);

    return () => {
      window.removeEventListener("raileats:open-feedback", open);
    };
  }, []);

  /* 🔥 AFTER LOGIN */
  useEffect(() => {
    const action = localStorage.getItem("afterLoginAction");

    if (action === "feedback") {
      setShowFeedbackModal(true);
      localStorage.removeItem("afterLoginAction");
    }
  }, []);

  /* 🔥 BULK SUBMIT */
  const handleSubmit = async () => {
    if (!trainNumber || !journeyDate || !quantity) {
      alert("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("bulk_order_queries").insert([
      {
        train_number: trainNumber,
        journey_date: journeyDate,
        quantity,
      },
    ]);

    if (error) {
      alert("Error");
      return;
    }

    setSuccess(true);
    setTrainNumber("");
    setJourneyDate("");
    setQuantity("");
  };

  /* 🔥 FEEDBACK SUBMIT */
  const handleFeedbackSubmit = async () => {
    if (!rating || !comment) {
      alert("Fill all");
      return;
    }

    const { error } = await supabase.from("feedbacks").insert([
      {
        name: user?.name,
        mobile: user?.mobile,
        rating,
        message: comment,
      },
    ]);

    if (error) {
      alert("Error submitting feedback");
      return;
    }

    setFeedbackSuccess(true);
    setRating(0);
    setComment("");
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="mx-auto w-full md:max-w-4xl md:px-6">

        <HeroSlider />
        <SearchBox />
        <ExploreRailInfo />

        <section id="offers">
          <Offers />
        </section>

        <Steps />

        {/* BULK CARD */}
        <section className="mt-6">
          <div
            onClick={() => setShowBulkModal(true)}
            className="bg-white p-4 rounded-xl shadow border cursor-pointer"
          >
            <h3 className="font-semibold">Bulk Order Query</h3>
            <p className="text-sm text-gray-500 mt-1">
              Bulk Food Order for Groups in Train – Submit Your Enquiry
            </p>
          </div>
        </section>

        <FooterLinks />
      </div>

      {/* BULK MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-xl w-[90%] max-w-md space-y-3 relative">

            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-3 right-3"
            >
              ✕
            </button>

            <h2 className="text-center font-semibold">Bulk Order</h2>

            {success ? (
              <div className="text-green-600 text-center">
                Submitted
              </div>
            ) : (
              <>
                <input
                  placeholder="Train Number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <button
                  onClick={handleSubmit}
                  className="w-full bg-yellow-500 text-white py-2 rounded"
                >
                  Submit
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-xl w-[90%] max-w-md space-y-3 relative">

            <button
              onClick={() => setShowFeedbackModal(false)}
              className="absolute top-3 right-3"
            >
              ✕
            </button>

            <h2 className="text-center font-semibold">
              ⭐ Rate Your Experience
            </h2>

            {feedbackSuccess ? (
              <div className="text-green-600 text-center">
                Submitted
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-2 text-2xl">
                  {[1,2,3,4,5].map((star)=>(
                    <span
                      key={star}
                      onClick={()=>setRating(star)}
                      className={star<=rating ? "text-yellow-400 cursor-pointer" : "text-gray-300 cursor-pointer"}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e)=>setComment(e.target.value)}
                  className="w-full border p-2 rounded"
                />

                <button
                  onClick={handleFeedbackSubmit}
                  className="w-full bg-yellow-500 text-white py-2 rounded"
                >
                  Submit Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
