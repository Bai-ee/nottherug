# Source before build/e2e. Throwaway values, shell only.
export FIREBASE_ADMIN_PROJECT_ID=ci-build
export FIREBASE_ADMIN_CLIENT_EMAIL=ci-build@ci-build.iam.gserviceaccount.com
export FIREBASE_ADMIN_PRIVATE_KEY="$(openssl genrsa 2048 2>/dev/null | awk '{printf "%s\\n", $0}')"
export NEXT_PUBLIC_FIREBASE_API_KEY=ci-build-api-key
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ci-build.firebaseapp.com
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=ci-build
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ci-build.appspot.com
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=0
export NEXT_PUBLIC_FIREBASE_APP_ID=1:0:web:0
export PUBLIC_BASE_URL=https://example.test
export E2E_PORT=3018
unset E2E_BASE_URL CI
