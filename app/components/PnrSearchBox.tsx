// app/components/PnrSearchBox.tsx
"use client";

import { FormEvent, useState } from "react";

type Props = {
  compact?: boolean;
};

export default function PnrSearchBox({ compact = false }: Props) {
  const [pnr, setPnr] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPnr = pnr.replace(/\D/g, "");

    if (!/^[2468][0-9]{9}$/.test(cleanPnr)) {
      alert("Please enter a valid 10-digit PNR starting with 2, 4, 6, or 8.");
      return;
    }

    window.location.href = `/pnr/${encodeURIComponent(cleanPnr)}`;
  }

  return (
    <section
      aria-label="Search food using PNR"
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        borderRadius: compact ? 14 : 18,
        padding: compact ? 11 : 14,
        boxShadow: "0 3px 12px rgba(249,115,22,0.08)",
      }}
    >
      <div
        style={{
          color: "#9a3412",
          fontSize: compact ? 13 : 15,
          fontWeight: 900,
          lineHeight: 1.25,
        }}
      >
        Enter PNR to order food on your train
      </div>

      <div
        style={{
          marginTop: 3,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 650,
        }}
      >
        We will verify your train, journey date and available delivery stations.
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 8,
        }}
      >
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          aria-label="10-digit PNR number"
          placeholder="Enter 10-digit PNR"
          value={pnr}
          maxLength={10}
          onChange={(event) =>
            setPnr(event.target.value.replace(/\D/g, "").slice(0, 10))
          }
          style={{
            minWidth: 0,
            width: "100%",
            height: 42,
            boxSizing: "border-box",
            border: "1px solid #fdba74",
            borderRadius: 11,
            background: "#fff",
            padding: "0 12px",
            color: "#0f172a",
            fontSize: 14,
            fontWeight: 750,
            outlineColor: "#f97316",
          }}
        />

        <button
          type="submit"
          style={{
            height: 42,
            border: 0,
            borderRadius: 11,
            background: "#f97316",
            padding: "0 15px",
            color: "#fff",
            fontSize: 13,
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(249,115,22,0.2)",
          }}
        >
          Search Food
        </button>
      </form>
    </section>
  );
}
