import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Application lint. The CommonJS brief pipeline and the copy scripts are linted
// separately by `npm run lint:pipeline` — they are Node scripts, not Next code.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    // Data and static asset folders.
    "data/**",
    "dogs/**",
    "logos/**",
    "misc/**",
    "public/**",
    "style-guide/**",
    "updated_images/**",
    "app-assets/**",
    "ignore/**",
    // Linted by lint:pipeline instead.
    "not-the-rug-brief/**",
    "scripts/**",
    // Local agent/editor tooling, never shipped.
    ".agents/**",
    ".claude/**",
    ".impeccable/**",
    ".vercel/**",
    // Test output.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
