/** @type {import("prettier").Config & { tailwindStylesheet?: string }} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles/app.css",
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
};

export default config;
