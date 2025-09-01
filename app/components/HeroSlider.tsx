"use client";
import { useEffect, useState } from "react";
import Image from "next/image";


const slides = [
{ src: "/slides/Offer20.png", caption: "🎉 Flat ₹20 OFF on Orders Above ₹250" },
{ src: "/slides/Offer50.png", caption: "🔥 Flat ₹50 OFF on Orders Above ₹500" },
{ src: "/slides/fssai.jpg", caption: "✅ FSSAI Approved | Vendor Verified" },
];


export default function HeroSlider() {
const [index, setIndex] = useState(0);


useEffect(() => {
const interval = setInterval(() => {
setIndex((prev) => (prev + 1) % slides.length);
}, 3000);
return () => clearInterval(interval);
}, []);


return (
<div className="relative w-full h-[280px] md:h-[400px] overflow-hidden bg-yellow-400 mt-14">
{/* Slides */}
{slides.map((slide, i) => (
<div
key={i}
className={`absolute inset-0 transition-opacity duration-700 ${
i === index ? "opacity-100" : "opacity-0"
}`}
>
<Image
src={slide.src}
alt={slide.caption}
fill
className="object-contain md:object-cover"
priority={i === index}
/>
<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg text-white text-sm md:text-lg shadow-md">
{slide.caption}
</div>
</div>
))}


{/* Dots */}
<div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
{slides.map((_, i) => (
<span
key={i}
onClick={() => setIndex(i)}
className={`w-3 h-3 rounded-full cursor-pointer ${
i === index ? "bg-yellow-500" : "bg-gray-300"
}`}
></span>
))}
</div>
</div>
);
}
