"use client"
import Image from "next/image"

export default function HeroSlider() {
  return (
    <section className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between p-6 md:p-10">
        
        {/* 🖼️ Left side - Train Image */}
        <div className="w-full md:w-1/2 flex justify-center">
          <Image
            src="/train-banner.png" // 👈 आप public/ में डालें (Zoop जैसा train image)
            alt="Train Banner"
            width={500}
            height={300}
            className="object-contain"
          />
        </div>

        {/* 📃 Right side - Text */}
        <div className="w-full md:w-1/2 text-center md:text-left space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black">
            Fresh Food on Trains
          </h2>
          <p className="text-lg text-red-700 font-semibold">
            Loved by 2M+ Passengers - RailEats
          </p>
        </div>
      </div>
    </section>
  )
}
