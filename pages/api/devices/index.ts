/**
 * GET /api/devices — ambil list semua device yang pernah kirim event
 * Kalau ada userId di query, filter by user (hanya device milik user tsb)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.query as Record<string, string>;

    const devices = await db.device.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { events: true } },
        events: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { timestamp: true, type: true },
        },
      },
    });

    return res.status(200).json({ devices });
  } catch (error) {
    console.error("[GET /api/devices]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
