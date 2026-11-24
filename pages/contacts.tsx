import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactItem {
  id: string;
  deviceId: string;
  name: string | null;
  phones: string[];
  emails: string[];
  sources: string[];
  isNew: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-500",
  "bg-purple-500/20 text-purple-500",
  "bg-pink-500/20 text-pink-500",
  "bg-amber-500/20 text-amber-500",
  "bg-emerald-500/20 text-emerald-500",
  "bg-sky-500/20 text-sky-500",
  "bg-rose-500/20 text-rose-500",
  "bg-indigo-500/20 text-indigo-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

// ─── Components ───────────────────────────────────────────────────────────────

function ContactRow({ contact }: { contact: ContactItem }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors last:border-0 ${contact.isNew ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(contact.name ?? "?")}`}>
        {(contact.name?.trim()[0] ?? "?").toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {contact.name || <span className="text-gray-400 italic text-xs">Tanpa nama</span>}
          </span>
          {contact.isNew && (
            <span className="shrink-0 text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
          )}
        </div>
        {contact.phones.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            📞 {contact.phones.join("  ·  ")}
          </p>
        )}
        {contact.emails.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            ✉ {contact.emails.join("  ·  ")}
          </p>
        )}
        {contact.sources.length > 0 && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5">
            {contact.sources.map((s) => `🏷 ${s}`).join("  ·  ")}
          </p>
        )}
      </div>

      {contact.phones.length > 1 && (
        <span className="shrink-0 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          +{contact.phones.length - 1}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const router = useRouter();
  const queryDeviceId = router.query.deviceId as string | undefined;

  // Kalau tidak ada deviceId di URL (misal masuk dari menu sidebar), pakai
  // device terakhir yang dipilih di halaman Monitor (disimpan di localStorage).
  const [fallbackDeviceId, setFallbackDeviceId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!queryDeviceId) {
      setFallbackDeviceId(localStorage.getItem("lastSelectedDeviceId") ?? undefined);
    }
  }, [queryDeviceId]);

  const deviceId = queryDeviceId ?? fallbackDeviceId;

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "new">("all");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/contacts?deviceId=${deviceId}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
      setNewCount(data.newCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!router.isReady) return;
    if (deviceId) {
      fetchContacts();
    } else {
      setLoading(false);
    }
  }, [router.isReady, deviceId, fetchContacts]);

  const handleSync = async () => {
    if (!deviceId) return;
    setSyncing(true);
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, command: "fetch_contacts" }),
      });
      // Poll sampai ada data baru (max 30 detik)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await fetchContacts();
        if (attempts >= 30) clearInterval(poll);
      }, 1000);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = contacts.filter((c) => {
    if (tab === "new" && !c.isNew) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phones.some((p) => p.includes(q)) ||
      c.emails.some((e) => e.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <PageMeta title="Contacts — Device Monitor" description="Daftar kontak dari perangkat" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">📒 Contacts</h1>
        {deviceId && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-mono">
            {deviceId.slice(0, 20)}…
          </span>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Kontak</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-xs text-blue-500 mb-1">Kontak Baru</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{newCount}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">sync terakhir</p>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor, email…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(["all", "new"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                tab === t
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {t === "all" ? `Semua (${total})` : `Baru (${newCount})`}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400">{filtered.length} ditampilkan</span>

        <button
          disabled={syncing || !deviceId}
          onClick={handleSync}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors"
        >
          <span className={syncing ? "animate-spin inline-block" : ""}>⟳</span>
          {syncing ? "Syncing…" : "Sync Kontak"}
        </button>
      </div>

      {/* ── Contact List ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Memuat kontak…</div>
        ) : !deviceId ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Pilih device terlebih dahulu dari halaman Monitor
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm text-gray-400">
              {tab === "new"
                ? "Tidak ada kontak baru sejak sync terakhir"
                : "Belum ada kontak. Klik Sync Kontak untuk memulai."}
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[36px_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div />
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nama</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nomor / Email</p>
            </div>
            {filtered.map((c) => (
              <ContactRow key={`${c.id}-${c.deviceId}`} contact={c} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
