"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

const DISMISS_KEY = "ayeba.announcements.dismissed.v1";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.announcements?.length) setItems(data.announcements);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next.slice(-50)));
    } catch {
      /* private mode */
    }
  }

  return (
    <div className="ayeba-announcements" role="status">
      {visible.map((a) => (
        <div key={a.id} className={`ayeba-announcement ayeba-announcement-${a.severity}`}>
          <div className="ayeba-announcement-text">
            <strong>{a.title}</strong>
            <span>{a.body}</span>
          </div>
          <button type="button" aria-label="Fermer l'annonce" onClick={() => dismiss(a.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
