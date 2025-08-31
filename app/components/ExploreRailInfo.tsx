"use client"

export default function ExploreRailInfo() {
  const tools = [
    { title: "Track Live Train", icon: "📍" },
    { title: "Check PNR Status", icon: "🎫" },
    { title: "Platform Locator", icon: "🛤️" },
    { title: "Train Time Table", icon: "📅" },
  ]

  return (
    <section className="py-10 max-w-6xl mx-auto px-4">
      <h3 className="text-2xl font-bold text-center mb-6">
        Explore Railway Information
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {tools.map((tool, idx) => (
          <div
            key={idx}
            className="bg-yellow-100 p-6 rounded-lg shadow-md text-center"
          >
            <div className="text-3xl mb-2">{tool.icon}</div>
            <h4 className="font-semibold text-sm">{tool.title}</h4>
          </div>
        ))}
      </div>
    </section>
  )
}
