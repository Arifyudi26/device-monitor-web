/**
 * GET /api/devices — ambil list semua device yang pernah kirim event
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const devices = await db.device.findMany({
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
