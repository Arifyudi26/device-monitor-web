/**
 * /api/realtime
 *
 * GET  — SSE stream untuk web dashboard (subscribe realtime state per device)
 * POST — HP push realtime state (battery_state, app_background) tanpa masuk DB
 *
 * Realtime state disimpan in-memory (Map) dan di-push ke semua SSE subscriber.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

// ─── In-memory state ──────────────────────────────────────────────────────────

export interface RealtimeDeviceState {
  deviceId: string;
  batteryLevel: number | null;
  batteryState: string | null;   // charging, full, unplugged, unknown
  appState: string | null;       // active, background
  updatedAt: string;
}

// deviceId → current state
const deviceStates = new Map<string, RealtimeDeviceState>();

// SSE subscribers: deviceId "all" atau deviceId spesifik
// Set of response writers
type SseClient = { res: NextApiResponse; deviceFilter: string };
const sseClients = new Set<SseClient>();

export function getRealtimeState(deviceId: string): RealtimeDeviceState | undefined {
  return deviceStates.get(deviceId);
}

export function getAllRealtimeStates(): RealtimeDeviceState[] {
  return Array.from(deviceStates.values());
}

function pushToClients(state: RealtimeDeviceState) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    if (client.deviceFilter === "all" || client.deviceFilter === state.deviceId) {
      try {
        client.res.write(data);
        // flush — needed for Node.js HTTP compression
        if (typeof (client.res as unknown as { flush?: () => void }).flush === "function") {
          (client.res as unknown as { flush: () => void }).flush();
        }
      } catch {
        sseClients.delete(client);
      }
    }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return handleSSE(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── GET: SSE stream untuk web dashboard ─────────────────────────────────────

function handleSSE(req: NextApiRequest, res: NextApiResponse) {
  const deviceFilter = (req.query.deviceId as string) || "all";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Kirim state awal semua device (atau device yg dipilih)
  const initial =
    deviceFilter === "all"
      ? getAllRealtimeStates()
      : deviceStates.has(deviceFilter)
      ? [deviceStates.get(deviceFilter)!]
      : [];

  for (const state of initial) {
    res.write(`data: ${JSON.stringify(state)}\n\n`);
  }

  // Heartbeat tiap 20 detik agar koneksi tidak di-close proxy
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 20_000);

  const client: SseClient = { res, deviceFilter };
  sseClients.add(client);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
}

// ─── POST: HP push realtime state ────────────────────────────────────────────

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { deviceId, batteryLevel, batteryState, appState } = req.body as {
      deviceId: string;
      batteryLevel?: number;
      batteryState?: string;
      appState?: string;
    };

    if (!deviceId) {
      return res.status(400).json({ error: "deviceId required" });
    }

    const existing = deviceStates.get(deviceId) ?? {
      deviceId,
      batteryLevel: null,
      batteryState: null,
      appState: null,
      updatedAt: new Date().toISOString(),
    };

    const updated: RealtimeDeviceState = {
      ...existing,
      deviceId,
      ...(batteryLevel !== undefined && { batteryLevel }),
      ...(batteryState !== undefined && { batteryState }),
      ...(appState !== undefined && { appState }),
      updatedAt: new Date().toISOString(),
    };

    deviceStates.set(deviceId, updated);

    // Persist ke DB (kolom realtime di Device)
    await db.device.updateMany({
      where: { id: deviceId },
      data: {
        ...(batteryLevel !== undefined && { batteryLevel }),
        ...(batteryState !== undefined && { batteryState }),
        ...(appState !== undefined && { appState }),
      },
    });

    // Push ke semua SSE subscriber
    pushToClients(updated);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[POST /api/realtime]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
