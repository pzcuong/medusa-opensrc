# FlashSRE incident lab

Tái hiện lỗi cấu hình nghiệp vụ (nhiều team, nhiều campaign cùng cấu hình một sàn) trên Medusa 2.21.2, và để
agent phát hiện, tranh luận xem đó là lỗi nghiệp vụ hay lỗi engine/backend, đề xuất bản sửa và kiểm chứng
trong sandbox trước khi đưa người duyệt.

## Thành phần trong backend (`apps/backend`)

| Phần | Vị trí | Vai trò |
|---|---|---|
| Module `flashsre` | `src/modules/flashsre` | Bảng `config_change` (audit), `campaign_contract`, `check_run`, `agent_run` |
| Audit middleware | `src/lib/flashsre/audit-middleware.ts` | Ghi trước/sau, diff, actor, team cho mọi POST/DELETE vào promotion, campaign, price list, shipping option, product, category, collection, tag, customer group |
| Oracle AirChef | `src/lib/flashsre/invariants.ts` | Contract một SKU chủ lực (`CT-AIRCHEF-1111`) |
| Oracle marketplace | `src/lib/flashsre/marketplace-check.ts` | Contract `marketplace/v1`: kiểm tra tĩnh, ma trận giỏ hàng qua engine khuyến mãi thật (`computeActions`) so với contract ở cấp item, cộng dồn chéo campaign, mâu thuẫn giữa các contract |
| Sandbox | cùng file, chế độ `sandbox` | Áp patch nghiệp vụ lên bản sao bóng của promotion (gắn rule `flashsre_sandbox` mà giỏ thật không bao giờ có) và lên dữ liệu sản phẩm/giá/provider đã nạp; cấu hình live không đổi |
| Workflow | `src/workflows/flashsre/*` | Ghi audit, lưu contract theo phiên bản, kiểm tra + lưu `check_run`, sandbox, lưu hồ sơ agent |
| Job | `src/jobs/flashsre-contract-check.ts` | Kiểm tra mọi contract đã duyệt mỗi 5 phút (chạy khi `MEDUSA_WORKER_MODE` là `shared` hoặc `worker`) |
| Admin API | `src/api/admin/flashsre/*` | `contracts`, `contracts/:id/check`, `contracts/:id/sandbox`, `check-runs`, `config-changes`, `agent-runs`, `teams`, `teams/assign`, `metrics` (Prometheus) |
| Admin UI | `src/admin/routes/flashsre/page.tsx`, `src/admin/components/agent-runs-tab.tsx`, `src/admin/widgets/flashsre-change-history.tsx` | Dashboard (tổng quan, phát hiện, mô phỏng, nhật ký, agent, team) và widget lịch sử thay đổi trên trang promotion/price list/campaign/product |
| Seed team | `src/scripts/seed-flashsre-teams.ts` | 6 tài khoản: merch, sellerops, marketing, logistics, finance, category `@flashsre.dev` |

Loại phát hiện: `CONFIG_DRIFT`, `CROSS_TEAM_CONFLICT`, `CONTRACT_CONFLICT` (hai contract đã duyệt nói ngược nhau),
`CONTRACT_GAP` (contract chưa quy định, vd thứ tự áp khi cộng dồn giữa các campaign), `ENGINE_GAP` (engine không
biểu diễn được contract: thiếu trần giảm giá `AMOUNT_CAP_NOT_ENFORCED`, thứ tự áp `AMOUNT_ORDER_SEMANTICS`),
`MISSING_CONFIG`. Phân loại này nói về sai lệch so với contract; không phát hiện nào được gọi là lỗi lõi Medusa.

## Thế giới marketplace

4 ngành (11 ngành con), 10 shop, 4 loại shop (Mall, Yêu thích+, Yêu thích, Thường), 12 SKU, 5 provider
(GHN, GHTK, Viettel Post trong Freeship Xtra; AhaMove, J&T ngoài chương trình), phân khúc khách mới.
Ba contract do ba team duyệt độc lập, chồng lên cùng catalog:

| Contract | Team | Nội dung |
|---|---|---|
| `CT-1111-MARKETPLACE` | marketing | Flash sale, voucher shop (AirChef, Glow, BabyCare), voucher sàn 10% theo ngành + loại shop, khách mới, Freeship Xtra |
| `CT-BRANDDAY-AIRCHEF` | seller_ops | -20% toàn shop AirChef, được cộng voucher shop/sàn/khách mới/freeship |
| `CT-GIADUNG-WEEK` | category | -8% Gia dụng cho shop Yêu thích và Thường |

## Agent (`incidents/agent/flashsre-agent.mjs`)

Mỗi sự cố: phát hiện mới so với mốc, thu thay đổi cấu hình kể từ mốc (audit) và thay đổi phiên bản contract,
sinh phương án (rollback từng đối tượng, rollback bộ thay đổi của một team, chỉnh promotion về đúng contract),
chạy từng phương án trong sandbox trên cả ba contract (hết lỗi? giữ ưu đãi hợp lệ? sạch hoàn toàn?), rồi tranh
luận Business Analyst / Platform Engineer / Judge. Ràng buộc cứng: chỉ kết luận lỗi nghiệp vụ khi có phép thử
nhân quả trong sandbox; không có thì là `ENGINE_OR_BACKEND`. Mâu thuẫn contract không sửa bằng config mà chuyển
hai chủ contract thống nhất.

