"use client";
import { useState } from "react";

export default function SearchBox() {
  const [pnr, setPnr] = useState("");
  const [train, setTrain] = useState("");
  const [station, setStation] = useState("");

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex flex-col">
        <input type="text" placeholder="Enter PNR Number" value={pnr} onChange={(e) => setPnr(e.target.value)} className="px-4 py-2 border border-gray-400 rounded-t-md" />
        <button className="bg-black text-white px-4 py-2 rounded-b-md">Search by PNR</button>
      </div>
      <div className="flex flex-col">
        <input type="text" placeholder="Enter Station Code" value={station} onChange={(e) => setStation(e.target.value)} className="px-4 py-2 border border-gray-400 rounded-t-md" />
        <button className="bg-black text-white px-4 py-2 rounded-b-md">Search by Station</button>
      </div>
      <div className="flex flex-col">
        <input type="text" placeholder="Enter Train Number" value={train} onChange={(e) => setTrain(e.target.value)} className="px-4 py-2 border border-gray-400 rounded-t-md" />
        <button className="bg-black text-white px-4 py-2 rounded-b-md">Search by Train</button>
      </div>
    </div>
  );
}
