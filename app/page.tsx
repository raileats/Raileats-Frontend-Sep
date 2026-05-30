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
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [trainNumber, setTrainNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatMobile = (num: string) => {
    const clean = String(num || "").replace(/\D/g, "");

    if (clean.startsWith("91") && clean.length === 12) return `+${clean}`;
    if (clean.length === 10) return `+91${clean}`;

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

      const { error } = await supabase.from("bulk_order_queries").insert([
        {
          name: user?.name || name,
          mobile: user?.mobile || formatMobile(mobile),
          email: user?.email || email,
          train_number: trainNumber,
          journey_date: journeyDate,
          quantity,
        },
      ]);

      if (error) {
        alert("Error submitting enquiry");
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
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const goto = search.get("goto");

    if (goto === "offers") {
      document.getElementById("offers")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [search]);

  useEffect(() => {
    if (!user) return;

    const action = localStorage.getItem("afterLoginAction");

    if (action === "bulk") {
      setShowBulkModal(true);
      localStorage.removeItem("afterLoginAction");
    }
  }, [user]);

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <HeroSlider />
        <SearchBox />
      </section>

      <ExploreRailInfo />
      <Offers />
      <Steps />

      <section className="container-app">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              localStorage.setItem("afterLoginAction", "bulk");
              window.dispatchEvent(new CustomEvent("raileats:open-login"));
              return;
            }

            setShowBulkModal(true);
          }}
          className="app-card w-full p-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="app-section-title text-base">Bulk Order Query</h3>
              <p className="app-muted mt-1 text-sm">
                Group food orders on train with best pricing and support.
              </p>
            </div>

            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
              Enquire
            </span>
          </div>
        </button>
      </section>

      <FooterLinks />

      {showBulkModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="app-card relative w-full max-w-md p-5">
            <button
              type="button"
              onClick={() => {
                setShowBulkModal(false);
                setSuccess(false);
              }}
              className="absolute right-4 top-3 text-xl font-bold text-slate-500"
            >
              x
            </button>

            <h2 className="app-section-title text-center">Bulk Order</h2>
            <p className="app-muted mt-1 text-center text-sm">
              Share journey and quantity details.
            </p>

            {success ? (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-center font-bold text-green-700">
                Submitted successfully
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {!user && (
                  <>
                    <input
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="app-input"
                    />

                    <input
                      placeholder="Mobile"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="app-input"
                    />

                    <input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="app-input"
                    />
                  </>
                )}

                <input
                  placeholder="Train Number"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  className="app-input"
                />

                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="app-input"
                />

                <input
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value.replace(/\D/g, ""))
                  }
                  className="app-input"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="app-btn-success w-full"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
