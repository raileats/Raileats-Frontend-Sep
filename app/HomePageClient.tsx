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

export default function HomePageClient() {
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
      document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
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
    <main className="min-h-screen">
      <div className="mx-auto w-full md:max-w-4xl md:px-6">
        <HeroSlider />
        <SearchBox />
        <ExploreRailInfo />
        <Offers />
        <Steps />

        <section className="mt-6">
          <button
            type="button"
            onClick={() => {
              if (!user) {
                localStorage.setItem("afterLoginAction", "bulk");
                window.dispatchEvent(new CustomEvent("raileats:open-login"));
              } else {
                setShowBulkModal(true);
              }
            }}
            className="app-card w-full text-left p-4"
          >
            <h2 className="font-semibold text-base">Bulk Food Order in Train</h2>
            <p className="text-sm text-slate-500 mt-1">
              Planning a group journey? Send a bulk order query for train meals
              with best pricing and support.
            </p>
          </button>
        </section>

        <section className="mt-6 app-card p-4">
          <h2 className="app-section-title">Order Food in Train with RailEats</h2>
          <p className="app-muted mt-2">
            RailEats helps passengers order fresh meals online by train number,
            PNR or railway station. Choose from available station restaurants,
            add food items to cart and get your meal delivered to your seat.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="rounded-lg border border-slate-200 p-3 bg-white">
              <strong>Search Train</strong>
              <p className="text-slate-500 mt-1">Find restaurants on your train route.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 bg-white">
              <strong>Select Restaurant</strong>
              <p className="text-slate-500 mt-1">Order from available station outlets.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 bg-white">
              <strong>Get Delivery</strong>
              <p className="text-slate-500 mt-1">Receive food at your train seat.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 app-card p-4">
          <h2 className="app-section-title">Popular Train Food Searches</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[
              "Food delivery in train",
              "Order food by train number",
              "Food at railway station",
              "Veg food in train",
              "Fresh meals on train",
              "Train food booking online",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 app-card p-4">
          <h2 className="app-section-title">Food Delivery in Train FAQs</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <h3 className="font-semibold">Can I order food using train number?</h3>
              <p className="text-slate-500">
                Yes. Enter your train number, select journey date and boarding
                station, then RailEats shows available restaurants on the route.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">How does RailEats decide available restaurants?</h3>
              <p className="text-slate-500">
                Availability depends on train arrival time, restaurant service
                hours, cutoff time, weekly off, holiday status and active outlet status.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Can I pay online or cash on delivery?</h3>
              <p className="text-slate-500">
                Payment options depend on the restaurant configuration and are
                shown during checkout.
              </p>
            </div>
          </div>
        </section>

        <FooterLinks />
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-5 rounded-xl w-full max-w-md space-y-3 relative">
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="absolute top-3 right-3 text-xl"
              aria-label="Close bulk order form"
            >
              x
            </button>

            <h2 className="text-center font-semibold">Bulk Order Query</h2>

            {success ? (
              <div className="text-green-600 text-center font-semibold">
                Query submitted successfully
              </div>
            ) : (
              <>
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
                      placeholder="Email optional"
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
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
                  className="app-input"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="app-btn-primary w-full"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
