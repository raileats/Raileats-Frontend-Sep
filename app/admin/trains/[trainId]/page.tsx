"use client";

import React, { useEffect, useState } from "react";

type TrainRow = {
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  runningDays: string | null;
  StnNumber: number | null;
  StationCode: string | null;
  Distance: string | null;
  Stoptime: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  trains: TrainRow[];
  error?: string;
};

export default function AdminTrainsPage() {
  const [trains, setTrains] = useState<TrainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [searchText, setSearchText] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");

  async function loadTrains(q?: string) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q && q.trim()) {
        params.set("q", q.trim());
      }

      const res = await fetch(`/api/admin/trains?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResponse = await res.json();

      if (!json.ok) {
        console.error("loadTrains failed", json);
        setError("Failed to load trains.");
        setTrains([]);
        return;
      }

      setTrains(json.trains || []);
    } catch (e) {
      console.error("loadTrains error", e);
      setError("Failed to load trains.");
      setTrains([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrains();
  }, []);

  function onSearchClick() {
    setSearchText(pendingSearch);
    loadTrains(pendingSearch);
  }

  function onReset() {
    setPendingSearch("");
    setSearchText("");
    loadTrains("");
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl font-semibold mb-1">Trains</h1>
      <p className="text-sm text-gray-600 mb-4">Manage trains here.</p>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-3">
        <input
          className="border rounded px-3 py-2 flex-1 text-sm"
          placeholder="Search (Train ID / Number / Name / Station)"
          value={pendingSearch}
          onChange={(e) => setPendingSearch(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          onClick={onSearchClick}
          disabled={loading}
        >
          Search
        </button>
        <button
          className="px-3 py-2 rounded border text-sm"
          onClick={onReset}
          disabled={loading && !searchText}
        >
          Reset
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 mb-2">Loading trains…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}

      <div className="border rounded bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Train ID</th>
              <th className="px-3 py-2 text-left">Train Number</th>
              <th className="px-3 py-2 text-left">Train Name</th>
              <th className="px-3 py-2 text-left">Stn No.</th>
              <th className="px-3 py-2 text-left">Station Code</th>
              <th className="px-3 py-2 text-left">Distance</th>
              <th className="px-3 py-2 text-left">Stoptime</th>
              <th className="px-3 py-2 text-left">Running Days</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trains.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-center text-gray-500"
                  colSpan={12}
                >
                  No trains found.
                </td>
              </tr>
            ) : (
              trains.map((t) => {
                const editId = t.trainNumber ?? t.trainId;
                return (
                  <tr key={`${t.trainId}-${t.trainNumber}`} className="border-t">
                    <td className="px-3 py-2 align-top">{t.trainId}</td>
                    <td className="px-3 py-2 align-top">
                      {t.trainNumber ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.trainName ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.StnNumber ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.StationCode ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.Distance ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.Stoptime ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.runningDays ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.status ?? "N/A"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.created_at ? t.created_at.slice(0, 10) : "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {t.updated_at ? t.updated_at.slice(0, 10) : "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {editId ? (
                        <a
                          href={`/admin/trains/${editId}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Edit
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
