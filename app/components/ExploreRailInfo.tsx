export default function ExploreRailInfo() {
  const info = [
    { title: "Track Live Train", icon: "🚆" },
    { title: "Check PNR Status", icon: "📄" },
    { title: "Platform Locator", icon: "📍" },
    { title: "Train Time Table", icon: "🕒" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 px-4">
      <h2 className="text-center font-bold text-2xl mb-6">Explore Railway Information</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {info.map((item, i) => (
          <div key={i} className="p-6 bg-white rounded-lg shadow">
            <div className="text-4xl">{item.icon}</div>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
