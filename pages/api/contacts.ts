/**
 * GET /api/contacts?deviceId=xxx  — ambil semua kontak terakhir dari device
 * Data kontak diambil dari DeviceCommand terakhir yang executed fetch_contacts
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export interface ContactItem {
  id: string;
  name: string | null;
  phones: string[];
  emails: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { deviceId } = req.query as Record<string, string>;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  // Ambil 2 command fetch_contacts terakhir yang executed
  const commands = await db.deviceCommand.findMany({
    where: { deviceId, command: "fetch_contacts", status: "executed" },
    orderBy: { executedAt: "desc" },
    take: 2,
  });

  if (!commands.length) {
    return res.status(200).json({ contacts: [], newContacts: [], lastSyncAt: null });
  }

  const latest = commands[0];
  const latestResult = latest.result as Record<string, unknown>;
  const contacts: ContactItem[] = (latestResult?.contacts as ContactItem[]) ?? [];

  // Hitung kontak baru dibanding sync sebelumnya
  let newContacts: ContactItem[] = [];
  if (commands[1]) {
    const prevResult = commands[1].result as Record<string, unknown>;
    const prevContacts: ContactItem[] = (prevResult?.contacts as ContactItem[]) ?? [];
    const prevIds = new Set(prevContacts.map((c) => c.id));
    newContacts = contacts.filter((c) => !prevIds.has(c.id));
  }

  return res.status(200).json({
    contacts,
    newContacts,
    lastSyncAt: latest.executedAt,
    totalCount: contacts.length,
    newCount: newContacts.length,
  });
}
