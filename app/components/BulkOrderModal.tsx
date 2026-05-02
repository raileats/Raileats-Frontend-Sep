"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabaseClient";

export default function BulkOrderModal() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatMobile = (num: string) => {
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

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setSuccess(false);
      setTrainNumber("");
      setJourneyDate("");
      setQuantity("");
      setName("");
      setMobile("");
      setEmail("");
    };

    window.addEventListener("raileats:open-bulk", handleOpen);
    return () => {
      window.removeEventListener("raileats:open-bulk", handleOpen);
    };
  }, []);

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
  );
}
