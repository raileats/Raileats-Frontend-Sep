export default function ProfilePage({ params }: { params: { customerid: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Profile Page</h1>
      <p>Customer ID: {params.customerid}</p>
    </div>
  );
}
