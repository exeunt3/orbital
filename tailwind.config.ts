import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        field: {
          bg: '#000000',
          panel: '#080808',
          border: '#222222',
          dim: '#333333',
          text: '#e8e4dc',
          muted: '#888880',
          accent: '#444440',
          active: '#d8d4cc',
        },
      },
    },
  },
  plugins: [],
}

export default config
