import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0ca3db',
          secondary: '#528b98',
          bg: '#ede7e0',
          'bg-dark': '#e0d8cf',
          hint: '#c39977',
          gold: '#ddc477',
          text: '#1a1a2e',
          white: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

export default config
