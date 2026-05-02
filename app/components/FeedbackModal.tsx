"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function FeedbackModal() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setFeedbackSuccess(false);
      setRating(0);
      setComment("");
    };

    window.addEventListener("raileats:open-feedback", handleOpen);
    return () => {
      window.removeEventListener("raileats:open-feedback", handleOpen);
    };
  }, []);

  const handleFeedbackSubmit = async () => {
    if (!rating || !comment) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("feedbacks").insert([
        {
          name: user?.name,
          mobile: user?.mobile,
          rating: Number(rating),
          message: comment,
        },
      ]);

      setLoading(false);

      if (error) {
        alert("❌ Error submitting feedback");
        return;
      }

      setFeedbackSuccess(true);
      setRating(0);
      setComment("");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-xl w-[90%] max-w-md space-y-3 relative">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3"
        >
          ✕
        </button>

        <h2 className="text-center font-semibold">⭐ Rate Your Experience</h2>

        {feedbackSuccess ? (
          <div className="text-green-600 text-center">✅ Feedback submitted</div>
        ) : (
          <>
            <div className="flex justify-center gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  className={
                    star <= rating
                      ? "text-yellow-400 cursor-pointer"
                      : "text-gray-300 cursor-pointer"
                  }
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

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleFeedbackSubmit}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
