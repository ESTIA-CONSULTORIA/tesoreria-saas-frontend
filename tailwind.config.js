/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tokens de las skins (src/core/theme/skins.ts): las pantallas nuevas usan estas clases en vez de slate-*/hex.
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        nav: 'rgb(var(--nav) / <alpha-value>)',
        surface: { 1: 'rgb(var(--surface-1) / <alpha-value>)', 2: 'rgb(var(--surface-2) / <alpha-value>)', 3: 'rgb(var(--surface-3) / <alpha-value>)' },
        field: 'rgb(var(--field) / <alpha-value>)',
        line: 'rgb(var(--border) / <alpha-value>)',
        'line-field': 'rgb(var(--border-field) / <alpha-value>)',
        content: { 1: 'rgb(var(--text-1) / <alpha-value>)', 2: 'rgb(var(--text-2) / <alpha-value>)', 3: 'rgb(var(--text-3) / <alpha-value>)' },
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}