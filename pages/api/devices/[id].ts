/**
 * DELETE /api/devices/[id]
 * Hapus device beserta seluruh data turunannya: events (termasuk location_update
 * yang disimpan di DeviceEvent.data), commands, dan contacts.
 *
 * Endpoint ini TIDAK didaftarkan sebagai public di middleware.ts — tapi karena
 * middleware mencocokkan "/api/devices" via startsWith (dipakai juga oleh
 * GET /api/devices untuk HP/dashboard), sub-path ini ikut lolos middleware.
 * Makanya auth untuk operasi destruktif ini diverifikasi manual di sini.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

function getUserIdFromRequest(req: NextApiRequest): string | null {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string };
    return payload.id ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query as { id: string };
  if (!id) {
    return res.status(400).json({ error: "Device id required" });
  }

  try {
    const device = await db.device.findUnique({ where: { id } });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Kalau device sudah ter-link ke user, hanya pemiliknya yang boleh hapus.
    // Device yang belum ter-link (userId null) boleh dihapus siapa saja yang login,
    // supaya device "sampah"/belum diklaim tetap bisa dibersihkan dari dashboard.
    if (device.userId && device.userId !== userId) {
      return res.status(403).json({ error: "Kamu tidak punya akses untuk menghapus device ini" });
    }

    // Hapus semua data turunan dulu (foreign key tidak cascade di schema),
    // lalu device-nya sendiri. Dibungkus transaction supaya atomic.
    await db.$transaction([
      db.deviceEvent.deleteMany({ where: { deviceId: id } }),
      db.deviceCommand.deleteMany({ where: { deviceId: id } }),
      db.contact.deleteMany({ where: { deviceId: id } }),
      db.device.delete({ where: { id } }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/devices/[id]]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
