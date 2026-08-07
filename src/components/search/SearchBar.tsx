"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAyeba } from "@/lib/store";
import { VoiceSearchButton } from "./VoiceSearchButton";

export function SearchBar({ large = false }: { large?: boolean }) {
  const { query, setQuery, search, searching } = useAyeba();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  /** After a launched search, hide suggestions until the user types again. */
  const [typing, setTyping] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeSuggest = useCallback(() => {
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    setTyping(false);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (searching) closeSuggest();
  }, [searching, closeSuggest]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    // Never overlay SERP with suggestions after a search unless user is actively typing.
    if (searching || !focused || !typing || !query.trim()) {
      if (!typing) setOpen(false);
      return;
    }

    timer.current = window.setTimeout(async () => {
      try {
        const history = JSON.parse(sessionStorage.getItem("ayeba-history") || "[]") as string[];
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(query)}&history=${encodeURIComponent(JSON.stringify(history))}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: string[] };
        const list = data.suggestions ?? [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch {
        /* ignore */
      }
    }, 120);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query, searching, focused, typing]);

  const launch = useCallback(
    (q: string) => {
      closeSuggest();
      search(q);
    },
    [closeSuggest, search],
  );

  const onVoice = useCallback(
    (text: string) => {
      setQuery(text);
      launch(text);
    },
    [launch, setQuery],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const pick = (active >= 0 ? suggestions[active] : query).trim();
    if (!pick) {
      inputRef.current?.focus();
      inputRef.current?.closest(".ayeba-glass")?.classList.add("ayeba-shake");
      window.setTimeout(
        () => inputRef.current?.closest(".ayeba-glass")?.classList.remove("ayeba-shake"),
        500,
      );
      return;
    }
    launch(pick);
  }

  const showDropdown =
    open && suggestions.length > 0 && typing && focused && !searching;

  return (
    <div className="relative w-full" ref={boxRef}>
      <form onSubmit={onSubmit} className="w-full">
        <div
          className={`ayeba-glass transition-opacity duration-500 ${
            searching ? "opacity-80" : "opacity-100"
          } ${
            large
              ? "flex flex-col gap-3 rounded-3xl p-3 sm:h-[60px] sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-6 sm:py-0"
              : "flex h-[48px] items-center gap-2 rounded-full px-4"
          }`}
        >
          <div className={`flex min-w-0 flex-1 items-center gap-2 ${large ? "px-1 sm:px-0" : ""}`}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              className={`shrink-0 transition-colors duration-300 ${focused ? "text-[var(--ink)]" : "text-[var(--faint)]"}`}
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setTyping(true);
                setQuery(e.target.value);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit(e as unknown as FormEvent);
                  return;
                }
                if (!open || !suggestions.length) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Escape") setOpen(false);
              }}
              placeholder={large ? "Rechercher le monde entier…" : "Rechercher"}
              className={`w-full bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--faint)] ${
                large ? "text-[16px] tracking-[-0.01em]" : "text-[14px]"
              }`}
              aria-label="Recherche Ayeba"
              aria-autocomplete="list"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  closeSuggest();
                }}
                className="text-[var(--faint)] transition-colors duration-300 hover:text-[var(--ink)]"
                aria-label="Effacer"
              >
                ✕
              </button>
            ) : null}
            <VoiceSearchButton onResult={onVoice} />
          </div>
          <button
            type="submit"
            disabled={searching}
            className={`ayeba-cta w-full shrink-0 sm:w-auto ${large ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"} ${!query.trim() ? "opacity-70" : ""}`}
          >
            {searching ? "…" : "Rechercher"}
          </button>
        </div>
      </form>

      {showDropdown ? (
        <ul className="ayeba-glass absolute z-50 mt-2 w-full overflow-hidden rounded-2xl py-1 animate-fade">
          {suggestions.map((s, i) => {
            const q = query.trim().toLowerCase();
            const idx = s.toLowerCase().indexOf(q);
            return (
              <li key={s}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[14px] transition-colors duration-300 ${
                    i === active
                      ? "bg-white/[0.04] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:bg-white/[0.02] hover:text-[var(--ink)]"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(s);
                    launch(s);
                  }}
                >
                  <span className="text-[var(--faint)]">→</span>
                  <span>
                    {idx >= 0 && q ? (
                      <>
                        {s.slice(0, idx)}
                        <span className="text-[var(--ink)]">{s.slice(idx, idx + q.length)}</span>
                        {s.slice(idx + q.length)}
                      </>
                    ) : (
                      s
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
