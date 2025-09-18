import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,   // 👈 بدل browser
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",  // 👈 require/exports
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      globals: globals.browser,  // 👈 لو عندك frontend JS
    },
  },
  {
    files: ["**/*.test.js", "**/*.spec.js","__mocks__/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]);

