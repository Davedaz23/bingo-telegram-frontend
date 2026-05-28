import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00beac',
          secondary: '#009b8c',
          bg: '#e8f5f3',
          'bg-dark': '#dceeea',
          hint: '#7fbcb4',
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
