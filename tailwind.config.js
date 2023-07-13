/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        foreground: 'hsl(var(--color-foreground) / <alpha-value>)',
        background: 'hsl(var(--color-background) / <alpha-value>)',
        invalid: 'hsl(var(--color-invalid) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
