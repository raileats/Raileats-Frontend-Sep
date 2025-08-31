"use client"

export default function Steps() {
  const steps = [
    {
      id: 1,
      title: "Enter PNR & Choose Station",
      desc: "Search by PNR, Train No. or Station",
      icon: "📝",
    },
    {
      id: 2,
      title: "Select Restaurant & Place Order",
      desc: "Browse menus from trusted outlets",
      icon: "🍴",
    },
    {
      id: 3,
      title: "Get Fresh Food Delivered",
      desc: "Your order will be delivered at your seat",
      icon: "🚆",
    },
  ]

  return (
    <section className="bg-gray-50 py-10">
      <h3 className="text-2xl font-bold text-center mb-8">
        Order Food on Train in Easy Steps
      </h3>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className="bg-white p-6 rounded-lg shadow-md text-center"
          >
            <div className="text-4xl mb-4">{step.icon}</div>
            <h4 className="font-semibold">{step.title}</h4>
            <p className="text-sm text-gray-600">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
