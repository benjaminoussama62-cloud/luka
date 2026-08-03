"use client";

import { useEffect, useState } from "react";
import { useAyeba } from "@/lib/store";
import type { CanvasTable } from "@/lib/types";

function toCsv(table: CanvasTable) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [table.headers, ...table.rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

export function InteractiveCanvas() {
  const { canvasOpen, setCanvasOpen, response } = useAyeba();
  const [tables, setTables] = useState<CanvasTable[]>([]);

  useEffect(() => {
    if (canvasOpen) setTables(response?.canvas ?? []);
  }, [canvasOpen, response]);

  if (!canvasOpen) return null;

  function updateCell(tableId: string, r: number, c: number, value: string) {
    setTables((prev) =>
      prev.map((t) =>
        t.id !== tableId
          ? t
          : {
              ...t,
              rows: t.rows.map((row, ri) =>
                ri !== r ? row : row.map((cell, ci) => (ci === c ? value : cell)),
              ),
            },
      ),
    );
  }

  function exportExcel(table: CanvasTable) {
    const blob = new Blob([toCsv(table)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-5xl overflow-auto rounded-3xl border border-[var(--line)] bg-[#121216] shadow-[var(--shadow)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[#121216]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--red-hot)]">
              Canevas
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Espace de travail
            </h2>
          </div>
          <button type="button" onClick={() => setCanvasOpen(false)} className="ayeba-chip px-3 py-1.5 text-sm">
            Fermer
          </button>
        </header>

        <div className="space-y-6 p-5">
          {tables.length === 0 && (
            <p className="text-sm text-[var(--ink-muted)]">Aucun tableau pour cette requête.</p>
          )}
          {tables.map((table) => (
            <section key={table.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{table.title}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTables((prev) =>
                        prev.map((t) =>
                          t.id !== table.id
                            ? t
                            : {
                                ...t,
                                rows: [
                                  ...t.rows,
                                  t.headers.map((_, i) => (i === 0 ? "Nouvelle ligne" : "")),
                                ],
                              },
                        ),
                      )
                    }
                    className="ayeba-chip px-3 py-1.5 text-sm"
                  >
                    + Ligne
                  </button>
                  <button
                    type="button"
                    onClick={() => exportExcel(table)}
                    className="rounded-full bg-gradient-to-r from-[var(--red)] to-[#6b7280] px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Exporter Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
                <table className="min-w-full text-left text-sm text-white">
                  <thead className="bg-[rgba(255,255,255,0.04)]">
                    <tr>
                      {table.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold text-[var(--ink-muted)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-[var(--line)]">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1.5">
                            <input
                              value={cell}
                              onChange={(e) => updateCell(table.id, ri, ci, e.target.value)}
                              className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-white outline-none hover:border-[var(--line)] focus:border-[var(--red)]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
