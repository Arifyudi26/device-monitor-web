/**
 * GET /api/contacts?deviceId=xxx  — ambil kontak dari tabel Contact
 * Data sudah di-persist saat HP kirim hasil fetch_contacts via PATCH /api/commands
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { deviceId, onlyNew } = req.query as Record<string, string>;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });

  const where = {
    deviceId,
    ...(onlyNew === "true" && { isNew: true }),
  };

  const [contacts, total, newCount] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: [{ isNew: "desc" }, { name: "asc" }],
    }),
    db.contact.count({ where: { deviceId } }),
    db.contact.count({ where: { deviceId, isNew: true } }),
  ]);

  return res.status(200).json({
    contacts,
    total,
    newCount,
  });
}
