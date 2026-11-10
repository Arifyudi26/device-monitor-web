/**
 * POST /api/devices/link
 * User input kode 4 digit dari APK → device di-link ke akun user.
 * Endpoint ini butuh user login (JWT) karena yang link adalah user dari web.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Harus login
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { code } = req.body as { code?: string };

  if (!code || !/^\d{4}$/.test(code)) {
    return res.status(400).json({ error: "Kode harus 4 digit angka" });
  }

  // Cari device dengan pairing code ini
  const device = await db.device.findUnique({
    where: { pairingCode: code },
  });

  if (!device) {
    return res.status(404).json({ error: "Kode tidak ditemukan atau sudah tidak berlaku" });
  }

  if (device.userId) {
    return res.status(409).json({ error: "Device ini sudah terhubung ke akun lain" });
  }

  // Link device ke user, hapus pairing code (tidak perlu lagi)
  const updated = await db.device.update({
    where: { id: device.id },
    data: {
      userId,
      pairingCode: null,
    },
  });

  return res.status(200).json({
    ok: true,
    device: {
      id: updated.id,
      name: updated.name,
      brand: updated.brand,
      model: updated.model,
    },
  });
}
