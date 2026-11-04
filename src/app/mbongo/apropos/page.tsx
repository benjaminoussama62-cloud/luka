import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "À propos — Ayeba Mbongo",
  description: "Ayeba Mbongo, le portefeuille virtuel de l'écosystème Ayeba.",
};

export default function MbongoAproposPage() {
  return (
    <main className="mn-root">
      <div className="mn-landing">
        <div className="mn-center" style={{ textAlign: "left", maxWidth: 640 }}>
          <span className="mn-kicker">À propos</span>
          <h1 className="mn-title" style={{ fontSize: 28 }}>AYEBA MBONGO</h1>
          <p className="mn-sub">
            Mbongo (« argent » en lingala) est le portefeuille virtuel de l'écosystème Ayeba :
            soldes USD &amp; CDF, transferts internes gratuits et instantanés, dépôts et retraits
            via Mobile Money — pensé pour la RDC.
          </p>
          <div style={{ display: "grid", gap: 10, marginTop: 20, fontSize: 14, lineHeight: 1.6 }}>
            <p><b>Ce que Mbongo est :</b> un portefeuille de paiement adossé à votre compte Ayeba, avec PIN dédié, registre comptable immuable et notifications à chaque mouvement.</p>
            <p><b>Ce que Mbongo n'est pas :</b> une banque. Aucun intérêt, aucun placement, aucun crédit. Les dépôts/retraits passent par des partenaires de paiement agréés.</p>
            <p><b>Version :</b> 1.0 — {new Date().getFullYear()} · Produit de l'écosystème Ayeba.</p>
          </div>
          <p style={{ marginTop: 24, fontSize: 13 }}>
            <Link href="/privacy/mbongo" style={{ color: "var(--orange,#e85d04)" }}>Confidentialité</Link>
            {" · "}
            <Link href="/mbongo/conditions" style={{ color: "var(--orange,#e85d04)" }}>Conditions</Link>
            {" · "}
            <Link href="/mbongo" style={{ color: "var(--orange,#e85d04)" }}>Retour au portefeuille</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
