"use client";

import { useState } from "react";

export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="dev-console-field">
      {(label || copied) && (
        <div className="dev-console-field-head">
          {label ? <label>{label}</label> : <span />}
          <button type="button" className="dev-console-copy" onClick={() => void copy()}>
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      )}
      <code className={`dev-console-code ${mono ? "" : "dev-console-code-wrap"}`}>{value}</code>
    </div>
  );
}
