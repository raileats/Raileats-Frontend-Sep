export default function OrderHistoryPage({ params }: { params: { customerid: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Order History</h1>
      <p>Showing orders for customer {params.customerid}</p>
    </div>
  );
}
