// app/Stations/[code]/StationHeaderServer.tsx
export default function StationHeaderServer({ station }: { station: any }) {
  return (
    <div className="mb-6">
      {station?.image_url ? (
        <img src={station.image_url} alt={station.StationName} className="w-full h-48 object-cover rounded" />
      ) : (
        <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center">No image</div>
      )}
      <div className="mt-4">
        <h1 className="text-2xl font-bold">{station.StationCode} — {station.StationName}</h1>
        <p className="text-sm text-gray-600">{station.State} {station.District ? `• ${station.District}` : ""}</p>
      </div>
    </div>
  );
}
