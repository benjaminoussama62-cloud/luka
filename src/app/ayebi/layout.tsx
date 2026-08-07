import { LoginModal } from "@/components/auth/AuthUI";
import { AyebiWikiBar } from "@/components/ayebi/AyebiWikiBar";
import { ayebiStats, bulkImportRdc } from "@/lib/ayebi/bulk-import";
import { importSeedIfEmpty } from "@/lib/ayebi/db-sqlite";
import { getDb } from "@/lib/storage/database";

function maybeStartBulkImport() {
  importSeedIfEmpty();
  const stats = ayebiStats();
  if (stats.total >= 400) return;

  const ran = getDb()
    .prepare(
      `SELECT id FROM job_runs WHERE job_type = 'ayebi_bulk_import' AND started_at > datetime('now', '-6 hours') LIMIT 1`,
    )
    .get();
  if (ran) return;

  void bulkImportRdc({ maxPerCategory: 120, delayMs: 60 }).catch(() => {});
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
