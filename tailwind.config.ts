import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          bg: 'var(--tg-theme-bg-color, #34a6f1)',
          text: 'var(--tg-theme-text-color, #000000)',
          hint: 'var(--tg-theme-hint-color, #80da64)',
          link: 'var(--tg-theme-link-color, #44f84d)',
          button: 'var(--tg-theme-button-color, #2481cc)',
          buttonText: 'var(--tg-theme-button-text-color, #ffffff)',
          secondaryBg: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
        },
      },
    },
  },
  plugins: [],
}

export default config
