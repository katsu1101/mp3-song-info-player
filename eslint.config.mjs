// eslint.config.mjs
import {defineConfig, globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

export default defineConfig([
  // Next.js (Flat Config)
  ...nextVitals,
  ...nextTs,

  // 重複関数の検知
  {
    plugins: {sonarjs},
    rules: {
      "sonarjs/no-identical-functions": "warn",
    },
  },

  // 必要なものだけ ignore（eslint-config-next の既定 ignore を上書きしたいなら残す）
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
