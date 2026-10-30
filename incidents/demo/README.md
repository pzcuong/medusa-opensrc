# FlashSRE Checkout 11.11

Demo tương tác: một thay đổi giá hoặc rule khuyến mãi tưởng có lợi có thể làm khách mất voucher/freeship và trả nhiều tiền hơn. Có hai bản, không cần cài gói nào (Node 22+).

## Bản chạy trên Medusa (dùng để demo)

```bash
BASE=https://flashsre-commerce-30123348ca77.herokuapp.com PASSWORD=<admin> FLASHSRE_TEAM_PASSWORD=<team> \
  node incidents/demo/medusa-server.mjs          # http://localhost:5179
```

- **Điện thoại (storefront kiểu Medusa):** mỗi lần tính là một giỏ mới tạo qua Store API. Giá, nguồn giá (price list), mã được áp, phí ship, tổng tiền là số Medusa trả về; không có số tính tay.
- **Demo Control:** "Nạp kịch bản" chạy `setup` của lab cho sạch, rồi từng team cấu hình bằng tài khoản của mình (Seller Ops tạo khuyến mãi shop, Merchandising chốt giá flash và cập nhật contract...). Audit log của FlashSRE ghi đúng team.
- **Đồng hồ demo:** Medusa chạy theo giờ thật, nên server đặt lịch `starts_at/ends_at` của price list (đã lên lịch / đang chạy / đã kết thúc) và bật tắt promotion có khung giờ cho khớp giờ mô phỏng.
- **Lý do mã không áp:** Medusa không trả lý do. Server suy ra từ rule của promotion (đơn tối thiểu, nhóm khách, phạm vi, provider, trạng thái, ngân sách) và số tiền hàng của giỏ Medusa, ghi rõ là FlashSRE suy ra.
- **FlashSRE phân tích:** chạy oracle thật (`POST /admin/flashsre/contracts/:id/check`, cả ba contract), chỉ hiện phát hiện mới so với lab sạch; audit log thật (`/admin/flashsre/config-changes`).
- **Admin Medusa:** sửa giá price list, bật/tắt promotion, mức giảm, đơn tối thiểu, nhóm khách, ngân sách campaign, đơn vị vận chuyển của freeship; mỗi thao tác gọi Admin API bằng tài khoản team sở hữu.

- **Kiểm tra tách đơn (kịch bản K):** không dùng rule của voucher. Tính chất: tiền giảm shop A tự chịu cho hàng của chính A không đổi khi giỏ có thêm hàng shop khác. Server đo giỏ gộp và từng phần giỏ theo shop trên Medusa; "Agent dò toàn catalog" ghép mỗi SKU có voucher shop với một SKU của từng shop khác (~50 giỏ, ~1 phút). Trên lab gốc nó tìm ra AirChef Mini + hàng shop khác ≥ 210.000đ làm AirChef chịu thêm 80.000đ (AIRCHEF100K đạt ngưỡng 1,5 triệu nhờ hàng shop khác), trong khi oracle theo rule không báo.

Kịch bản trên Medusa: A (Glow), B (AirChef), F (vận chuyển), G (chồng giờ), H (khách mới), I (tạm dừng/ngân sách), J (đối chứng), K (gom đơn, kiểm tra tách đơn). C, D, E cần tính năng Medusa 2.21 không có (cấm cộng dồn, đổi thứ tự tính, chặn cả giỏ) nên chỉ có ở bản mô phỏng (`/sim`).

Credential chỉ nằm trong tiến trình server; trình duyệt không thấy mật khẩu. Server phục vụ một người demo tại một thời điểm.

## Bản mô phỏng (không cần Medusa)

```bash
node incidents/demo/serve.mjs          # http://localhost:5178
node --test incidents/demo/engine.test.mjs
```

Có cửa hàng trên màn điện thoại, Demo Control (kịch bản, đồng hồ, so sánh), FlashSRE phân tích và Admin cấu hình rule, chạy hoàn toàn trong trình duyệt.

## FlashSRE Ops: sự cố kinh doanh khi hệ thống chạy đúng (`ops/`)

```bash
node incidents/demo/serve.mjs                   # http://localhost:5178/ops/index.html
node --test incidents/demo/ops/engine.test.mjs
```

Không có bug, không có voucher áp sai; nhu cầu thực tế khác dự báo. Khung 20:00–24:00 ngày 11/11, mỗi bước một phút, dòng đơn mô phỏng theo mô hình nhu cầu trong `ops/engine.mjs`.

