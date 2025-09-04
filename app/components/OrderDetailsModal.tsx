"use client";
import Image from "next/image";

export default function OrderDetailsModal({
  order, onClose,
}: { order: any; onClose: () => void }) {
  const subTotal = order.items.reduce((s:any,i:any)=>s + i.qty * i.price, 0);
  const gst = +(subTotal * 0.05).toFixed(2);
  const total = +(subTotal + gst).toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg overflow-hidden">
        {/* Header with centered logo */}
        <div className="relative border-b bg-gray-50">
          <button onClick={onClose} className="absolute left-3 top-3 text-gray-600">✕</button>
          <div className="py-4 flex justify-center">
            {/* use <img> if not using next/image */}
            <Image src="/logo.png" alt="RailEats" width={48} height={48} className="rounded-full animate-bubbleGlow"/>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-center">Order Summary</h3>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info k="Order ID" v={order.id}/>
            <Info k="Booking Date" v={order.bookingDate}/>
            <Info k="Passenger" v={order.passenger}/>
            <Info k="Mobile" v={order.mobile}/>
            <Info k="Train No." v={order.train}/>
            <Info k="Coach/Seat" v={`${order.coach}-${order.seat}`}/>
            <Info k="PNR" v={`xxxxxx${order.pnrLast4}`}/>
            <Info k="Station" v={order.station}/>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
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

        <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-600">
          Delivery on {order.date} • Mode: {order.mode}
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
