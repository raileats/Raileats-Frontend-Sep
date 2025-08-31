"use client"
import Image from "next/image"

export default function Offers() {
  return (
    <section className="max-w-6xl mx-auto py-10 px-4">
      <h3 className="text-2xl font-bold text-center mb-6">
        Exclusive Offers on RailEats
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-yellow-100 p-6 rounded-lg shadow-md flex items-center gap-4">
          <Image src="/offers/Offer50.png" alt="Offer 50" width={80} height={80} />
          <div>
            <h4 className="text-lg font-semibold">Flat ₹50 OFF</h4>
            <p className="text-sm text-gray-700">On Orders Above ₹500</p>
          </div>
        </div>

        <div className="bg-blue-100 p-6 rounded-lg shadow-md flex items-center gap-4">
          <Image src="/offers/Offer20.png" alt="Offer 20" width={80} height={80} />
          <div>
            <h4 className="text-lg font-semibold">Flat ₹20 OFF</h4>
            <p className="text-sm text-gray-700">On Orders Above ₹200</p>
          </div>
        </div>
      </div>
    </section>
  )
}