- **Freeship hết ngân sách sớm:** FREESHIP30 (tối đa 30.000đ, đơn từ 199.000đ, 300 triệu). KOL đăng video lúc 20:06, nhu cầu ~50.000 lượt thay vì 15.000; giữ nguyên thì cạn lúc 20:35. Agent phát hiện 20:10 (tốc độ tiêu gấp ~4,7 lần), loại trừ lỗi cấu hình, áp sai, lạm dụng, tìm nguồn lưu lượng, xem ngân sách SAN50K dự kiến dư (BANK20 của đối tác thì không được chuyển), rồi mô phỏng 5 phương án. Đề xuất: giảm còn 15.000đ, chuyển 60 triệu từ SAN50K, mở theo khung giờ; đối chứng cùng diễn biến: 100% khung giờ có freeship thay vì 25%.
- **Hai chương trình đúng, lợi nhuận hụt:** VIP15 (Marketing) và Freeship toàn phần (Growth) được phép cộng. Khách VIP mua hàng cồng kềnh gấp ~4,5 lần dự báo; mỗi đơn như vậy lỗ 218.000đ (chỉ VIP15: −28.000đ, chỉ Freeship: +382.000đ). Agent phát hiện 20:14, nhóm giỏ này chiếm 83% khoản hụt dù chỉ 4,4% số đơn. Đề xuất: trần VIP15 cho hàng cồng kềnh 200.000đ; lợi nhuận 770,6 triệu so với mục tiêu 632,7 triệu (giữ nguyên: 317 triệu).

### Chạy trên Medusa thật

```bash
BASE=https://flashsre-commerce-30123348ca77.herokuapp.com PASSWORD=<admin> FLASHSRE_TEAM_PASSWORD=<team> \
  node incidents/demo/ops/medusa-ops.mjs          # http://localhost:5180
```

- **Dữ liệu riêng của ops** (tiền tố `FS-OPS` / `fs-ops`, tách khỏi lab 11.11): 5 sản phẩm, 9 shipping option (5 mức phí cho freeship, hoả tốc, 3 mức theo kích thước), nhóm khách `FS-OPS Khách VIP`, 7 promotion, campaign có ngân sách. Mỗi lần dựng tạo campaign mới để ngân sách bắt đầu từ 0.
- **Kế hoạch là contract đã duyệt** trên Medusa: `CT-OPS-FREESHIP30` (ngân sách, lượt dự kiến, chính sách chuyển ngân sách, người duyệt) và `CT-OPS-VIP-FREESHIP` (mục tiêu lợi nhuận, khai báo team `growth`). Tài khoản `growth@flashsre.dev` được tạo qua lời mời của admin rồi gán team.
- **Đơn thật:** bộ sinh đơn mở giỏ, chọn ship, thanh toán, hoàn tất qua Store API. Freeship: mỗi đơn thật đại diện 100 đơn, ngân sách campaign thu nhỏ cùng tỷ lệ; khách chốt hay bỏ giỏ theo freeship Medusa thật sự trả về, nên khi Medusa tự dừng ở hạn mức ngân sách thì tỷ lệ bỏ giỏ tăng thật. VIP + Freeship: trọng số theo nhóm giỏ (VIP cồng kềnh ×5 … khách thường hàng nhỏ ×100), lượng đơn từng nhóm theo ưu đãi Medusa báo cho giỏ của nhóm đó.
- **Chỉ số đọc lại từ Medusa:** đơn hàng (mức giảm từng mã, phí ship sàn trả), ngân sách campaign, audit log FlashSRE. Lượt mở giỏ và nguồn truy cập (link KOL) là số liệu phiên của storefront.
- **Phương án đã duyệt chạy qua Admin API bằng tài khoản team:** marketing@ đổi mức freeship và trần VIP hàng cồng kềnh, finance@ chuyển ngân sách SAN50K sang FREESHIP30, growth@ đổi phạm vi freeship; "mở theo khung giờ" là runbook nâng hạn mức campaign đầu mỗi giờ. Audit log ghi đúng team.
- Medusa 2.21 không có trần cho voucher %: "VIP −15% tối đa 600.000đ" cấu hình thành `FS-OPS-VIP15` (15% hàng nhỏ, vừa) và `FS-OPS-VIP15-CK` (600.000đ hàng cồng kềnh). Phương án "VIP15 không cộng Freeship" bỏ vì Medusa không chặn cộng dồn.
- Một lượt chạy tới lúc kiểm chứng mất khoảng 3 phút (~110–170 đơn thật); chạy hết khung 24:00 khoảng 12–15 phút.
- Shipping option ops nằm trong vùng giao Việt Nam nên oracle của lab 11.11 thấy thêm provider chưa khai báo (nằm trong baseline sạch nên bị lọc). `POST /api/cleanup` tắt promotion ops và gỡ shipping option ops.

