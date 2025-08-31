export default function Steps() {
  const steps = [
    { icon: "🚉", title: "Enter PNR & Choose Station" },
    { icon: "🍴", title: "Select Restaurant & Create Order" },
    { icon: "🚆", title: "Get Food Delivery in Train" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 px-4">
      <h2 className="text-center font-bold text-2xl mb-6">Order Food on Train in Easy Steps</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        {steps.map((step, i) => (
          <div key={i} className="p-6 bg-white rounded-lg shadow">
            <div className="text-4xl">{step.icon}</div>
            <h3 className="mt-2 font-semibold">{step.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
