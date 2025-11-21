import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-error',
    'bg-warning',
    'bg-info',
    'bg-success',
    'bg-primary',
    'bg-secondary',
    'bg-accent',
  ],
  plugins: [daisyui],
}
