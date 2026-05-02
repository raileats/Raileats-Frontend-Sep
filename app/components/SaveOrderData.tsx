"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/useCart";
import { useAuth } from "@/lib/useAuth";

export default function SaveOrderData({ data }: any) {
  const { items: cartItems } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!data) return;

    // Generate temporary order ID if not exists
    const existingOrder = localStorage.getItem("temp_order");
    const tempOrderId = existingOrder
      ? JSON.parse(existingOrder).orderId
      : `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Collect complete order data
    const completeOrderData = {
      orderId: tempOrderId,
      // Journey Information
      journey: {
        trainNumber: data.train_number || "",
        trainName: data.train_name || "",
        journeyDate: data.date || "",
        boardingStation: data.station_code || "",
        arrivalStation: data.arrival_station || "",
        arrivalTime: data.arrival_time || "",
        arrivalDate: data.delivery_date || data.date || "",
      },
      // Cart Items
      cartItems: cartItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        restroCode: item.restro_code || data.restro_code || "",
        restroName: item.restro_name || data.restro_name || "",
        stationCode: item.station_code || data.station_code || "",
        stationName: item.station_name || data.station_name || "",
      })),
      // User Information
      user: {
        mobile: user?.mobile || "",
        name: user?.name || "",
        email: user?.email || "",
      },
      // Additional Info
      vendorName: data.vendor_name || "",
      stationState: data.station_state || "",
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("temp_order", JSON.stringify(completeOrderData));
    localStorage.setItem("order_data", JSON.stringify(completeOrderData)); // backward compat

    console.log("✅ Order data saved:", completeOrderData);
  }, [data, cartItems, user]);

  return null;
}