Flash sale đắt hơn ngoài giờ flash (`FLASH_NOT_DEARER_THAN_OFF_FLASH`): oracle tính mỗi giỏ hai lần, có và không có các
bảng giá flash của contract; cùng giỏ mà trong giờ flash khách trả nhiều hơn là sai, không cần contract nói. Bản sửa chỉ
được tính khi khách trong giờ flash trả ít đi (xoá khuyến mãi của shop cũng làm cảnh báo biến mất nhưng bị loại). Không
bản sửa cấu hình nào vừa giúp khách vừa giữ đúng mọi điều khoản đã duyệt thì phán `CROSS_TEAM_CONTRADICTION`, `ESCALATE`
cho chủ các điều khoản, kèm từng phương án đã thử và điều khoản nó làm lệch.

Phán quyết: `BUSINESS_MISCONFIG`, `CROSS_TEAM_CONTRADICTION`, `CONTRACT_CONFLICT`, `CONTRACT_GAP`, `UNATTRIBUTED_CHANGE`
(sửa config thì hết lỗi nhưng không có audit nào đụng tới đối tượng và contract không đổi: trạng thái đổi ngoài Admin API,
không đổ cho team nào, chuyển platform), `ENGINE_OR_BACKEND`, `NO_ISSUE`.
Quyền: `AUTO_ELIGIBLE` (lỗi một team, patch thuộc nhóm cho phép), `NEEDS_APPROVAL` (kèm team duyệt), `ESCALATE`.
Agent chỉ đề xuất và kiểm chứng sandbox, không ghi vào cấu hình live.

LLM tùy chọn: `OPENAI_API_KEY` + `FLASHSRE_LLM_MODEL`, hoặc `ANTHROPIC_API_KEY`. Không có key thì tranh luận
chạy bằng luật (baseline B0). Phán quyết của LLM vẫn đi qua ràng buộc nhân quả ở trên.

## Chạy local

```bash
docker run -d --name flashsre-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medusa -p 55432:5432 postgres:16
cd apps/backend
export DATABASE_URL=postgresql://postgres:postgres@localhost:55432/medusa
npx medusa db:migrate
npx medusa user -e admin@flashsre.dev -p <admin-pass>
FLASHSRE_TEAM_PASSWORD=<team-pass> npx medusa exec ./src/scripts/seed-flashsre-teams.ts
MEDUSA_BACKEND_URL=http://localhost:9000 npx medusa develop     # thiếu biến này admin local gọi nhầm production
```

## Kịch bản và agent

```bash
export BASE=http://localhost:9000 EMAIL=admin@flashsre.dev PASSWORD=<admin-pass> FLASHSRE_TEAM_PASSWORD=<team-pass>

# Lab 1: AirChef 11.11 (một SKU, S1-S5, X1-X3)
node incidents/repro-airchef-1111.mjs setup && node incidents/repro-airchef-1111.mjs contract
node incidents/repro-airchef-1111.mjs inject X1 && node incidents/repro-airchef-1111.mjs check

# Lab 2: marketplace nhiều campaign - 119 mẫu, 27 họ (97 lỗi nghiệp vụ + 13 đối chứng không có lỗi, gồm 4 thay đổi lành tính có audit + 9 đổi ngoài luồng)
# Họ OUT_OF_BAND_DB sửa thẳng DB: Heroku dùng `heroku pg:psql -a $FLASHSRE_HEROKU_APP` (mặc định flashsre-commerce), local dùng `psql $DATABASE_URL`;
# hoặc đặt FLASHSRE_DB_CMD="<lệnh> ... -c"
node incidents/marketplace-1111.mjs setup && node incidents/marketplace-1111.mjs contract --write   # --write: xuất toàn văn contract ra incidents/contracts/
node incidents/replay-baseline.mjs                                  # replay giỏ đại diện của phát hiện baseline trên Store API thật
node incidents/marketplace-1111.mjs list
node incidents/marketplace-1111.mjs dataset [--only FAM1,FAM2] [--limit N] [--no-witness]

# Agent
node incidents/agent/flashsre-agent.mjs baseline                   # sau khi setup + contract
node incidents/marketplace-1111.mjs inject GDWEEK_SCOPE-01         # một team cấu hình nhầm
node incidents/agent/flashsre-agent.mjs run --post                 # hồ sơ hiện ở tab Agent
node incidents/marketplace-1111.mjs setup && node incidents/marketplace-1111.mjs contract   # khôi phục
node incidents/agent/flashsre-agent.mjs eval [--only ...] [--limit N] [--post]             # chấm agent trên mọi mẫu
```

## Quy trình dataset có kiểm định (sub-agent)

