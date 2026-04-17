import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
      RESEND_API_KEY: 'test',
      RESEND_WEBHOOK_SECRET: 'test',
      CALENDLY_WEBHOOK_SECRET: 'test',
      ALLOWED_ORIGIN: 'http://localhost:8888',
    },
  },
})
