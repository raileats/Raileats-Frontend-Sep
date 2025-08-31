"use client";
import { Home, Train, Percent, List } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-black text-white flex justify-around py-3 md:hidden">
      <button className="flex flex-col items-center"><Home size={20}/> <span className="text-xs">Home</span></button>
      <button className="flex flex-col items-center"><Train size={20}/> <span className="text-xs">Train Tools</span></button>
      <button className="flex flex-col items-center"><Percent size={20}/> <span className="text-xs">Offers</span></button>
      <button className="flex flex-col items-center"><List size={20}/> <span className="text-xs">Menu</span></button>
    </div>
  );
}
