/**
 * POST /api/events  — terima event dari device-monitor app
 * GET  /api/events  — ambil list event untuk dashboard
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

// Event types yang hanya realtime — tidak disimpan ke DB
const REALTIME_ONLY_TYPES = new Set(["app_background", "app_foreground", "battery_state"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── POST: terima event dari HP ───────────────────────────────────────────────

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { events, pairingCode } = req.body as {
      events: {
        id: string;
        type: string;
        timestamp: string;
        data: Record<string, unknown>;
        deviceId: string;
      }[];
      pairingCode?: string;
    };

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "events must be a non-empty array" });
    }

    // Debug: cek apakah semua event dalam satu batch benar-benar punya deviceId yang sama.
    // Kalau tidak, upsert (yang pakai firstEvent.deviceId) tidak akan meng-create device
    // untuk deviceId lain yang ikut terbawa di batch, menyebabkan FK violation di createMany.
    const uniqueDeviceIds = Array.from(new Set(events.map((e) => e.deviceId)));
    if (uniqueDeviceIds.length > 1) {
      console.error("[POST /api/events] Batch contains multiple deviceIds:", uniqueDeviceIds);
    }

    const firstEvent = events[0];
    // Cari event app_open di seluruh batch, bukan cuma events[0] — beberapa event bisa
    // ter-batch bersamaan saat startup (baterai/network/lokasi kepicu paralel), jadi
    // app_open tidak selalu di index 0. Tanpa ini, info device (nama/brand/model/os)
    // bisa tersimpan null kalau app_open bukan event pertama dalam batch.
    const appOpenEvent = events.find((e) => e.type === "app_open");
    const deviceData = (appOpenEvent?.data ?? {}) as Record<string, unknown>;

    // Insert semua event — skip realtime-only types (app_background, battery_state, app_foreground)
    const persistableEvents = events.filter((e) => !REALTIME_ONLY_TYPES.has(e.type));

    // Upsert device dan insert event dibungkus satu transaction supaya atomic.
    // Tanpa ini, dua request POST /api/events yang datang hampir bersamaan (misal
    // retry timer + flush normal) bisa menyebabkan createMany event dieksekusi
    // sebelum upsert device-nya benar-benar commit — menghasilkan error foreign
    // key constraint (DeviceEvent_deviceId_fkey) karena device belum ada di DB.
    await db.$transaction(async (tx) => {
      // Upsert device — simpan pairingCode kalau device belum di-link ke user
      await tx.device.upsert({
        where: { id: firstEvent.deviceId },
        update: {
          updatedAt: new Date(),
          // Perbarui pairing code hanya kalau device belum punya userId (belum linked)
          ...(pairingCode && {
            pairingCode: undefined, // akan di-set lewat raw update di bawah
          }),
          ...(appOpenEvent && {
            name: (deviceData.deviceName as string) ?? undefined,
            brand: (deviceData.brand as string) ?? undefined,
            model: (deviceData.modelName as string) ?? undefined,
            os: (deviceData.os as string) ?? undefined,
            osVersion: (deviceData.osVersion as string) ?? undefined,
          }),
        },
        create: {
          id: firstEvent.deviceId,
          name: (deviceData.deviceName as string) ?? null,
          brand: (deviceData.brand as string) ?? null,
          model: (deviceData.modelName as string) ?? null,
          os: (deviceData.os as string) ?? null,
          osVersion: (deviceData.osVersion as string) ?? null,
          pairingCode: pairingCode ?? null,
        },
      });

      // Update pairing code hanya kalau device belum linked ke user
      if (pairingCode) {
        await tx.device.updateMany({
          where: { id: firstEvent.deviceId, userId: null },
          data: { pairingCode },
        });
      }

      if (persistableEvents.length > 0) {
        await tx.deviceEvent.createMany({
          data: persistableEvents.map((e) => ({
            id: e.id,
            deviceId: e.deviceId,
            type: e.type,
            timestamp: new Date(e.timestamp),
            data: e.data as object,
          })),
          skipDuplicates: true,
        });
      }
    });

    return res.status(200).json({ received: events.length, persisted: persistableEvents.length });
  } catch (error) {
    console.error("[POST /api/events]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET: ambil event untuk dashboard ────────────────────────────────────────

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      deviceId,
      type,
      limit = "50",
      page = "1",
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit), 200);
    const skip = (parseInt(page) - 1) * take;

    const where = {
      ...(deviceId && { deviceId }),
      ...(type && { type }),
    };

    const [events, total] = await Promise.all([
      db.deviceEvent.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take,
        skip,
        include: { device: true },
      }),
      db.deviceEvent.count({ where }),
    ]);

    return res.status(200).json({
      events,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error("[GET /api/events]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
