import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "@components/layout/AppLayout";
import PageMeta from "@components/common/PageMeta";
import type { ContactItem } from "@/pages/api/contacts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "barusan";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-400",
  "bg-purple-500/20 text-purple-400",
  "bg-pink-500/20 text-pink-400",
  "bg-amber-500/20 text-amber-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-sky-500/20 text-sky-400",
  "bg-rose-500/20 text-rose-400",
  "bg-indigo-500/20 text-indigo-400",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function getInitial(name: string | null): string {
  return name?.trim()[0]?.toUpperCase() ?? "?";
}

// ─── Components ───────────────────────────────────────────────────────────────

function ContactRow({ contact, isNew }: { contact: ContactItem; isNew: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${isNew ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${getAvatarColor(contact.name ?? "?")}`}>
        {getInitial(contact.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {contact.name || <span className="text-gray-400 italic">Tanpa nama</span>}
          </span>
          {isNew && (
            <span className="shrink-0 text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
              NEW
            </span>
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
      </div>

      {/* Phone count badge kalau banyak nomor */}
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
  const deviceId = router.query.deviceId as string | undefined;

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [newContactIds, setNewContactIds] = useState<Set<string>>(new Set());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "new">("all");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchContacts = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/contacts?deviceId=${deviceId}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setNewContactIds(new Set((data.newContacts ?? []).map((c: ContactItem) => c.id)));
      setLastSyncAt(data.lastSyncAt ?? null);
      setTotalCount(data.totalCount ?? 0);
      setNewCount(data.newCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) fetchContacts();
  }, [deviceId, fetchContacts]);

  const handleSync = async () => {
    if (!deviceId) return;
    setSyncing(true);
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, command: "fetch_contacts" }),
      });
      // Poll sampai command executed (max 30 detik)
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

  // Filter
  const filtered = contacts.filter((c) => {
    if (tab === "new" && !newContactIds.has(c.id)) return false;
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Kembali
        </button>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">📒 Contacts</h1>
        {deviceId && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {deviceId.slice(0, 16)}…
          </span>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Kontak</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4">
          <p className="text-xs text-blue-500 mb-1">Kontak Baru</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{newCount}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">dibanding sync sebelumnya</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-xs text-gray-500 mb-1">Sync Terakhir</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {lastSyncAt ? timeAgo(lastSyncAt) : "—"}
          </p>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
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

        {/* Tabs */}
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
              {t === "all" ? `Semua (${totalCount})` : `Baru (${newCount})`}
            </button>
          ))}
        </div>

        {/* Showing count */}
        <span className="text-xs text-gray-400">{filtered.length} ditampilkan</span>

        {/* Sync button */}
        <button
          disabled={syncing || !deviceId}
          onClick={handleSync}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors"
        >
          <span className={syncing ? "animate-spin" : ""}>⟳</span>
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
              {tab === "new" ? "Tidak ada kontak baru sejak sync terakhir" : "Belum ada kontak. Klik Sync Kontak untuk memulai."}
            </p>
          </div>
        ) : (
          <div>
            {/* Sticky header */}
            <div className="grid grid-cols-[36px_1fr_1fr_60px] gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div />
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nama</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nomor / Email</p>
              <div />
            </div>
            {filtered.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                isNew={newContactIds.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
