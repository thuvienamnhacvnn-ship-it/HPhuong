import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 xuất thẳng flat config. Không dùng FlatCompat: bọc lại
 * qua eslintrc làm ESLint 9 nổ với "Converting circular structure to JSON".
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "data/**", "drizzle/**", "public/**"] },
];

export default config;
