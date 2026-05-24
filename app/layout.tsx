import React from "react";

// Mock Data (Aap isko apne actual dynamic data/props se replace kar sakte hain)
interface OrderSummaryProps {
  journeyData?: {
    trainName: string;
    pnr: string;
    seat: string;
    station: string;
  };
  items?: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
    isVeg: boolean;
  }>;
  billDetails?: {
    itemTotal: number;
    gst: number;
    delivery: number;
    total: number;
  };
}

export default function OrderSummary({
  journeyData = { trainName: "Rajdhani Exp (12301)", pnr: "4321098765", seat: "B1, 24", station: "New Delhi (NDLS)" },
  items = [
    { id: "1", name: "Premium Veg Deluxe Thali", qty: 1, price: 249, isVeg: true },
    { id: "2", name: "Paneer Butter Masala with 2 Butter Roti", qty: 2, price: 180, isVeg: true },
    { id: "3", name: "Mineral Water (1L)", qty: 1, price: 20, isVeg: true }
  ],
  billDetails = { itemTotal: 609, gst: 30.45, delivery: 0, total: 639.45 }
}: OrderSummaryProps) {
  
  return (
    <div className="w-full max-w-md mx-auto space-y-3 p-1">
      
      {/* 1. JOURNEY DETAILS CARD */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full inline-block"></span>
            Journey Details
          </h2>
          <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
            PNR: {journeyData.pnr}
          </span>
        </div>
        
        {/* Compact Grid for Details */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
          <div>
            <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Train</p>
            <p className="text-slate-700 font-semibold truncate mt-0.5">{journeyData.trainName}</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Berth / Seat</p>
            <p className="text-slate-700 font-semibold mt-0.5">{journeyData.seat}</p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Delivery Station</p>
            <p className="text-slate-700 font-medium mt-0.5 flex items-center gap-1">
              📍 {journeyData.station}
            </p>
          </div>
        </div>
      </div>

      {/* 2. YOUR ORDER CARD */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5">
        <div className="border-b border-slate-100 pb-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full inline-block"></span>
            Your Order
          </h2>
        </div>

        {/* Items List (Sleek and Tight Height) */}
        <div className="divide-y divide-slate-50">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between py-2.5 gap-4">
              <div className="flex items-start gap-2 min-w-0">
                {/* Veg Indicator dot */}
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 border ${item.isVeg ? 'border-green-600' : 'border-red-600'} p-[2px] mt-0.5 flex-shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></span>
                </span>
                
                {/* Item Name and Qty */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Qty: <span className="text-slate-600 font-semibold">{item.qty}</span>
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="text-sm font-semibold text-slate-800 flex-shrink-0">
                ₹{item.price * item.qty}
              </div>
            </div>
          ))}
        </div>

        {/* Bill Breakdown (Mini text sizes) */}
        <div className="border-t border-slate-100 mt-2 pt-2.5 space-y-1.5 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Item Total</span>
            <span className="font-medium text-slate-700">₹{billDetails.itemTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Restaurant Charges (GST)</span>
            <span className="font-medium text-slate-700">₹{billDetails.gst}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span className="font-medium text-green-600">
              {billDetails.delivery === 0 ? "FREE" : `₹${billDetails.delivery}`}
            </span>
          </div>
          
          {/* Total Amount Row */}
          <div className="flex justify-between border-t border-dashed border-slate-200 pt-2.5 mt-1">
            <span className="text-sm font-bold text-slate-800">To Pay</span>
            <span className="text-sm font-bold text-amber-600">₹{billDetails.total}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
