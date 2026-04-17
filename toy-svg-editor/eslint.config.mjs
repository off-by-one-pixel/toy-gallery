import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**"] },
  ...coreWebVitals,
  ...nextTypescript,
  prettier,
];

export default config;
