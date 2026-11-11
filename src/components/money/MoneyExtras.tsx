"use client";

import { useEffect, useState } from "react";

type MoneyExtrasPanel = "convert" | "requests" | "qr" | "limits" | "kyc" | "pinreset" | "card" | null;

async function call(path: string, options?: RequestInit): Promise<Record<string, unknown> & { error?: string }> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data as Record<string, unknown> & { error?: string };
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mn-sheet-back" onClick={onClose}>
      <section className="mn-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="mn-sheet-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        <div className="mn-sheet-body">{children}</div>
      </section>
    </div>
  );
}

function PinField({ value, onChange, label = "Code PIN" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <label className="mn-field">
      <span>{label}</span>
      <input
        inputMode="numeric" autoComplete="off" maxLength={4} value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••" type="password"
      />
    </label>
  );
}

export function ExtrasNav({ onOpen }: { onOpen: (p: NonNullable<MoneyExtrasPanel>) => void }) {
  const items: { id: NonNullable<MoneyExtrasPanel>; label: string }[] = [
    { id: "convert", label: "Convertir" },
    { id: "requests", label: "Demandes" },
    { id: "qr", label: "Ma carte QR" },
    { id: "limits", label: "Plafonds" },
    { id: "card", label: "Carte virtuelle" },
    { id: "kyc", label: "Vérification" },
    { id: "pinreset", label: "PIN oublié" },
  ];
  return (
    <section className="mn-services">
      <span className="mn-kicker">Services</span>
      <div className="mn-services-grid">
        {items.map((i) => (
          <button key={i.id} type="button" className="mn-service" onClick={() => onOpen(i.id)}>
            {i.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function MoneyExtras({ panel, onClose, onDone }: {
  panel: MoneyExtrasPanel;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<"USD" | "CDF">("USD");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [cur, setCur] = useState<"USD" | "CDF">("USD");
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [idType, setIdType] = useState("carte_electeur");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [requests, setRequests] = useState<Array<{ id: string; direction: string; toIdentifier: string; currency: string; amountMinor: number; note: string; mine: boolean }>>([]);
  const [kyc, setKyc] = useState<{ status: string; full_name: string } | null>(null);
  const [kycLoaded, setKycLoaded] = useState(false);
  const [card, setCard] = useState<{ number: string; last4: string; expiry: string; cvv: string; name: string; status: string; partners: string[] } | null>(null);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [partner, setPartner] = useState("sombateka");
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    setErr("");
    if (panel === "convert") call("/api/mbongo/convert").then((d) => setRate(d.rate as number)).catch(() => {});
    if (panel === "requests") call("/api/mbongo/requests").then((d) => setRequests(d.requests as typeof requests)).catch(() => {});
    if (panel === "kyc") call("/api/mbongo/kyc").then((d) => { setKyc(d.kyc as typeof kyc); setKycLoaded(true); }).catch(() => setKycLoaded(true));
    if (panel === "card") { setRevealed(false); call("/api/mbongo/card").then((d) => { setCard(d.card as typeof card); setCardLoaded(true); }).catch(() => setCardLoaded(true)); }
  }, [panel]);

  if (!panel) return null;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setErr("");
    try {
      await fn();
      onDone(ok);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const pinOk = pin.length === 4;

  if (panel === "qr") {
    return (
      <Sheet title="Ma carte de réception" onClose={onClose}>
        <div className="mn-qr-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/mbongo/qr" alt="QR de réception" width={200} height={200} className="mn-qr-img" />
          <p className="mn-qr-note">Montrez ce code — l'expéditeur vous identifie via votre email ou votre @pseudo.</p>
        </div>
      </Sheet>
    );
  }

  if (panel === "convert") {
    const n = Number(amount.replace(",", "."));
    const out = rate && n > 0 ? (from === "USD" ? n * rate : n / rate) : 0;
    return (
      <Sheet title="Convertir USD ↔ CDF" onClose={onClose}>
        <label className="mn-field">
          <span>De</span>
          <select value={from} onChange={(e) => setFrom(e.target.value as "USD" | "CDF")}>
            <option value="USD">USD</option>
            <option value="CDF">CDF</option>
          </select>
        </label>
        <label className="mn-field">
          <span>Montant</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        {rate ? (
          <p className="mn-hint">Taux : 1 USD ≈ {rate.toLocaleString("fr-FR")} FC → vous recevrez ≈ {out.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {from === "USD" ? "FC" : "USD"}</p>
        ) : null}
        <PinField value={pin} onChange={setPin} />
        {err && <p className="mn-err">{err}</p>}
        <button type="button" className="mn-btn-primary" disabled={busy || !pinOk || !(n > 0)}
          onClick={() => run(() => call("/api/mbongo/convert", { method: "POST", body: JSON.stringify({ from, amount, pin }) }), "Conversion effectuée")}>
          {busy ? "…" : "Convertir"}
        </button>
      </Sheet>
    );
  }

  if (panel === "requests") {
    return (
      <Sheet title="Demandes d'argent" onClose={onClose}>
        <details className="mn-req-new">
          <summary>Nouvelle demande</summary>
          <label className="mn-field"><span>À (email/@pseudo/tél)</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@ami ou nom@mail" /></label>
          <label className="mn-field"><span>Montant</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="mn-field"><span>Devise</span>
            <select value={cur} onChange={(e) => setCur(e.target.value as "USD" | "CDF")}><option>USD</option><option>CDF</option></select>
          </label>
          <label className="mn-field"><span>Note (optionnel)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} /></label>
          <button type="button" className="mn-btn" disabled={busy}
            onClick={() => run(() => call("/api/mbongo/requests", { method: "POST", body: JSON.stringify({ to, amount, currency: cur, note }) }), "Demande envoyée")}>
            Créer la demande
          </button>
        </details>
        {requests.length === 0 ? <p className="mn-hint">Aucune demande en attente.</p> : requests.map((r) => (
          <div key={r.id} className="mn-req">
            <div>
              <b>{r.direction === "in" ? "Reçue de" : "Envoyée à"} {r.toIdentifier}</b>
              <small>{(r.amountMinor / 100).toLocaleString("fr-FR")} {r.currency === "USD" ? "USD" : "FC"} {r.note ? `· ${r.note}` : ""}</small>
            </div>
            {r.direction === "in" ? (
              <div className="mn-req-actions">
                <PinField value={pin} onChange={setPin} label="PIN pour payer" />
                <button type="button" className="mn-btn" disabled={busy || !pinOk}
                  onClick={() => run(() => call(`/api/mbongo/requests/${r.id}`, { method: "POST", body: JSON.stringify({ action: "pay", pin }) }), "Payé")}>
                  Payer
                </button>
                <button type="button" className="mn-btn mn-btn-ghost" onClick={() => run(() => call(`/api/mbongo/requests/${r.id}`, { method: "POST", body: JSON.stringify({ action: "decline" }) }), "Refusée")}>
                  Refuser
                </button>
              </div>
            ) : (
              <button type="button" className="mn-btn mn-btn-ghost" onClick={() => run(() => call(`/api/mbongo/requests/${r.id}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) }), "Annulée")}>
                Annuler
              </button>
            )}
          </div>
        ))}
        {err && <p className="mn-err">{err}</p>}
      </Sheet>
    );
  }

  if (panel === "limits") {
    return (
      <Sheet title="Plafonds" onClose={onClose}>
        <ul className="mn-limits">
          <li><b>Par opération</b><span>10 000 USD · 20 000 000 FC</span></li>
          <li><b>Par jour</b><span>25 000 USD · 50 000 000 FC</span></li>
          <li><b>Transferts internes</b><span>Gratuits, instantanés</span></li>
          <li><b>Mobile Money</b><span>Frais de l'opérateur en sus</span></li>
        </ul>
      </Sheet>
    );
  }

  if (panel === "kyc") {
    if (!kycLoaded) return <Sheet title="Vérification d'identité" onClose={onClose}><p>Chargement…</p></Sheet>;
    return (
      <Sheet title="Vérification d'identité" onClose={onClose}>
        {kyc ? (
          <p className="mn-hint">Dossier <b>{kyc.status === "verified" ? "validé" : kyc.status === "rejected" ? "refusé" : "en cours d'examen"}</b> — {kyc.full_name}.</p>
        ) : (
          <>
            <p className="mn-hint">Augmentez vos plafonds et sécurisez votre portefeuille : indiquez vos informations d'identité.</p>
            <label className="mn-field"><span>Nom complet</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label className="mn-field"><span>Date de naissance</span><input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} /></label>
            <label className="mn-field"><span>Pièce d'identité</span>
              <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option value="carte_electeur">Carte d'électeur</option>
                <option value="passeport">Passeport</option>
                <option value="permis">Permis de conduire</option>
              </select>
            </label>
            {err && <p className="mn-err">{err}</p>}
            <button type="button" className="mn-btn-primary" disabled={busy}
              onClick={() => run(() => call("/api/mbongo/kyc", { method: "POST", body: JSON.stringify({ fullName, birthdate, idType }) }), "Dossier envoyé pour examen")}>
              Envoyer
            </button>
          </>
        )}
      </Sheet>
    );
  }

  if (panel === "pinreset") {
    return (
      <Sheet title="Réinitialiser le PIN" onClose={onClose}>
        <p className="mn-hint">Confirmez le mot de passe de votre compte Ayeba pour définir un nouveau code PIN.</p>
        <label className="mn-field"><span>Mot de passe Ayeba</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <PinField value={newPin} onChange={setNewPin} label="Nouveau PIN (4 chiffres)" />
        {err && <p className="mn-err">{err}</p>}
        <button type="button" className="mn-btn-primary" disabled={busy || newPin.length !== 4 || !password}
          onClick={() => run(() => call("/api/mbongo/pin-reset", { method: "POST", body: JSON.stringify({ password, pin: newPin }) }), "PIN réinitialisé")}>
          Réinitialiser
        </button>
      </Sheet>
    );
  }

  if (panel === "card") {
    if (!cardLoaded) return <Sheet title="Carte virtuelle" onClose={onClose}><p>Chargement…</p></Sheet>;
    if (!card) {
      return (
        <Sheet title="Carte virtuelle" onClose={onClose}>
          <p className="mn-hint">Crée ta carte virtuelle Ayeba — liée à ton solde, utilisable chez <b>Sombateka, Omega, Tala, Jemsa</b> et tous les produits Ayeba.</p>
          <PinField value={pin} onChange={setPin} label="Code PIN" />
          {err && <p className="mn-err">{err}</p>}
          <button type="button" className="mn-btn-primary" disabled={busy || !pinOk}
            onClick={() => run(() => call("/api/mbongo/card", { method: "POST", body: JSON.stringify({ action: "issue", pin }) }).then(() => call("/api/mbongo/card").then((d) => { setCard(d.card as typeof card); setCardLoaded(true); })), "Carte créée")}>
            Créer ma carte
          </button>
        </Sheet>
      );
    }
    return (
      <Sheet title="Carte virtuelle" onClose={onClose}>
        <div className="mn-vcard">
          <div className="mn-vcard-top"><span className="mn-vcard-chip" /><span className="mn-vcard-brand">AYEBA</span></div>
          <div className="mn-vcard-num">{card.number}</div>
          <div className="mn-vcard-row"><span>EXP {card.expiry}</span><span>CVV {card.cvv}</span><span>••• {card.last4}</span></div>
          <div className="mn-vcard-name">{card.name || "Carte partenaire Ayeba Mbongo"}</div>
          {card.status !== "active" && <div className="mn-vcard-frozen">Gelée</div>}
        </div>
        {!revealed ? (
          <>
            <PinField value={pin} onChange={setPin} label="PIN pour afficher les données" />
            {err && <p className="mn-err">{err}</p>}
            <button type="button" className="mn-btn-primary" disabled={busy || !pinOk}
              onClick={async () => { setBusy(true); setErr(""); try { const d = await call(`/api/mbongo/card?pin=${pin}`); setCard(d.card as typeof card); setRevealed(true); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } setBusy(false); }}>
              Afficher le numéro
            </button>
          </>
        ) : (
          <>
            <p className="mn-hint">Payer avec la carte — débit direct de ton solde :</p>
            <label className="mn-field"><span>Marchand partenaire</span>
              <select value={partner} onChange={(e) => setPartner(e.target.value)}>
                <option value="sombateka">Sombateka</option>
                <option value="omega">Omega</option>
                <option value="tala">Tala</option>
                <option value="jemsa">Jemsa</option>
                <option value="ayeba">Produits Ayeba</option>
              </select>
            </label>
            <label className="mn-field"><span>Montant</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
            <label className="mn-field"><span>Devise</span>
              <select value={cur} onChange={(e) => setCur(e.target.value as "USD" | "CDF")}>
                <option value="USD">USD</option><option value="CDF">CDF</option>
              </select>
            </label>
            {!otpId ? (
              <>
                {err && <p className="mn-err">{err}</p>}
                <button type="button" className="mn-btn-primary" disabled={busy || !amount}
                  onClick={async () => { setBusy(true); setErr(""); try { const d = await call("/api/mbongo/card", { method: "POST", body: JSON.stringify({ action: "spend", partner, amount, currency: cur }) }); setOtpId(String(d.otpId)); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } setBusy(false); }}>
                  Recevoir le code de paiement
                </button>
              </>
            ) : (
              <>
                <p className="mn-hint">Un code à usage unique vient d'être envoyé sur ton <b>Ayeba Mail</b> — valable 5 minutes.</p>
                <label className="mn-field"><span>Code reçu par mail (6 chiffres)</span>
                  <input inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} />
                </label>
                {err && <p className="mn-err">{err}</p>}
                <button type="button" className="mn-btn-primary" disabled={busy || otpCode.length !== 6}
                  onClick={() => run(() => call("/api/mbongo/card", { method: "POST", body: JSON.stringify({ action: "confirm", otpId, code: otpCode }) }), "Paiement effectué")}>
                  Confirmer le paiement
                </button>
              </>
            )}
            <button type="button" className="mn-btn-ghost" disabled={busy}
              onClick={() => run(() => call("/api/mbongo/card", { method: "POST", body: JSON.stringify({ action: card.status === "active" ? "freeze" : "unfreeze" }) }).then(() => call("/api/mbongo/card").then((d) => setCard(d.card as typeof card))), card.status === "active" ? "Carte gelée" : "Carte réactivée")}>
              {card.status === "active" ? "Geler la carte" : "Réactiver la carte"}
            </button>
          </>
        )}
      </Sheet>
    );
  }

  return null;
}
