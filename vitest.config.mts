import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Tests must never reach Firebase, Resend, or a paid model. Handlers run
    // with mocked modules; these placeholders only satisfy env reads that
    // happen at module load.
    env: {
      NODE_ENV: 'test',
      RESEND_API_KEY: 'test-key-not-real',
      RESEND_FROM_EMAIL: 'Test <test@resend.dev>',
      FOUNDER_EMAIL: 'founder@example.test',
      FIREBASE_ADMIN_PROJECT_ID: 'test-project',
      FIREBASE_ADMIN_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.test',
      FIREBASE_ADMIN_PRIVATE_KEY: 'not-a-real-key',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-bucket',
    },
  },
});
