import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Heroku Postgres serves DATABASE_URL as postgres:// and rotates credentials;
// the pg driver expects postgresql:// and Heroku requires TLS connections.
// uselibpqcompat=true keeps sslmode=require from cert-verifying (pg treats it
// as verify-full otherwise and Heroku's chain is not in Node's CA store).
const rawDbUrl = process.env.DATABASE_URL ?? ''
const onHeroku = Boolean(process.env.DYNO)
const databaseUrl = rawDbUrl
  .replace(/^postgres:\/\//, 'postgresql://')
  .concat(
    onHeroku && rawDbUrl && !rawDbUrl.includes('uselibpqcompat=')
      ? (rawDbUrl.includes('?') ? '&' : '?') + 'uselibpqcompat=true' +
        (rawDbUrl.includes('sslmode=') ? '' : '&sslmode=require')
      : ''
    )

// Heroku does not expose config vars to the build dyno, so the admin bundle's
// baked backendUrl must fall back to the real production URL, not localhost.
const backendUrl =
  process.env.MEDUSA_BACKEND_URL ??
  'https://flashsre-commerce-30123348ca77.herokuapp.com'

module.exports = defineConfig({
  projectConfig: {
    databaseUrl,
    http: {
      storeCors: process.env.STORE_CORS ?? 'http://localhost:8000',
      adminCors: process.env.ADMIN_CORS ?? `${backendUrl},http://localhost:9000`,
      authCors: process.env.AUTH_CORS ?? `${backendUrl},http://localhost:8000`,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  admin: {
    backendUrl,
  },
  modules: [
    {
      resolve: "./src/modules/flashsre",
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
  ],
})
