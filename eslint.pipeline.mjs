import js from "@eslint/js";
import globals from "globals";

// Lint for the Node-side tooling: the CommonJS daily-brief pipeline and the
// copy extraction/apply scripts. These are not Next.js code, so they do not get
// the Next rule set.
export default [
  {
    files: ["not-the-rug-brief/**/*.js", "scripts/**/*.mjs"],
    ignores: ["not-the-rug-brief/knowledge/**", "not-the-rug-brief/services/**/*.json"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { sourceType: "module" },
  },
  {
    files: ["not-the-rug-brief/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
];
