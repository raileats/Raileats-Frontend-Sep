// Frontend mapping loop ke andar:
{vendors.map((r: any) => {
  const name = r.RestroName || "Restaurant";

  // ✅ Isko dhyan se dekhiye: Backend 'open_time' bhej raha hai
  const displayOpen = r.open_time || r.OpenTime || "00:00:00";
  const displayClose = r.closed_time || r.ClosedTime || "23:59:00";
  
  const minOrder = r.MinimumOrderValue || 0;

  return (
    <div key={r.RestroCode} className="bg-white p-3 rounded border flex gap-3">
      {/* ... image code ... */}
      <div className="flex-1">
        <div className="font-semibold text-gray-900">{name}</div>
        
        {/* ✅ YE LINE timing dikhayegi */}
        <div className="text-sm text-gray-600 mt-1 font-medium">
          Timing: {displayOpen.substring(0, 5)} - {displayClose.substring(0, 5)}
        </div>
        
        <div className="text-xs text-gray-500">Min. Order: ₹{minOrder}</div>
        {/* ... baki button code ... */}
      </div>
    </div>
  );
})}
