"use client";
import Image from "next/image";
import { useRef } from "react";

export default function OrderDetailsModal({
  order, onClose,
}: { order: any; onClose: () => void }) {
  const subTotal = order.items.reduce((s:any,i:any)=>s + i.qty * i.price, 0);
  const gst = +(subTotal * 0.05).toFixed(2);
  const total = +(subTotal + gst).toFixed(2);

  const printRef = useRef<HTMLDivElement>(null);
  const onPrint = () => {
    // Simple print: prints whole page (fast). For print-only content, you can add a
    // dedicated print stylesheet later if needed.
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-3 md:p-6">
      <div ref={printRef} className="w-full max-w-md rounded-2xl bg-white shadow-lg overflow-hidden">
        {/* Header with centered logo */}
        <div className="relative border-b bg-gray-50">
          <button onClick={onClose} className="absolute left-3 top-3 text-gray-600 text-lg">✕</button>
          <div className="py-3 flex justify-center">
            <Image src="/logo.png" alt="RailEats" width={40} height={40} className="rounded-full" />
          </div>
        </div>

        {/* Content scroll if long */}
        <div className="p-3 md:p-4 space-y-3 max-h-[70vh] overflow-y-auto text-[13px]">
          <h3 className="text-base font-semibold text-center">Order Summary</h3>

          {/* Top meta incl. Delivery Date */}
          <div className="grid grid-cols-2 gap-2">
            <Info k="Order ID" v={order.id}/>
            <Info k="Booking Date" v={order.bookingDate}/>
            <Info k="Delivery Date" v={order.date}/>
            <Info k="Station" v={order.station}/>
            <Info k="Passenger" v={order.passenger}/>
            <Info k="Mobile" v={order.mobile}/>
            <Info k="Train No." v={order.train}/>
            <Info k="Coach/Seat" v={`${order.coach}-${order.seat}`}/>
            <Info k="PNR" v={`xxxxxx${order.pnrLast4}`}/>
            <Info k="Mode" v={order.mode}/>
          </div>

          {/* Items */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it:any, idx:number)=>(
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-center">{it.qty}</td>
                    <td className="px-3 py-2 text-right">₹{it.qty*it.price}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr><td className="px-3 py-2" colSpan={2}>Subtotal</td><td className="px-3 py-2 text-right">₹{subTotal}</td></tr>
                <tr><td className="px-3 py-2" colSpan={2}>GST (5%)</td><td className="px-3 py-2 text-right">₹{gst}</td></tr>
                <tr className="font-semibold"><td className="px-3 py-2" colSpan={2}>Total</td><td className="px-3 py-2 text-right">₹{total}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 flex items-center justify-between text-[12px]">
          <span>Delivery on {order.date}</span>
          <button onClick={onPrint} className="rounded-md border px-3 py-1.5 bg-white hover:bg-gray-100">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({k,v}:{k:string; v:string}) {
  return (
    <div className="rounded-md bg-white border px-3 py-2">
      <p className="text-[11px] text-gray-500">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
