import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prevent hydration issues
      "react/no-unstable-nested-components": "error",
      "react/no-danger-with-children": "error",
      "@next/next/no-img-element": "error",
      // Prevent non-deterministic rendering
      "no-new-date": "off", // Will be custom rule
      "no-math-random": "off", // Will be custom rule
    },
  },
  {
    // Custom rules for hydration safety
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Avoid new Date() in render - use props or useEffect for SSR safety"
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "Avoid Math.random() in render - use stable keys or useEffect for SSR safety"
        },
        {
          selector: "BinaryExpression[operator='!=='][left.left.name='window'][left.property.name='undefined']",
          message: "Avoid typeof window !== 'undefined' in render - use useEffect for client-only code"
        },
        {
          selector: "ConditionalExpression[test.type='BinaryExpression'][test.operator='!=='][test.left.left.name='window']",
          message: "Conditional rendering based on window existence causes hydration mismatches"
        },
        {
          selector: "IfStatement[test.type='BinaryExpression'][test.operator='!=='][test.left.left.name='window']",
          message: "Conditional rendering based on window existence causes hydration mismatches"
        },
        {
          selector: "BinaryExpression[operator='==='][left.left.name='window'][left.property.name='undefined']",
          message: "Avoid typeof window === 'undefined' in render - use useEffect for client-only code"
        },
        {
          selector: "UnaryExpression[operator='typeof'][argument.name='window']",
          message: "Avoid typeof window checks in render - causes hydration mismatches. Use useEffect for client-only code"
        },
        {
          selector: "ConditionalExpression[test.property.name='isDisabled']:has(ReturnStatement)",
          message: "Avoid conditional wrapper elements in SSR components - use stable outer wrapper with conditional inner content"
        },
      ],
    },
  },
];

export default eslintConfig;
