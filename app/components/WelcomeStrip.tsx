"use client";

export default function WelcomeStrip() {
  return (
    <div className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black">
      <div className="mx-auto max-w-screen-xl px-4 py-2 md:py-3 flex items-center justify-center">
        <p className="text-sm md:text-base font-medium text-center leading-tight">
          Welcome to <span className="font-semibold">RailEats.in</span> — 
          <span className="ml-1">“Fresh Meals, Right at Your Seat”</span>
        </p>
      </div>
    </div>
  );
}
