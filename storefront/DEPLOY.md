# FlashSRE Storefront — Heroku

- URL: https://flashsre-storefront-3aac81d1aaed.herokuapp.com (Next.js, dtc-starter apps/storefront)
- Backend: https://flashsre-commerce-30123348ca77.herokuapp.com
- Publishable key: pk_a97e4af832f5c63c53874ef0f3b286fbb1abc4f4b80665598ab538737d12c3f5

## Điểm đã vá so với template gốc
1. `next.config.js`: bake fallback NEXT_PUBLIC_MEDUSA_BACKEND_URL / PUBLISHABLE_KEY / DEFAULT_REGION (Heroku build dyno không nhận config vars).
2. `check-env-variables.js`: bỏ require `ansi-colors` (devDependency bị prune khi runtime → crash H10).
3. `package.json`: `start: next start -p $PORT` (Heroku cấp PORT động).

## Backend side (đã làm 1 lần)
- CORS: STORE_CORS/AUTH_CORS thêm origin storefront.
- Search: POST /admin/search-indexes/product/reindex (index "product" phải reindex sau khi seed sản phẩm, nếu không /store/search trả 404 "no active version" → trang store kẹt skeleton).
- Nếu seed/re-seed sản phẩm: chạy lại reindex.

## Deploy lại
git push heroku main
