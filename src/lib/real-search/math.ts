import { parseSearchIntent } from "../query-intent";
import type { FeaturedSnippet } from "../types";

/**
 * Parser arithmétique sécurisé — zéro eval/Function().
 * Supporte : +  -  *  /  ^  %  parenthèses, nombres décimaux, négatifs.
 * Grammaire LL(1) :
 *   expr   = term   (('+' | '-') term)*
 *   term   = factor (('*' | '/' | '%') factor)*
 *   factor = base   ('^' factor)?          (associativité droite)
 *   base   = '-' base | '(' expr ')' | number
 */
function parseMathExpr(src: string): number {
  let pos = 0;
  const s = src.replace(/\s+/g, "");

  const peek = () => s[pos] ?? "";
  const consume = () => s[pos++];

  const parseNumber = (): number => {
    let buf = "";
    if (peek() === "-") buf += consume();
    while (/[\d.]/.test(peek())) buf += consume();
    const n = Number(buf);
    if (!Number.isFinite(n) || buf === "" || buf === "-") throw new Error("bad number");
    return n;
  };

  const parseExpr = (): number => parseBinary();

  const parseBinary = (): number => {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const right = parseFactor();
      if ((op === "/" || op === "%") && right === 0) throw new Error("division by zero");
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  };

  const parseFactor = (): number => {
    const base = parseBase();
    if (peek() === "^") {
      consume();
      return Math.pow(base, parseFactor()); // right-associative
    }
    return base;
  };

  const parseBase = (): number => {
    if (peek() === "-") {
      consume();
      return -parseBase();
    }
    if (peek() === "(") {
      consume();
      const val = parseExpr();
      if (peek() !== ")") throw new Error("missing )");
      consume();
      return val;
    }
    return parseNumber();
  };

  const result = parseExpr();
  if (pos !== s.length) throw new Error("unexpected token");
  return result;
}

/**
 * Évaluation réelle — zéro eval/Function(), parser récursif sécurisé :
 *  - arithmétique « 2*(3+4)^2 », « 20% de 150 »
 *  - équation du 1er degré « x = 2+3*x », « 2x+4 = 10 » → solution exacte
 */
export function evalMath(expr: string): string | undefined {
  // Normalise : ^ déjà géré par le parser, % de N → *N/100
  const norm = expr
    .replace(/\^/g, "^") // déjà correct
    .replace(/(\d+(?:\.\d+)?)\s*%\s*de\s*(\d+(?:\.\d+)?)/gi, "($1/100*$2)") // « 20% de 150 »
    .replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)"); // « 20% » seul

  // Équation du 1er degré : ax + b = cx + d
  const eq = norm.match(/^([^=]+)=([^=]+)$/);
  if (eq) {
    const varName = ((eq[1] + eq[2]).match(/[a-z]/i) ?? [])[0];
    if (!varName) return undefined;
    const side = (s: string): { a: number; b: number } | null => {
      const t = s.replace(/\s+/g, "");
      const varRe = new RegExp(`([+-]?[\\d.]*)\\*?${varName}`, "gi");
      let a = 0;
      let b = 0;
      let remaining = t;
      let m: RegExpExecArray | null;
      varRe.lastIndex = 0;
      while ((m = varRe.exec(t)) !== null) {
        const coefStr = m[1].replace(/^[+]/, "");
        const coef = coefStr === "" || coefStr === "+" ? 1 : coefStr === "-" ? -1 : Number(coefStr);
        if (!Number.isFinite(coef)) return null;
        a += coef;
        remaining = remaining.replace(m[0], "");
      }
      remaining = remaining.replace(/^[+]/, "") || "0";
      try { b = parseMathExpr(remaining || "0"); } catch { return null; }
      return { a, b };
    };
    const L = side(eq[1]);
    const R = side(eq[2]);
    if (!L || !R) return undefined;
    const a = L.a - R.a;
    const bVal = R.b - L.b;
    if (a === 0) return bVal === 0 ? `${varName} ∈ ℝ — infinité de solutions` : "Pas de solution";
    const x = bVal / a;
    if (!Number.isFinite(x)) return undefined;
    return `${varName} = ${Number.isInteger(x) ? String(x) : x.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}`;
  }

  // Expression arithmétique pure
  try {
    const val = parseMathExpr(norm);
    if (!Number.isFinite(val)) return undefined;
    return Number.isInteger(val)
      ? String(val)
      : val.toLocaleString("fr-FR", { maximumFractionDigits: 6 });
  } catch {
    return undefined;
  }
}

export function tryMathSnippet(query: string): FeaturedSnippet | undefined {
  const display = query.trim().replace(/[?!.\s]+$/, "");
  const intent = parseSearchIntent(query);
  if (intent.kind !== "math") return undefined;
  const text = evalMath(intent.expr);
  if (!text) return undefined;
  return { title: display, text, url: "#calc", domain: "ayeba" };
}
