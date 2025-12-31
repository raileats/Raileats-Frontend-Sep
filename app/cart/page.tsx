"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ✅ FIXED IMPORTS
import { getCart } from "@/lib/cart";

import { useCart } from "@/lib/useCart";


export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);

  useEffect(() => {
    setCart(getCart());
  }, []);

  if (!cart || !cart.items.length) {
    return <div className="p-4">Cart is empty</div>;
  }

  const total = cart.items.reduce(
    (sum: number, i: any) => sum + i.qty * i.selling_price,
    0
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Your Cart</h1>

      {cart.items.map((item: any) => (
        <div
          key={item.item_code}
          className="border rounded p-3 flex justify-between"
        >
          <div>
            <div className="font-medium">{item.item_name}</div>
            <div>₹{item.selling_price}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                item.qty -= 1;
                if (item.qty <= 0) {
                  cart.items = cart.items.filter(
                    (i: any) => i.item_code !== item.item_code
                  );
                }
                setCart({ ...cart });
              }}
            >
              −
            </button>

            <span>{item.qty}</span>

            <button
              onClick={() => {
                item.qty += 1;
                setCart({ ...cart });
              }}
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className="font-bold">Total: ₹{total}</div>

      <button
        onClick={() => router.push("/checkout")}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Proceed to Checkout
      </button>
    </div>
  );
}
