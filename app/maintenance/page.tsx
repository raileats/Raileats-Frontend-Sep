export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">RailEats Maintenance</h1>
        <p className="text-sm text-gray-600 mb-4">
          RailEats.in par abhi kuchh zaroori updates chal rahe hain.
          Thodi der baad dobara try karein. 🙏
        </p>
        <p className="text-xs text-gray-400">
          If you are the site owner, set MAINTENANCE_MODE = false to bring site back online.
        </p>
      </div>
    </main>
  );
}
