import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Scripts CommonJS Electron (processus principal, preloads, builders) :
  // require() y est le mécanisme de module légitime — la règle
  // no-require-imports ne vise que le code TypeScript/Next.
  {
    files: ["desktop/**/*.js", "desktop/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacts de build du navigateur Electron (binaires + copie du code).
    "desktop/**/dist/**",
  ]),
]);

export default eslintConfig;
