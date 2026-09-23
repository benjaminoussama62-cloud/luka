import { NextResponse } from "next/server";
import { createBackupSnapshot, listBackups } from "@/lib/backup";
import { getDb } from "@/lib/storage/database";
import { isCronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

function run() {
  const startedAt = new Date().toISOString();
  const snap = createBackupSnapshot();
  getDb()
    .prepare(
      `INSERT INTO job_runs (job_type, status, detail, started_at, finished_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "cron_backup",
      "done",
      JSON.stringify(snap),
      startedAt,
      new Date().toISOString(),
    );
  return { ok: true, snapshot: snap, recent: listBackups().slice(0, 5) };
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(run());
  } catch (e) {
    console.error("[cron/backup]", e);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
