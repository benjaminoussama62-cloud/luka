import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aide — Ayeba Mbongo",
  description: "Aide et questions fréquentes du portefeuille Ayeba Mbongo.",
};

const FAQ: [string, string][] = [
  [
    "Comment créer mon code PIN ?",
    "À la première ouverture du portefeuille, Mbongo vous demande de choisir 4 chiffres. Ce PIN est exigé pour chaque envoi, retrait et conversion — jamais pour recevoir.",
  ],
  [
    "J'ai oublié mon PIN, que faire ?",
    "Dans le portefeuille : Services → « PIN oublié ». Confirmez le mot de passe de votre compte Ayeba puis choisissez un nouveau code.",
  ],
  [
    "Les transferts sont-ils gratuits ?",
    "Oui — entre portefeuilles Ayeba, les transferts sont instantanés et sans frais, en USD comme en CDF.",
  ],
  [
    "Comment déposer ou retirer via Mobile Money ?",
    "Depuis l'accueil : Déposer ou Retirer, choisissez l'opérateur, validez avec votre PIN. Les frais de l'opérateur s'appliquent uniquement sur ces opérations — jamais sur les transferts internes.",
  ],
  [
    "Comment convertir USD ↔ CDF ?",
    "Services → Convertir. Le taux du jour est affiché avant validation ; la conversion est instantanée et inscrite dans l'historique.",
  ],
  [
    "Quels sont les plafonds ?",
    "10 000 USD / 20 000 000 FC par opération, 25 000 USD / 50 000 000 FC par jour. La vérification d'identité (Services → Vérification) peut relever ces limites.",
  ],
  [
    "Mon argent est-il en sécurité ?",
    "Chaque mouvement exige votre PIN, est inscrit dans un registre comptable immuable et notifié par email. En cas de doute : Paramètres → gelez le portefeuille, puis contactez le support.",
  ],
  [
    "Comment supprimer mon portefeuille ?",
    "Paramètres → « Fermer le portefeuille », ou directement sur ayeba.app/mbongo/suppression. Vos soldes doivent être à zéro ou transférés au préalable.",
  ],
];

export default function MbongoAidePage() {
  return (
    <main className="mn-root">
      <div className="mn-landing">
        <div className="mn-center" style={{ textAlign: "left", maxWidth: 640 }}>
          <span className="mn-kicker">Aide &amp; questions fréquentes</span>
          <h1 className="mn-title" style={{ fontSize: 28 }}>AYEBA MBONGO — AIDE</h1>
          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {FAQ.map(([q, a]) => (
              <details key={q} className="mn-faq">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <p style={{ marginTop: 24 }}>
            Un problème non résolu ?{" "}
            <Link href="/support" style={{ color: "var(--orange,#e85d04)" }}>Contacter le support</Link>
            {" · "}
            <Link href="/mbongo" style={{ color: "var(--orange,#e85d04)" }}>Retour au portefeuille</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
