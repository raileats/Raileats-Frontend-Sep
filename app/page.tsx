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

  // 🔥 FORM STATES
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ⭐ FEEDBACK STATES
  const [rating, setRating] = useState(0); // ✅ FIX
  const [comment, setComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const formatMobile = (num) => {
    if (!num) return "";

    let clean = num.replace(/\D/g, "");

    if (clean.startsWith("91") && clean.length === 12) {
      return "+" + clean;
    }

    if (clean.length === 10) {
      return "+91" + clean;
    }

    return num;
  };

  /* 🔥 BULK SUBMIT */
  const handleSubmit = async () => {
    if (!trainNumber || !journeyDate || !quantity) {
      alert("Please fill all required fields");
      return;
    }

    if (!user && (!name || !mobile)) {
      alert("Please fill your details");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("bulk_order_queries")
        .insert([
          {
            name: user?.name || name,
            mobile: user?.mobile || formatMobile(mobile),
            email: user?.email || email,
            train_number: trainNumber,
            journey_date: journeyDate,
            quantity: quantity,
          },
        ]);

      setLoading(false);

      if (error) {
        alert("❌ Error submitting enquiry");
        return;
      }

      setSuccess(true);

      setTrainNumber("");
      setJourneyDate("");
      setQuantity("");
      setName("");
      setMobile("");
      setEmail("");

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Something went wrong");
    }
  };

  /* 🔥 FEEDBACK SUBMIT */
  const handleFeedbackSubmit = async () => {
    if (!rating || !comment) {
      alert("Please fill all fields");
      return;
    }

    const { error } = await supabase
      .from("feedbacks")
      .insert([
        {
          name: user?.name,
          mobile: user?.mobile,
          rating: Number(rating),
          message: comment,
        },
      ]);

    if (error) {
      alert("❌ Error submitting feedback");
      return;
    }

    setFeedbackSuccess(true);
    setRating(0); // ✅ reset fix
    setComment("");
  };

  /* 🔹 SCROLL */
  useEffect(() => {
    const goto = search.get("goto");

    if (goto === "offers") {
      document.getElementById("offers")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [search]);

  /* 🔥 OPEN FEEDBACK EVENT */
  useEffect(() => {
    const openFeedback = () => setShowFeedbackModal(true);

    window.addEventListener("raileats:open-feedback", openFeedback);

    return () => {
      window.removeEventListener("raileats:open-feedback", openFeedback);
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

  return (
    <main className="bg-gray-50 min-h-screen">

      <div className="mx-auto w-full md:max-w-4xl md:px-6">

        <HeroSlider />
        <SearchBox />
        <ExploreRailInfo />
        <Offers />
        <Steps />

        {/* BULK */}
        <section className="mt-6">
  <div
    onClick={() => setShowBulkModal(true)}
    className="bg-white p-4 rounded-xl shadow border cursor-pointer"
  >
    <h3 className="font-semibold text-base">
      Bulk Order Query
    </h3>

    <p className="text-sm text-gray-500 mt-1">
      Bulk Food Orders for Groups on Train – Get Best Pricing & Support
    </p>
  </div>
</section>
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
      {/* 🔥 FEEDBACK MODAL */}
{showFeedbackModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-5 rounded-xl w-[90%] max-w-md space-y-3 relative">

      {/* ❌ CLOSE ICON */}
      <button
        onClick={() => setShowFeedbackModal(false)}
        className="absolute top-3 right-3 text-gray-500 text-lg"
      >
        ✕
      </button>

      <h2 className="text-center font-semibold">
        ⭐ Rate Your Experience
      </h2>

      {feedbackSuccess ? (
        <div className="text-green-600 text-center">
          ✅ Feedback submitted
        </div>
      ) : (
        <>
          {/* ⭐ STAR UI */}
          <div className="flex justify-center gap-2 text-2xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                className={`cursor-pointer ${
                  star <= rating ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            placeholder="Write feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border p-2 rounded-md"
          />

          {/* BUTTONS */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleFeedbackSubmit}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg"
            >
              Submit Feedback
            </button>

            <button
              onClick={() => setShowFeedbackModal(false)}
              className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </>
      )}

    </div>
  </div>
)}

</main>
);
}
