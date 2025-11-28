"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type TrainHead = {
  trainId: number | null;
  trainNumber: number | null;
  trainName: string | null;
  stationFrom: string | null;
  stationTo: string | null;
  runningDays: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TrainRouteRow = {
  id?: number;
  trainId: number;
  trainNumber: number | null;
  trainName: string | null;
  stationFrom: string | null;
  stationTo: string | null;
  runningDays: string | null;
  StnNumber: number | null;
  StationCode: string | null;
  StationName: string | null;
  Arrives: string | null;
  Departs: string | null;
  Stoptime: string | null;
  Distance: string | null;
  Platform: string | null;
  Route: number | null;
  Day: number | null;
};

type ApiResponse = {
  ok: boolean;
  train?: TrainHead;
  route?: TrainRouteRow[];
  error?: string;
  meta?: any;
};

export default function AdminTrainEditPage() {
  const router = useRouter();
  const params = useParams() as { trainId?: string };
  const trainIdParam = params?.trainId;

  const [head, setHead] = useState<TrainHead | null>(null);
  const [routeRows, setRouteRows] = useState<TrainRouteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // ---- Load data ----
  useEffect(() => {
    if (!trainIdParam) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/trains/${trainIdParam}`, {
          cache: "no-store",
        });
        const json: ApiResponse = await res.json();

        if (!json.ok || !json.train || !json.route) {
          console.error("train detail load failed", json);
          setError("Train not found.");
          setHead(null);
          setRouteRows([]);
          return;
        }

        setHead(json.train);
        setRouteRows(json.route);
      } catch (e) {
        console.error("train detail load error", e);
        setError("Failed to load train.");
        setHead(null);
        setRouteRows([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [trainIdParam]);

  // ---- handle basic field change ----
  function updateHead<K extends keyof TrainHead>(key: K, value: TrainHead[K]) {
    setHead((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateRouteRow(
    index: number,
    key: keyof TrainRouteRow,
    value: any,
  ) {
    setRouteRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  }

  // ---- Save ----
  async function onSave() {
    if (!head) return;
    if (!trainIdParam) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        train: head,
        route: routeRows,
      };

      const res = await fetch(`/api/admin/trains/${trainIdParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse = await res.json().catch(() => ({} as any));

      if (!res.ok || !json.ok) {
        console.error("train save failed", json);
        setError("Failed to save train changes.");
        return;
      }

      alert("Train route updated successfully.");
      // optional: reload
      router.refresh();
    } catch (e) {
      console.error("train save error", e);
      setError("Failed to save train changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-root">
        <p className="text-sm text-gray-600">Loading train…</p>
      </div>
    );
  }

  if (!head) {
    return (
      <div className="page-root">
        <p className="text-sm text-red-600">Train not found.</p>
      </div>
    );
  }

  return (
    <div className="page-root">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Edit Train #{head.trainNumber ?? head.trainId ?? ""}
          </h1>
          <p className="text-sm text-gray-600">
            Update train information and route.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => router.push("/admin/trains")}
          >
            Back
          </button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white text-sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Train head form */}
      <section className="border rounded bg-white p-4 mb-4">
        <h2 className="font-semibold mb-3 text-sm">Train Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs mb-1">Train ID</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full bg-gray-100"
              value={head.trainId ?? ""}
              readOnly
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Train Number</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.trainNumber ?? ""}
              onChange={(e) =>
                updateHead(
                  "trainNumber",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs mb-1">Train Name</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.trainName ?? ""}
              onChange={(e) => updateHead("trainName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Status</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.status ?? ""}
              onChange={(e) => updateHead("status", e.target.value)}
              placeholder="e.g. ACTIVE / INACTIVE"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs mb-1">Station From</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.stationFrom ?? ""}
              onChange={(e) => updateHead("stationFrom", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Station To</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.stationTo ?? ""}
              onChange={(e) => updateHead("stationTo", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1">Running Days</label>
            <input
              className="border rounded px-3 py-2 text-sm w-full"
              value={head.runningDays ?? ""}
              onChange={(e) => updateHead("runningDays", e.target.value)}
              placeholder="Mon,Tue,Wed,Thu,Fri,Sat,Sun"
            />
          </div>
          <div className="text-xs text-gray-500 flex items-end">
            Created: {head.created_at?.slice(0, 10) || "-"} &nbsp; | Updated:{" "}
            {head.updated_at?.slice(0, 10) || "-"}
          </div>
        </div>
      </section>

      {/* Route table */}
      <section className="border rounded bg-white p-4">
        <h2 className="font-semibold mb-3 text-sm">Route (stations)</h2>

        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 uppercase text-[10px] text-gray-600">
              <tr>
                <th className="px-2 py-2 text-left">Stn #</th>
                <th className="px-2 py-2 text-left">Code</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Arrives</th>
                <th className="px-2 py-2 text-left">Departs</th>
                <th className="px-2 py-2 text-left">Stop Time</th>
                <th className="px-2 py-2 text-left">Distance</th>
                <th className="px-2 py-2 text-left">Platform</th>
                <th className="px-2 py-2 text-left">Day</th>
              </tr>
            </thead>
            <tbody>
              {routeRows.map((r, idx) => (
                <tr key={r.id ?? idx} className="border-t">
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-16 text-xs"
                      value={r.StnNumber ?? ""}
                      onChange={(e) =>
                        updateRouteRow(
                          idx,
                          "StnNumber",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-20 text-xs"
                      value={r.StationCode ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "StationCode", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-52 text-xs"
                      value={r.StationName ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "StationName", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-20 text-xs"
                      value={r.Arrives ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "Arrives", e.target.value)
                      }
                      placeholder="HH:MM"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-20 text-xs"
                      value={r.Departs ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "Departs", e.target.value)
                      }
                      placeholder="HH:MM"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-24 text-xs"
                      value={r.Stoptime ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "Stoptime", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-20 text-xs"
                      value={r.Distance ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "Distance", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-16 text-xs"
                      value={r.Platform ?? ""}
                      onChange={(e) =>
                        updateRouteRow(idx, "Platform", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="border rounded px-1 py-1 w-16 text-xs"
                      value={r.Day ?? ""}
                      onChange={(e) =>
                        updateRouteRow(
                          idx,
                          "Day",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
