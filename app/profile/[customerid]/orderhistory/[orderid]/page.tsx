export default function OrderDetailsPage({ params }: { params: { customerid: string, orderid: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Order Details</h1>
      <p>Customer ID: {params.customerid}</p>
      <p>Order ID: {params.orderid}</p>
    </div>
  );
}