```bash
# 1. Sinh kịch bản: mỗi mẫu có các khâu (ai làm gì, vì sao hợp lý), chỗ trượt, vì sao không ai thấy (incidents/scenarios/stages.mjs)
node incidents/marketplace-1111.mjs scenarios                 # -> incidents/scenarios/scenarios.json
# 2. Mỗi kịch bản một sub-agent độc lập kiểm định: từng khâu đúng thẩm quyền và hợp lý? lỗi vô tình? vì sao không ai thấy có
#    đáng tin? đúng phạm vi FlashSRE (nghiệp vụ, không phải BE)? nhãn, invariant kỳ vọng, mã inject khớp câu chuyện?
node incidents/agent/audit.mjs scenarios --concurrency 6      # -> incidents/scenarios/audit/<thời điểm>/AUDIT.md, latest.jsonl
# 3. Dataset chỉ nhận kịch bản PASS; mỗi mẫu có giỏ thật qua Store API so với mô phỏng
node incidents/marketplace-1111.mjs dataset --gate
# 4. Agent FlashSRE xử lý từng mẫu (audit trail, phương án, sandbox trên mọi contract, tranh luận), rồi mỗi mẫu một sub-agent
#    kiểm định cách xử lý: phán quyết, chuỗi bằng chứng, phép thử sandbox, bản sửa có đảo ngược quyết định hợp lệ không, ai duyệt
node incidents/agent/flashsre-agent.mjs eval --gate --audit   # -> EVAL.md, HANDLING_AUDIT.md trong thư mục eval
```

Sub-agent chạy bằng `claude -p` headless (không tool, không đọc repo, chỉ thấy hồ sơ được đưa vào, output theo JSON schema),
dùng tài khoản Claude Code đang đăng nhập; hoặc `FLASHSRE_SUBAGENT=anthropic` với `ANTHROPIC_API_KEY`. Model:
`FLASHSRE_SUBAGENT_MODEL` (mặc định sonnet). Chi phí khoảng $0,15-0,25 mỗi mẫu cho mỗi lượt kiểm định.

Mỗi lỗi được inject bằng tài khoản của team gây ra nó, nên audit và dashboard thấy đúng "ai sửa gì".
Kịch bản `CONTRACT_REVISION` và `CONTRACT_CONFIG_LAG` đổi contract; khôi phục bằng lệnh `contract`.

## Dataset và kết quả

- `incidents/dataset/marketplace-1111-<thời điểm>/`: `samples.jsonl` (thứ agent được đọc: mọi bản ghi audit kể
  từ lúc bắt đầu mẫu, phát hiện mới so với baseline kèm phạm vi ảnh hưởng, delta mô phỏng, giỏ hàng thật qua Store
  API), `labels.jsonl` / `labels.csv` (đáp án, chỉ evaluator đọc: họ lỗi, tiêu đề, câu chuyện, team gây lỗi, nhãn,
  nguyên nhân gốc), `baseline.json`, `REPORT.md`. Lưu ý: `sample_id` mang tên họ lỗi; khi chấm một model khác chỉ
  dùng nó làm khoá, đừng đưa cho model.
- `incidents/agent-eval/`: lượt chấm agent mới nhất trên dataset lỗi nghiệp vụ (`EVAL.md`, `eval.jsonl`, hồ sơ
  từng sự cố, `HANDLING_AUDIT.md` / `handling-audit.jsonl`: sub-agent kiểm định cách xử lý từng mẫu).
- `incidents/replay/`: giỏ hàng thật (Store API, gồm khách thuộc nhóm "Khách mới") so với mô phỏng của oracle, từng mã.
- `incidents/contracts/`: toàn văn các contract đang duyệt.
- `incidents/ANALYSIS.md`: có đúng là lỗi nghiệp vụ không? Tiêu chí, chấm từng họ (A/B/C/D), điểm yếu của bằng chứng, đối chứng ngoài luồng.

Trong mô phỏng, `expected_pays` đã trừ cả ưu đãi của campaign khác mà contract cho phép cộng; `amount_comparable=false`
khi có ưu đãi của campaign khác trên giỏ (số tiền khi đó phụ thuộc thứ tự áp, được báo thành `CONTRACT_GAP`).
Số giỏ trong phát hiện là số lượt mô phỏng (SKU x phân khúc x provider), không phải số đơn hàng thật.

## Giới hạn đã biết

- Giỏ hàng mô phỏng dùng `computeActions` với context tự dựng, không đi qua workflow cart, nên không tái hiện
  được lỗi phụ thuộc thứ tự thao tác (S1 trên storefront); case đó cần giỏ hàng thật.
- Sandbox không mô phỏng ngân sách campaign (bản sao bóng không gắn campaign); patch ngân sách chỉ được kiểm tĩnh.
- Audit được ghi ngay sau khi response trả về, không chụp thay đổi đi qua đường ngoài Admin API.
- Phán quyết cross-team dựa trên quyền sở hữu khai báo trong contract và team của người sửa trong audit.
