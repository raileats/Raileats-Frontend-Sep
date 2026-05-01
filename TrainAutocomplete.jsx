"use client";

import React, { useState, useEffect } from "react";
import "./TrainAutocomplete.css";
import { useBooking } from "@/lib/useBooking";

const TrainAutocomplete = ({ fetchTrains }) => {
  const [loading, setLoading] = useState(false);
  const [trains, setTrains] = useState([]);
  const [error, setError] = useState("");

  const { setTrain } = useBooking();

  const handleFetchTrains = async (inputValue) => {
    setLoading(true);
    setError("");
    try {
      const encodedValue = encodeURIComponent(inputValue);
      const response = await fetch(
        `https://api.example.com/trains?search=${encodedValue}`
      );
      const data = await response.json();
      setTrains(data.trains || []);
    } catch (err) {
      setError("Failed to fetch trains. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchTrains("example input");
  }, []);

  // 🔥 NEW: Train Select Handler
  const handleSelectTrain = (train) => {
    setTrain({
      number: train.number || train.id,
      name: train.name,
    });

    console.log("✅ Train saved in store:", train);
  };

  return (
    <div className="train-autocomplete">
      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      {trains.length === 0 && !loading && <p>No trains found</p>}

      <ul>
        {trains.map((train) => (
          <li
            key={train.id}
            onClick={() => handleSelectTrain(train)}
            style={{ cursor: "pointer" }}
          >
            {train.name} ({train.number || train.id})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrainAutocomplete;
