/**
 * GET /api/health — health check untuk test koneksi dari device-monitor app
 */

import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
