export default function Offers() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
      <div className="bg-yellow-200 p-6 rounded-lg shadow">
        <h3 className="font-bold text-xl">🎉 Flat ₹20 OFF</h3>
        <p>On all orders above ₹250</p>
        <span className="block mt-2 text-sm">Use Code: REL20</span>
      </div>
      <div className="bg-yellow-200 p-6 rounded-lg shadow">
        <h3 className="font-bold text-xl">🔥 Flat ₹50 OFF</h3>
        <p>On all orders above ₹500</p>
        <span className="block mt-2 text-sm">Use Code: RE50</span>
      </div>
    </div>
  );
}
