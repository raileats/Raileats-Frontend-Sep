"use client";
import { useState } from "react";
import PartnerForm from "../components/PartnerForm";

export default function PartnerPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Partner with RailEats</h1>
      <p>Fill the form to become a restaurant partner.</p>

      {open && <PartnerForm onClose={() => setOpen(false)} />}
    </div>
  );
}
