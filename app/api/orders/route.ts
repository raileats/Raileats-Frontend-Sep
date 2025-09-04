export async function GET() {
  // TODO: replace with DB later
  const orders = [
    {
      id: "RE-240915-001",
      station: "NDLS",
      date: "2025-09-05",
      amount: 420,
      mode: "Prepaid",
      passenger: "A Kumar",
      mobile: "98xxxxxx12",
      train: "12345",
      coach: "B3",
      seat: "32",
      pnrLast4: "7842",
      bookingDate: "2025-09-04 20:15",
      items: [
        { name: "Veg Thali", qty: 1, price: 250 },
        { name: "Water 1L", qty: 1, price: 30 },
        { name: "Paneer Roll", qty: 1, price: 120 },
      ],
    },
    {
      id: "RE-240916-002",
      station: "CNB",
      date: "2025-09-06",
      amount: 310,
      mode: "COD",
      passenger: "S Sharma",
      mobile: "99xxxxxx45",
      train: "20977",
      coach: "S2",
      seat: "18",
      pnrLast4: "1963",
      bookingDate: "2025-09-05 09:10",
      items: [
        { name: "Paneer Thali", qty: 1, price: 260 },
        { name: "Tea", qty: 1, price: 50 },
      ],
    },
  ];
  return Response.json(orders);
}
