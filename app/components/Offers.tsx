"use client";
import Image from "next/image";

export default function Offers() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4">
      {/* Offer 1 */}
      <div className="bg-blue-500 text-white rounded-lg flex flex-col md:flex-row items-center justify-between p-4 mb-4 shadow">
        <div>
          <h3 className="text-lg font-bold">Get Flat ₹50 + Cashback up to ₹100</h3>
          <p className="text-sm">On orders above ₹399 | *Valid for 5 Orders in a month</p>
        </div>
        <Image
          src="/slides/Offer50.png"
          alt="Offer 50"
          width={150}
          height={100}
          className="rounded-lg"
        />
      </div>

      {/* Offer 2 */}
      <div className="bg-yellow-400 text-black rounded-lg flex flex-col md:flex-row items-center justify-between p-4 shadow">
        <div>
          <h3 className="text-lg font-bold">Flat ₹20 OFF</h3>
          <p className="text-sm">On all orders above ₹250 | Use Coupon REL20</p>
        </div>
        <Image
          src="/slides/Offer20.png"
          alt="Offer 20"
          width={150}
          height={100}
          className="rounded-lg"
        />
      </div>
    </div>
  );
}
