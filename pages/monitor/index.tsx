import { useEffect, useState, useCallback } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import PageBreadCrumb from "@components/common/PageBreadCrumb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Device {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  os: string | null;
  osVersion: string | null;
  updatedAt: string;
  _count: { events: number };
  events: { timestamp: string; type: string }[];
}

interface DeviceEvent {
  id: string;
  deviceId: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  device: Device;
}

type EventType =
  | "all"
  | "app_open"
  | "app_background"
  | "app_foreground"
  | "battery_level"
  | "battery_state"
  | "network_change"
  | "location_update"
  | "custom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, "success" | "error" | "warning" | "info" | "primary" | "light"> = {
  app_open: "success",
  app_close: "error",
  app_background: "warning",
  app_foreground: "info",
  battery_level: "warning",
  battery_state: "warning",
  network_change: "primary",
  location_update: "info",
  custom: "light",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function DeviceCard({
  device,
  selected,
  onClick,
}: {
  device: Device;
  selected: boolean;
  onClick: () => void;
}) {
  const lastEvent = device.events[0];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {device.brand ?? ""} {device.model ?? device.id.slice(0, 12)}
        </span>
        <Badge color="success" size="sm">{device._count.events} events</Badge>
      </div>
      <p className="mt-0.5 text-xs text-gray-400 truncate">{device.id}</p>
      {lastEvent && (
        <p className="mt-1 text-xs text-gray-500">
          Last: <span className="text-gray-700 dark:text-gray-300">{lastEvent.type}</span>{" "}
          · {timeAgo(lastEvent.timestamp)}
        </p>
      )}
    </button>
  );
}

function EventRow({ event }: { event: DeviceEvent }) {
  const [open, setOpen] = useState(false);
  const color = EVENT_COLORS[event.type] ?? "light";

  return (
    <>
      <tr
        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <Badge color={color} size="sm">{event.type}</Badge>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          {new Date(event.timestamp).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
          {/* Show preview of data */}
          {event.type === "location_update" && (event.data as Record<string, unknown>).mapsUrl ? (
            <a
              href={(event.data as Record<string, unknown>).mapsUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              📍 Open in Maps
            </a>
          ) : (
            JSON.stringify(event.data).slice(0, 80)
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 text-right whitespace-nowrap">
          {timeAgo(event.timestamp)}
          <span className="ml-2 text-gray-300">{open ? "▲" : "▼"}</span>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50 dark:bg-gray-800/50">
          <td colSpan={4} className="px-4 py-3">
            <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<EventType>("all");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDevices = useCallback(async () => {
    const res = await fetch("/api/devices");
    const data = await res.json();
    setDevices(data.devices ?? []);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30", page: String(page) });
    if (selectedDevice !== "all") params.set("deviceId", selectedDevice);
    if (selectedType !== "all") params.set("type", selectedType);

    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [selectedDevice, selectedType, page]);

  // Initial load
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto refresh tiap 10 detik
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDevices();
      fetchEvents();
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDevices, fetchEvents]);

  // Reset page saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [selectedDevice, selectedType]);

  const totalEvents = devices.reduce((sum, d) => sum + d._count.events, 0);

  return (
    <AppLayout>
      <PageMeta title="Device Monitor" description="Realtime device activity dashboard" />
      <PageBreadCrumb pageTitle="Device Monitor" />

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Total Devices" value={devices.length} />
        <StatCard label="Total Events" value={totalEvents} />
        <StatCard
          label="Last Activity"
          value={
            devices[0]?.events[0]
              ? timeAgo(devices[0].events[0].timestamp)
              : "—"
          }
        />
        <StatCard
          label="Auto Refresh"
          value={autoRefresh ? "ON" : "OFF"}
          sub="every 10 seconds"
        />
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* ── Device List ───────────────────────────────────────────────── */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Devices</h2>
            <button
              onClick={() => { fetchDevices(); fetchEvents(); }}
              className="text-xs text-brand-500 hover:underline"
            >
              Refresh
            </button>
          </div>

          {/* All devices */}
          <button
            onClick={() => setSelectedDevice("all")}
            className={`w-full text-left rounded-xl border p-3 transition-all text-sm ${
              selectedDevice === "all"
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            }`}
          >
            All Devices ({devices.length})
          </button>

          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              selected={selectedDevice === d.id}
              onClick={() => setSelectedDevice(d.id)}
            />
          ))}
        </div>

        {/* ── Events Table ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Filter + controls */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as EventType)}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-1.5"
            >
              <option value="all">All Types</option>
              <option value="app_open">app_open</option>
              <option value="app_background">app_background</option>
              <option value="app_foreground">app_foreground</option>
              <option value="battery_level">battery_level</option>
              <option value="battery_state">battery_state</option>
              <option value="network_change">network_change</option>
              <option value="location_update">location_update</option>
              <option value="custom">custom</option>
            </select>

            <span className="text-sm text-gray-500">
              {total} event{total !== 1 ? "s" : ""}
            </span>

            <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto refresh
            </label>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">When</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        No events yet. Waiting for device...
                      </td>
                    </tr>
                  ) : (
                    events.map((e) => <EventRow key={e.id} event={e} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
