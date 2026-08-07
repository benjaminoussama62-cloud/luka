import { LoginModal } from "@/components/auth/AuthUI";
import { AyebiWikiBar } from "@/components/ayebi/AyebiWikiBar";
import { ayebiStats, bulkImportRdc } from "@/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "@/lib/ayebi/db-sqlite";
import { getDb, getDbMode } from "@/lib/storage/database";

function maybeStartBulkImport() {
  // Never run side-effects during `next build` static generation.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (getDbMode() === "memory") return;

  try {
    importSeedIfEmpty();
    const stats = ayebiStats();
    if (stats.total >= 400) return;

    const ran = getDb()
      .prepare(
        `SELECT id FROM job_runs WHERE job_type = 'ayebi_bulk_import' AND started_at > datetime('now', '-6 hours') LIMIT 1`,
      )
      .get();
    if (ran) return;

    void bulkImportRdc({ maxPerCategory: 80, maxImport: 40, delayMs: 40 }).catch(() => {});
  } catch {
    /* DB optional on serverless */
  }
}

export default function AyebiLayout({ children }: { children: React.ReactNode }) {
  maybeStartBulkImport();

  return (
    <>
      <AyebiWikiBar />
      {children}
      <LoginModal />
    </>
  );
}
