"use client"
import { useState } from "react"

export default function SearchBox() {
  const [type, setType] = useState("pnr")
  const [value, setValue] = useState("")

  const handleSubmit = () => {
    alert(`Searching by ${type}: ${value}`)
  }

  return (
    <section className="w-full bg-white shadow-md py-6">
      <div className="max-w-3xl mx-auto px-4">
        <h3 className="text-xl md:text-2xl font-bold text-center mb-4">
          Order Restaurant Food on Trains Online
        </h3>

        {/* Radio Options */}
        <div className="flex justify-center gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="pnr"
              checked={type === "pnr"}
              onChange={(e) => setType(e.target.value)}
            />
            <span>PNR</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="train"
              checked={type === "train"}
              onChange={(e) => setType(e.target.value)}
            />
            <span>Train Name/No.</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="searchType"
              value="station"
              checked={type === "station"}
              onChange={(e) => setType(e.target.value)}
            />
            <span>Station</span>
          </label>
        </div>

        {/* Input + Submit */}
        <div className="flex gap-2 justify-center">
          <input
            type="text"
            placeholder={`Enter ${type.toUpperCase()} to Order`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            className="bg-black text-white px-6 py-2 rounded-lg"
          >
            Submit
          </button>
        </div>

        <p className="text-center mt-2 text-sm text-gray-600">
          Order food in trains from trusted restaurants with freshness,
          hygiene and timely delivery
        </p>
      </div>
    </section>
  )
}
