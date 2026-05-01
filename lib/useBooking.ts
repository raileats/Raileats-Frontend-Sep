import { create } from "zustand";
import { persist } from "zustand/middleware";

/* 🔥 TYPES DEFINE */

type BookingData = {
  train: any;
  journeyDate: string | null;
  boardingStation: any;
  delivery: any;
  restaurant: any;
  items: any[];
  user: any;
};

type BookingState = {
  booking: BookingData;

  setTrain: (data: any) => void;
  setJourney: (date: string, station: any) => void;
  setDelivery: (data: any) => void;
  setRestaurant: (data: any) => void;
  setItems: (items: any[]) => void;
  setUser: (user: any) => void;
  resetBooking: () => void;
};

/* 🔥 STORE */

export const useBooking = create<BookingState>()(
  persist(
    (set) => ({
      booking: {
        train: null,
        journeyDate: null,
        boardingStation: null,
        delivery: null,
        restaurant: null,
        items: [],
        user: null,
      },

      setTrain: (data) =>
        set((state) => ({
          booking: { ...state.booking, train: data },
        })),

      setJourney: (date, station) =>
        set((state) => ({
          booking: {
            ...state.booking,
            journeyDate: date,
            boardingStation: station,
          },
        })),

      setDelivery: (data) =>
        set((state) => ({
          booking: { ...state.booking, delivery: data },
        })),

      setRestaurant: (data) =>
        set((state) => ({
          booking: { ...state.booking, restaurant: data },
        })),

      setItems: (items) =>
        set((state) => ({
          booking: { ...state.booking, items },
        })),

      setUser: (user) =>
        set((state) => ({
          booking: { ...state.booking, user },
        })),

      resetBooking: () =>
        set({
          booking: {
            train: null,
            journeyDate: null,
            boardingStation: null,
            delivery: null,
            restaurant: null,
            items: [],
            user: null,
          },
        }),
    }),
    {
      name: "booking-storage",
    }
  )
);
