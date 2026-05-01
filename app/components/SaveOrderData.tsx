"use client";

import { useEffect } from "react";

export default function SaveOrderData({ data }: any) {
  useEffect(() => {
    if (data) {
      localStorage.setItem("order_data", JSON.stringify(data));
    }
  }, [data]);

  return null;
}
