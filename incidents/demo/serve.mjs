#!/usr/bin/env node
// Chạy demo local: node incidents/demo/serve.mjs [port]  ->  http://localhost:5178
// index.html viết theo dạng trang Artifact (không có <html>/<head>), nên server bọc thêm khung tài liệu khi trả về.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5178)
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const SHELL = (body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(DIR, path === '/' ? 'index.html' : path)
  if (!file.startsWith(DIR) || file.endsWith('.test.mjs') || file.endsWith('serve.mjs')) { res.writeHead(404).end(); return }
  try {
    const buf = await readFile(file)
    const type = TYPES[extname(file)] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
    res.end(extname(file) === '.html' ? SHELL(buf.toString('utf8')) : buf)
  } catch {
    res.writeHead(404).end()
  }
}).listen(PORT, () => console.log(`FlashSRE checkout demo: http://localhost:${PORT}`))
