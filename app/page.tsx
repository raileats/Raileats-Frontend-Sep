'use client'
import { useState } from 'react'
import HeroSlider from '../components/HeroSlider'

export default function Home() {
  const [pnr, setPnr] = useState('')
  const [train, setTrain] = useState('')
  const [result, setResult] = useState<any>(null)

  const handlePNRSearch = async () => {
    const res = await fetch('https://dummyjson.com/products/1')
    const data = await res.json()
    setResult({ type: 'PNR', data })
  }

  const handleTrainSearch = async () => {
    const res = await fetch('https://dummyjson.com/products/2')
    const data = await res.json()
    setResult({ type: 'Train', data })
  }

  return (
    <main className="flex flex-col items-center justify-center">
      {/* 🔥 Auto Sliding Banner */}
      <HeroSlider />

      <div className="p-6 text-center">
        <h1 className="text-4xl font-bold">Welcome to Raileats.in</h1>
        <p className="mt-2 text-lg">Ab Rail Journey ka Swad Only Raileats ke Saath</p>
      </div>

      <div className="mt-10 w-full max-w-md space-y-4">
        <div className="flex">
          <input
            type="text"
            placeholder="Enter PNR Number"
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-400 rounded-l-md"
          />
          <button
            onClick={handlePNRSearch}
            className="bg-black text-white px-4 rounded-r-md"
          >
            Search by PNR
          </button>
        </div>

        <div className="flex">
          <input
            type="text"
            placeholder="Enter Train Number"
            value={train}
            onChange={(e) => setTrain(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-400 rounded-l-md"
          />
          <button
            onClick={handleTrainSearch}
            className="bg-black text-white px-4 rounded-r-md"
          >
            Search by Train
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-10 w-full max-w-md bg-white p-4 rounded shadow text-black">
          <h2 className="font-bold text-xl mb-2">Dummy {result.type} Result</h2>
          <pre className="text-xs text-left whitespace-pre-wrap">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}
