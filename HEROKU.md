# FlashSRE Commerce — Heroku Deployment

Medusa v2 (2.21.2) backend + admin, deployed at:
**https://flashsre-commerce-30123348ca77.herokuapp.com**

## App
- Heroku app: `flashsre-commerce` (stack heroku-24, buildpack heroku/nodejs)
- Addon: `heroku-postgresql:essential-0` → `DATABASE_URL`
- Dyno: web = `basic` (512MB). Nếu gặp R14/OOM runtime → nâng `standard-2x`.

## Bố cục
- Monorepo turbo; backend tại `apps/backend` (Medusa + admin dashboard)
- `medusa build` → `apps/backend/.medusa/server` (deploy artifact)

## Cơ chế deploy (buildpacks)
- Build: script `heroku-build` trong root `package.json` chạy trên Heroku build dyno:
  1. `npm run build --workspace @dtc/backend` (biên dịch backend + build admin bằng Vite)
  2. `npm install --omit=dev --prefix apps/backend/.medusa/server` (deps cho artifact)
- Procfile:
  - `release: sh -c "cd apps/backend/.medusa/server && npx medusa db:migrate"`
  - `web: sh -c "cd apps/backend/.medusa/server && npx medusa start"`

## Config vars (heroku config)
- `MEDUSA_WORKER_MODE=server`, `DISABLE_MEDUSA_ADMIN=false`, `NODE_ENV=production`
- `JWT_SECRET`, `COOKIE_SECRET` (random 32B)
- `MEDUSA_BACKEND_URL=https://flashsre-commerce-30123348ca77.herokuapp.com`
- `ADMIN_CORS=<APP_URL>`, `AUTH_CORS=<APP_URL>,http://localhost:8000`, `STORE_CORS=http://localhost:8000`
- `DATABASE_URL` (tự cấp bởi addon)

## Các bẫy đã gặp & fix
1. **OOM build**: từng set `NODE_OPTIONS=--max-old-space-size=460` → cap cả build dyno (2GB) làm Vite build admin OOM. Đã unset.
2. **TLS Postgres**: pg driver xử lý `sslmode=require` như `verify-full` → `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. Fix: nối `uselibpqcompat=true&sslmode=require` vào DATABASE_URL trong `medusa-config.ts`.
3. **Auth provider**: scaffold 2.21 không tự đăng ký provider → admin không có form login. Fix: khai báo module `auth` + provider `@medusajs/auth-emailpass` trong config.
4. **backendUrl của admin**: Heroku không cấp config vars cho build dyno đúng như kỳ vọng → admin bundle bị bake `http://localhost:9000` → dashboard gọi API sai nơi, hiện tip "Register an auth provider". Fix: fallback literal URL production trong `medusa-config.ts`.

## Admin
- URL: `https://flashsre-commerce-30123348ca77.herokuapp.com/app`
- Tài khoản: `admin@flashsre.dev` / mật khẩu: hỏi team (không ghi vào repo)
- Health: `GET /health` → `OK`

## Tạo user mới
```bash
heroku run --app flashsre-commerce \
  "cd apps/backend/.medusa/server && npx medusa user -e <email> -p <password>"
```

## Redis (chưa cần)
Chưa cài. Khi cần (multi-dyno/event bus/cache/durable workflow):
```bash
heroku addons:create heroku-redis:mini --app flashsre-commerce
heroku config:set REDIS_URL=$(/heroku config:get REDIS_URL)  # addon tự set
```
Rồi đăng ký `event-bus-redis`, `cache-redis`, `workflow-engine-redis`, `locking` redis provider trong `medusa-config.ts` với key `redisUrl`.

## Deploy lại
```bash
git push heroku main
```