Agent chỉ đọc số liệu tới phút hiện tại và ghi rõ giả định dự báo; phương án chỉ chạy khi đủ người có thẩm quyền duyệt. Ô "Diễn biến ngoài hệ thống" tắt đi là đối chứng: chiến dịch chạy đúng dự báo, agent không báo động. Phần "Đối chứng cùng diễn biến nếu giữ nguyên" là số chấm điểm cho demo, agent không thấy lúc quyết định.

## Cấu trúc

| File | Vai trò |
|---|---|
| `engine.mjs` | Evaluator dùng chung: giá (price rule), điều kiện ưu đãi, cộng dồn, tính tiền, trace, diff cấu hình, contract, phân tích, thử phương án sửa |
| `scenarios.mjs` | 10 kịch bản A–J. Mỗi kịch bản chỉ nạp cấu hình và giỏ vào evaluator, không chứa kết quả |
| `app.mjs` | Giao diện: cửa hàng, màn chọn ưu đãi, Demo Control, FlashSRE, Admin. Mọi con số lấy từ `evaluate()` |
| `index.html` | Bố cục và style (dạng trang Artifact, `serve.mjs` bọc khung HTML khi chạy local) |
| `engine.test.mjs` | Kiểm các phép tính trong spec |
| `medusa-server.mjs` | Server local cho bản Medusa: kịch bản, đồng hồ, đo giỏ, giải thích lý do, thao tác admin theo team, oracle, audit |
| `medusa.html`, `medusa.mjs` | Giao diện bản Medusa |

## Quy tắc tính

- Tiền là số nguyên đồng. Giảm phần trăm làm tròn xuống đến đồng. Khoản giảm chia cho các dòng hàng đủ điều kiện theo tỷ lệ số còn lại, phần dư theo phần lẻ lớn nhất.
- Khung giờ `[start, end)`: lúc bắt đầu đã hiệu lực, lúc kết thúc không còn hiệu lực.
- Nhiều price rule cùng hiệu lực trên một SKU: giá thấp nhất thắng, UI ghi rule thắng.
- Thứ tự tính (`order`) và quyền cộng dồn (bảng tương thích, nhóm loại trừ, tối đa N ưu đãi) cấu hình riêng.
- Ưu đãi tự động giữ chỗ trước, rồi đến mã khách chọn theo thứ tự chọn. Ưu đãi rớt điều kiện thì nhả chỗ, không chặn oan ưu đãi khác.
- Ngân sách không đủ toàn bộ khoản giảm thì không cấp, không giảm một phần. Chỉ nút "Đặt đơn mô phỏng" trừ ngân sách/lượt, có chống ghi nhận lặp.
- Cơ sở tính đơn tối thiểu: tổng hiện hành của giỏ, tổng hàng đủ điều kiện, tổng theo giá ngoài flash, sau voucher shop, hoặc sau các ưu đãi chỉ định.

## Giới hạn

- Bản mô phỏng không gọi Medusa; Admin của nó có các rule Medusa 2.21 không có (trần giảm giá, cấm cộng dồn, nhóm loại trừ, cơ sở ngưỡng). Bản Medusa chỉ dùng những gì Medusa làm được.
- Oracle trên Heroku chỉ mô phỏng price list đang hiệu lực. Trước giờ flash nó chưa thấy tổ hợp lỗi và còn báo nhầm ELIGIBILITY_LEAK; bản sửa (coi flash đã lên lịch là sắp chạy) ở `apps/backend/src/lib/flashsre/marketplace-check.ts`, cần deploy.
- Phân tích FlashSRE trong demo là deterministic từ evaluator, không dùng LLM. Agent tranh luận thật nằm ở `incidents/agent/`.
- Trạng thái lưu trong trình duyệt (localStorage) theo từng kịch bản; Reset kịch bản đưa về cấu hình gốc.
