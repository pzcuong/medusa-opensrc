# Có đúng là lỗi nghiệp vụ không? Đánh giá dataset và phán quyết của agent

Câu hỏi: 103 mẫu trong dataset và các phát hiện baseline có thật là lỗi nghiệp vụ (cấu hình nhầm, các team mâu thuẫn)
hay chỉ là lỗi engine/backend được gắn nhãn "nghiệp vụ"? Tài liệu này chấm từng họ lỗi, nói rõ bằng chứng nào đủ,
bằng chứng nào chưa, và dataset còn thiếu gì.

## 1. Tiêu chí: khi nào được gọi là lỗi nghiệp vụ

Ba điều kiện, thiếu điều kiện nào thì không được kết luận "nghiệp vụ":

| # | Điều kiện | Bằng chứng trong hệ thống | Thiếu thì phán là |
|---|---|---|---|
| 1 | Hành vi thật của checkout lệch contract đã duyệt | Oracle chạy engine khuyến mãi thật (`computeActions`) của Medusa 2.21.2 nguyên bản, so với contract ở cấp item; mô phỏng được đối chiếu với giỏ thật qua Store API (replay 5/5 khớp từng đồng, từng mã; mỗi mẫu dataset có thêm một giỏ thật `witness_cart`) | `NO_ISSUE` |
| 2 | Tồn tại bản sửa bằng cấu hình (không sửa code) làm hết lệch mà không phá ưu đãi hợp lệ của contract nào | Phép thử nhân quả trong sandbox: patch lên bản sao bóng, chạy lại cả ba contract (`resolves_target` và `preserves`) | `ENGINE_OR_BACKEND` hoặc `CONTRACT_GAP` |
| 3 | Có bằng chứng ai đã đổi: bản ghi audit đụng tới đối tượng, hoặc contract đổi phiên bản | Audit middleware ghi actor, team, before/after, diff cho mọi POST/DELETE Admin API; contract lưu theo phiên bản | `UNATTRIBUTED_CHANGE` (mới, xem mục 4) |

Điều kiện 2 là điều kiện vận hành, không phải bản thể: nó chứng minh "config đủ để sửa", không chứng minh "config là
nguyên nhân". Một lỗi engine mà config che được (ví dụ engine so `gte` như `gt`, hạ ngưỡng đi 1đ là "hết lỗi") sẽ
qua được phép thử này. Điều kiện 3 là lớp chắn cho trường hợp đó: nếu không ai sửa gì mà trạng thái vẫn lệch, agent
không được đổ cho team nào.

Cũng cần tách hai nghĩa của "lỗi nghiệp vụ":
- **Người cấu hình làm sai ý định của chính mình** (gõ nhầm số 0, chọn nhầm shop, quên bật lại). Rollback là bản sửa đúng.
- **Mỗi người làm đúng việc của mình, nhưng tổng thể mâu thuẫn** (hạ hạng shop là đúng, voucher theo hạng shop là đúng,
  hai cái cộng lại làm khách mất ưu đãi). Rollback chỉ là *một* bản sửa; bản sửa đúng là quyết định của hai chủ contract.
  Agent vì vậy không được tự áp, chỉ `NEEDS_APPROVAL`.

## 2. Chấm từng họ lỗi

Thang: **A** lỗi thao tác rõ ràng của một team · **B** từng thay đổi đều hợp lệ, lỗi ở chỗ không ai rà tác động chéo ·
**C** mơ hồ: cấu hình đúng ý định hợp lý nhưng engine hiểu khác · **D** không phải lỗi cấu hình.

| Họ | Ai làm gì | Hạng | Vì sao là nghiệp vụ | Phản biện phía engine/BE | Bản sửa agent đề xuất |
|---|---|---|---|---|---|
| FLASH_PRICE_TYPO (8) | Merch nhập giá flash thiếu/thừa số 0 | A | Giá lệch bảng giá contract; audit ghi merch sửa price list; rollback hết lỗi | Không có: engine áp đúng giá được nhập | Đưa price list về trước, `AUTO_ELIGIBLE` hợp lý |
| FLASH_VARIANT_MISSING (4) | Merch quên một dòng SKU | A | Contract liệt kê đủ SKU; thiếu dòng → khách trả giá niêm yết | Không có | Như trên |
| SHOP_VOUCHER_WRONG_SHOP (5) | Seller Ops sao chép voucher, quên đổi shop | A | Điều khoản voucher ghi shop; rule collection_id trỏ shop khác | Không có | Chỉnh promotion về đúng điều khoản |
| PLATFORM_CATEGORY_SCOPE (5), PLATFORM_SHOP_TYPE_SCOPE (4) | Marketing sửa điều kiện voucher sàn | A | Contract ghi ngành/loại shop; so trực tiếp | Không có | Như trên |
| FREESHIP_PROVIDER_LIST (4) | Logistics sửa danh sách provider freeship | A | Contract liệt kê provider | Không có | Như trên |
| BUDGET_TYPO (5) | Finance nhập ngân sách theo nghìn đồng | A | Contract ghi ngân sách; chỉ kiểm tĩnh, sandbox không mô phỏng ngân sách | Không có, nhưng bằng chứng chỉ là so số, chưa có giỏ thật chứng minh campaign bị khóa sớm | Đưa budget về trước; `NEEDS_APPROVAL` vì finance sở hữu |
| SEGMENT_RULE (2), MIN_SPEND_TYPO (4), VALUE_TYPO (4), PROMO_PAUSED (3), BRANDDAY_SCOPE (3) | Gõ nhầm điều kiện/giá trị, quên bật lại | A | So trực tiếp điều khoản | Không có | Chỉnh về điều khoản |
| GDWEEK_SCOPE (4): sửa ngành | Category sửa phạm vi chương trình của mình | A | Một team, một contract | Không có | Chỉnh về điều khoản |
| GDWEEK_SCOPE: mở cho Mall / bỏ loại shop | Category mở rộng chương trình sang Mall | B | Contract Gia dụng Week chỉ cho Yêu thích/Thường; Mall đã có Brand Day của Seller Ops và cộng thêm 8% ngoài kế hoạch | Engine không có cờ chặn cộng dồn, nên "đụng" là tất yếu nếu phạm vi chồng nhau | Thu phạm vi về điều khoản; đúng là cần Seller Ops và Category cùng duyệt |
| CONTRACT_CONFIG_LAG (2) | Contract mới được duyệt, config chưa theo | A | Lỗi quy trình: duyệt xong không cấu hình; bằng chứng là contract đổi phiên bản, audit không có thay đổi promotion | Không có | Chỉnh promotion theo contract mới |
| FLASH_DEEPER_CROSSES_THRESHOLD (3) | Category duyệt giảm sâu hơn, ngưỡng voucher shop giữ nguyên | B | Không ai cấu hình sai; giá flash mới thấp hơn ngưỡng đơn tối thiểu của voucher → khách mất 100K. Lỗi ở chỗ không ai rà hai điều khoản cùng lúc | Điều kiện đơn tối thiểu xét trên cả giỏ là hành vi chuẩn của engine | Rollback giá flash qua được sandbox, nhưng về nghiệp vụ có thể sai (giảm sâu là cố ý); bản sửa đúng có thể là hạ ngưỡng voucher. Agent gắn `NEEDS_APPROVAL`, không tự áp: hợp lý |
| SHOP_TYPE_DOWNGRADE (6) | Seller Ops đổi hạng shop giữa campaign | B | Hạ hạng là hợp lệ; voucher sàn theo hạng shop cũng hợp lệ; cộng lại thì shop mất voucher sàn giữa campaign. 2/6 mẫu (glow, techzone) đúng là không ảnh hưởng và oracle không báo | Không có | Rollback tag hạng shop qua sandbox nhưng "đưa shop lên lại hạng cũ" không phải bản sửa nghiệp vụ; cần Seller Ops + Marketing quyết. `NEEDS_APPROVAL` đúng |
| CATEGORY_MOVED (3) | Merch kéo nhầm sản phẩm sang ngành khác | B | Sản phẩm rời phạm vi voucher sàn (mất) hoặc lọt vào (rò) | Không có | Rollback ngành: đúng |
| FREESHIP_PROGRAM_TAG (9) | Seller Ops gỡ/thêm shop khỏi Freeship Xtra | B | Contract Freeship của Marketing ghi danh sách shop; Seller Ops sửa danh sách không qua Marketing | Không có | Rollback tag: đúng nếu Seller Ops nhầm, sai nếu shop thật sự rời chương trình; cần Marketing duyệt |
| NEW_PROVIDER_UNDECLARED (3) | Logistics mở provider mới | B | Provider hợp lệ nhưng contract Freeship không khai báo → khách chọn provider rẻ hơn lại không được freeship | Không có | Gỡ provider qua sandbox, nhưng bản sửa đúng hơn là Marketing bổ sung provider vào contract. Agent chỉ tìm được bản sửa "gỡ" |
| CONTRACT_REVISION (3) | Một team sửa contract của mình, contract kia không đổi | B | Mâu thuẫn ý định giữa hai contract đã duyệt; cấu hình đúng với từng bản | Không liên quan engine | Không sửa config, chuyển hai chủ contract: đúng |
| CATEGORY_PARENT_UNASSIGNED (8) | Merch chuẩn hóa cây: sản phẩm chỉ gắn ngành con | **C** | Có bản sửa cấu hình (gắn lại ngành cha, hoặc voucher liệt kê ngành con); 1/8 (PinPro, shop Thường) không ảnh hưởng và oracle không báo | **Mạnh**: rule `items.product.categories.id` không kế thừa ngành cha là giới hạn engine. Trong PIM thông thường, chỉ gắn ngành con là chuẩn. Lỗi nằm ở quy ước cấu hình chưa được viết ra | Rollback qua sandbox; nhưng cần ghi quy ước "sản phẩm phải gắn cả ngành cha" hoặc đổi voucher sang liệt kê ngành con |
| FREESHIP_THRESHOLD (3): `item_total` | Logistics đổi ngưỡng từ subtotal sang total | **C** | Contract ghi "trước voucher"; config "sau voucher" | Hai thuộc tính tên gần giống trong UI; dễ chọn nhầm | Đưa về `item_subtotal`: đúng |
| FREESHIP_THRESHOLD: giá trị | Nhập 3.000.000 / 30.000 | A | Gõ nhầm số 0 | Không có | Đúng |
| UNPLANNED_STACKING (4) | Category bật ưu đãi tự động, brief ghi "không cộng voucher sàn" | **C** | Team bật chương trình mà không có cách biểu diễn "không cộng dồn" | **Mạnh**: engine không có cờ loại trừ; team không làm sai thao tác nào, chỉ không thể làm điều họ muốn | Agent gỡ promotion: qua sandbox nhưng là bản sửa nặng tay; bản sửa đúng là tách phạm vi hoặc chấp nhận cộng dồn trong contract |
| AMOUNT_CAP_NOT_ENFORCED, MAX_ITEM_DISCOUNT_PER_ORDER (baseline) | Không ai làm gì | **D** | Contract hứa trần 150K và 300K/đơn mà engine không có trường trần | Đây là giới hạn engine | Không có bản sửa config; `ENGINE_OR_BACKEND`. Về trách nhiệm: người duyệt contract hứa thứ nền tảng không làm được |
| AMOUNT_ORDER_SEMANTICS (baseline) | Không ai làm gì | **D** | Contract hiểu % tính trên giá gốc; engine tính trên phần còn lại | Hành vi theo tài liệu Medusa | `ENGINE_OR_BACKEND`; cần viết lại contract theo cách engine tính |
| CROSS_CAMPAIGN_ORDER_UNSPECIFIED (baseline) | Không ai làm gì | **D** | Ba contract cho phép cộng dồn nhưng không nói thứ tự áp | Engine áp theo value giảm dần, đúng tài liệu | `CONTRACT_GAP`, chuyển ba chủ contract |

Tổng kết theo hạng (103 mẫu + 4 phát hiện baseline):

| Hạng | Mẫu | Kết luận |
|---|---|---|
| A: lỗi thao tác một team | 57 | Nghiệp vụ, không bàn cãi. Rollback/conform là bản sửa đúng |
| B: hợp lệ riêng lẻ, mâu thuẫn tổng thể | 29 | Nghiệp vụ (liên team), nhưng bản sửa của agent là *một* phương án; quyết định thuộc hai chủ contract |
| C: engine hiểu khác ý định hợp lý | 13 | Gọi là nghiệp vụ được vì có bản sửa cấu hình, nhưng nguyên nhân gốc là engine không biểu diễn được ý định. Cần quy ước cấu hình viết ra, và backlog cho engine |
| Đối chứng không lỗi (`CONTROL_NO_OP`) | 4 | Không được báo |
| D: contract vượt khả năng engine / chưa quy định | 4 phát hiện baseline | Không phải lỗi cấu hình. Là lỗi khi viết/duyệt contract |

Hạng C là chỗ dễ bị phản bác nhất. Một kỹ sư có thể nói "đó là bug của Medusa" (không kế thừa ngành cha, không có cờ
loại trừ). Câu trả lời thành thật: đó là *thiết kế* của Medusa, có tài liệu, và team cấu hình có thể làm đúng nếu biết.
Nhưng nếu không ai viết quy ước đó ra thì lỗi lặp lại, và khi đó trách nhiệm là của platform, không phải người cấu hình.

## 3. Điểm yếu của bằng chứng (cần nói trước khi ai hỏi)

1. **Nhãn và kịch bản cùng một tác giả.** 106/106 là kiểm tra tính nhất quán giữa oracle, agent và nhãn, không phải
   kiểm chứng độc lập. Cách khắc phục: cho người của team nghiệp vụ gắn nhãn mù 20 mẫu ngẫu nhiên (chỉ đọc
   `samples.jsonl`, không đọc `labels.jsonl`), đo tỉ lệ đồng thuận. Chưa làm.
2. **Đối chứng phía engine/BE mỏng.** Trước bản này chỉ có 3 `ENGINE_CONTROL` và 4 `CONTROL_NO_OP`. Không có mẫu nào
   mà nguyên nhân là lỗi backend thật. Bản này thêm 9 mẫu `OUT_OF_BAND_DB` (sửa thẳng DB, không audit) và 4 mẫu
   `CONTROL_BENIGN_AUDITED` (thay đổi hợp lệ trên đối tượng có audit). Vẫn chưa có: lỗi code thật (cache/index cũ,
   worker chết, lỗi phụ thuộc thứ tự thao tác S1), vì không inject được vào Medusa mà không sửa code.
3. **Phép thử nhân quả không phân biệt được "config là nguyên nhân" với "config che được lỗi".** Trước bản này, một
   phát hiện mới mà không có ai sửa gì vẫn bị phán `BUSINESS_MISCONFIG` nếu patch `conform` qua sandbox. Bản này thêm
   phán quyết `UNATTRIBUTED_CHANGE`: sửa config thì hết lỗi nhưng không có audit đụng tới đối tượng và contract không
   đổi → chuyển platform truy nguồn, không đổ cho team.
4. **Oracle và sandbox dùng chung code.** Lỗi của oracle che cả hai (đã gặp hai lần: `expected_pays` không trừ ưu đãi
   được phép cộng; kiểm tra cộng dồn không đọc rule cấp giỏ). Replay trên Store API là lớp kiểm độc lập duy nhất, mới
   có 5 giỏ cho baseline và 1 giỏ chứng kiến cho mỗi mẫu dataset.
5. **"Số giỏ" là lượt mô phỏng** (SKU × phân khúc × provider), không phải đơn hàng thật.
6. **Audit chỉ bắt Admin API.** Script, migration, sửa tay DB không có bản ghi. Đây chính là lý do cần mục 3.
7. **Ngân sách chỉ kiểm tĩnh.** `BUDGET_TYPO` được phát hiện bằng so số, chưa có giỏ thật chứng minh campaign khóa sớm.
8. **Phán quyết liên team dựa trên quyền sở hữu khai báo trong contract.** Nếu contract khai sai chủ sở hữu, phán
   quyết sai theo.

## 4. Đối chứng mới: thay đổi ngoài luồng và thay đổi lành tính

Kịch bản (chạy trên Heroku dev, DB qua `heroku pg:psql`):

| Họ | Mẫu | Cách inject | Agent phải |
|---|---|---|---|
| `OUT_OF_BAND_DB` | 9 | Sửa thẳng DB: giá trị promotion, xóa giá trị rule phạm vi, giá flash, xóa liên kết tag Freeship, chuyển draft. Không qua Admin API nên không có audit | Thấy lỗi, có bản sửa, nhưng **không** phán `BUSINESS_MISCONFIG`/`CROSS_TEAM_CONTRADICTION`; phán `UNATTRIBUTED_CHANGE`, `ESCALATE` cho platform |
| `CONTROL_BENIGN_AUDITED` | 4 | Đổi mô tả campaign, đổi tên ngành (giữ handle), đổi tên shop, gia hạn campaign: đều đi qua route có audit | Không báo gì |

Kết quả: xem mục 5 (điền sau khi chạy).

## 5. Kết quả chạy (Heroku dev, 2026-10-25)

### 5.1 Giỏ thật so với mô phỏng trên toàn bộ dataset cũ: tìm ra một lỗi oracle

Mỗi mẫu dataset có một giỏ thật qua Store API (`witness_cart`), nhưng trước đây không ai so nó với mô phỏng. So lại
103 mẫu của dataset 2026-10-24: **82 giỏ so được, 77 khớp, 5 lệch.**

| Mẫu | Giỏ thật | Mô phỏng | Nguyên nhân |
|---|---|---|---|
| FLASH_PRICE_TYPO-02, -04 (AirChef 6L ×10) | 1.720.800 | 12.816.000 | **Lỗi oracle.** Pricing module của Medusa với price list loại `sale` lấy giá *thấp hơn* giữa giá flash và giá niêm yết. Giá flash thừa số 0 không làm khách trả 17,9 triệu; khách trả giá niêm yết và **mất ưu đãi flash 200.000đ**. Oracle lấy thẳng giá price list nên mô phỏng sai cả chiều lẫn độ lớn |
| FLASH_PRICE_TYPO-06 (HomeLux ×10) | 2.649.600 | 22.273.200 | Như trên |
| FLASH_PRICE_TYPO-08 (WatchX ×10) | 1.971.000 | 17.010.000 | Như trên |
| SEGMENT_RULE-02 (NEWBIE50K mất điều kiện phân khúc) | 1.216.800 | 1.180.800 | Không phải lỗi oracle: giỏ chứng kiến chỉ nhập các mã dành cho mọi khách, không nhập NEWBIE50K; mô phỏng thì nhập. Mô phỏng vẫn đúng với khách *có nhập* mã |

Hệ quả cho câu hỏi "có đúng lỗi nghiệp vụ không": 4 mẫu đó vẫn là lỗi cấu hình thật (giá trong price list sai, khách
mất ưu đãi flash), **phát hiện tĩnh vẫn đúng**, nhưng con số thiệt hại oracle đưa ra sai hoàn toàn (nói khách bị tính
thêm 11 triệu trong khi thực tế khách mất 200 nghìn ưu đãi). Nếu không có giỏ thật thì không ai phát hiện ra. Đã sửa
oracle (lấy `min(giá flash, giá niêm yết)` cho price list `sale`, giữ nguyên cho `override`), và dataset từ nay chấm
thêm cột "giỏ thật khớp mô phỏng" cho mọi mẫu.

Bài học: oracle và sandbox dùng chung mô hình giá; replay giỏ thật là lớp kiểm độc lập duy nhất và phải chạy cho
*mọi* mẫu, không chỉ 5 giỏ baseline.

### 5.2 Đối chứng mới (dataset)

13/13 mẫu cho kết quả đúng ở cấp oracle: 4 thay đổi lành tính có audit không sinh phát hiện nào; 9 thay đổi ngoài
luồng đều sinh phát hiện đúng invariant và `config_changes` rỗng (không có audit). Giỏ thật của các mẫu ngoài luồng
khớp mô phỏng, trừ hai mẫu giá flash ×10 (chính lỗi oracle ở 5.1, trước khi sửa).

### 5.3 Agent trên đối chứng mới

Chưa chạy lại. Lượt chạy agent trên 13 mẫu đối chứng với oracle đã sửa bị đứt mạng giữa chừng, và từ 2026-10-26
phạm vi được chốt là chỉ xét lỗi nghiệp vụ (mục 7). Không có số liệu agent nào cho `OUT_OF_BAND_DB` và
`CONTROL_BENIGN_AUDITED` trên oracle hiện tại.

### 5.4 Một sự cố backend thật gặp trong lúc chạy

Trong lần chạy eval đầu, dyno Heroku (Basic, 512MB) chết vì `R15 Memory quota vastly exceeded` ngay sau khi agent
chạy loạt sandbox; request `POST /admin/products` nhận 503. Đây là ví dụ đối lập hữu ích: không cấu hình nào sai,
không contract nào lệch, oracle không có phát hiện mới; triệu chứng là lỗi hạ tầng. Hệ thống hiện không có
cơ chế nào gắn sự cố này vào dashboard (metrics Prometheus có, nhưng không có alert).

## 6. Phản hồi review `baseline(1).json` (2026-10-26)

| Điểm review | Kiểm tra lại | Kết luận | Đã làm |
|---|---|---|---|
| B. Cùng SKU, mỗi contract một giá (AIRCHEF6 1.790.000 / 2.490.000) | Mô phỏng Brand Day và Gia dụng Week lấy giá niêm yết vì oracle chỉ đọc price list do chính contract khai báo. Giỏ AirChef 6L: Brand Day mô phỏng khách trả 1.755.800đ, checkout thật 1.216.800đ | **Lỗi oracle, nặng hơn review nghĩ**: mọi số liệu mô phỏng của hai contract này trước đây tính trên giá sai | Giá live lấy từ mọi price list đang chạy (như pricing module), giá flash duyệt lấy từ mọi contract đã duyệt. Thêm đúng giỏ này vào replay: Brand Day mô phỏng 1.216.800đ = thật |
| (phát sinh) Cùng giỏ, "khách trả" lệch 35.000đ giữa các contract | Contract không có freeship không trừ hỗ trợ ship của campaign khác | Lỗi oracle | Khách trả tính mọi điều chỉnh phí ship; 120/120 giỏ dùng chung cho cùng số tiền ở cả 3 contract |
| A. Trần 300.000đ/150.000đ phải kiểm được kể cả khi không so được tổng | Trước đây trần voucher chỉ kiểm khi giỏ không có ưu đãi campaign khác | Đúng | Trần voucher kiểm trên mọi giỏ, chỉ tính phần vượt; phần chênh còn lại mới là thứ tự áp. SAN10 vượt trần trên 40 giỏ (trước: 10). Giỏ thật HomeLux V8: SAN10 giảm 269.000đ, trần 150.000đ |
| C. STD báo lặp 3 lần; cần xem `price_type` | STD là `flat`, chỉ có giá EUR. Checkout thật ở VN: STD hiện ra không có giá, chọn thì lỗi 400 "do not have a price" | Lỗi cấu hình thật, khách gặp lỗi ở checkout | Agent gộp các finding cùng đối tượng thành một sự cố kèm danh sách contract bị ảnh hưởng; oracle bỏ qua option `calculated` |
| D. ENGINE_GAP chưa có bằng chứng nguyên nhân | `recent_changes` chỉ là log tạo promotion | Đúng: ở oracle, ENGINE_GAP là chẩn đoán | Finding ghi `root_cause_status` (chẩn đoán), `engine_evidence` (quy tắc + nguồn: `promotion-module.js` nạp promotion `order { application_method: { value: 'DESC' } }`; không có trường trần), giỏ ví dụ. Xác nhận nhân quả vẫn là việc của agent: không phương án cấu hình nào làm hết lỗi trong sandbox |
| F3 không phải lỗi Medusa | Đồng ý | Hành vi đúng thiết kế, lệch chính sách riêng của contract | Không đổi |
| Patch / shadow validation / canary / rollback | baseline.json chỉ là đầu ra phát hiện; patch và sandbox nằm trong hồ sơ agent | Canary, áp lên live và rollback **chưa có** | Không làm trong lượt này |

Replay sau khi sửa (Heroku v16 và local): 7/7 giỏ thật khớp mô phỏng của cả 3 contract, từng mã.

## 7. Dataset chỉ lỗi nghiệp vụ và cách agent xử lý (Heroku v16, 2026-10-26)

Dataset `incidents/dataset/marketplace-1111-2026-10-26T01-33-22-479Z/`: 95 mẫu thuộc 23 họ, chỉ gồm các nhãn
`CONFIG_DRIFT` (56), `CROSS_TEAM_CONFLICT` (33), `MISSING_CONFIG` (3), `CONTRACT_CONFLICT` (3). Mọi mẫu đều đã qua
kiểm định kịch bản (sub-agent, PASS). Phát hiện đúng 95/95, gắn đúng team 95/95. Giỏ thật khớp mô phỏng ở 94/95 giỏ
so được. Mẫu lệch là SEGMENT_RULE-02, như đã giải thích ở 5.1: giỏ chứng kiến không nhập NEWBIE50K.

Quy trình mỗi mẫu: inject → agent điều tra (audit, sandbox, debate) → chấm theo nhãn → **một sub-agent độc lập kiểm
định cách xử lý** (8 tiêu chí: phát hiện, phán quyết, nghiệp vụ/BE, chuỗi bằng chứng, sandbox, bản sửa, không đảo ngược
quyết định hợp lệ, người duyệt/quyền).

| Lượt | Thay đổi agent | Chấm theo nhãn | Kiểm định: SOUND / CONCERN / WRONG |
|---|---|---|---|
| 1 (03:16) | Như lúc dataset | 94/95 (1 mẫu lỗi hạ tầng: dyno trả 500/503) | 53 / 36 / 6 |
| 2 (04:51) | Luật liên team; diff gọn; chấm nhãn chặt; rollback liên team ghi rõ đảo ngược quyết định ai | 95/95 | 61 / 32 / 2 |
| 3 (06:21) | Người duyệt đúng phạm vi; không tự áp bản sửa làm tăng giá; auditor thấy các phát hiện được gộp | 95/95 | 60 / 35 / **0** |
| 3b (06:48, 14 mẫu) | Giải trình từng phát hiện được gộp (PLATFORM_*, BUDGET_TYPO) | 14/14 | 8 / 6 / 0 (BUDGET_TYPO 2/5 → 5/5 SOUND) |
| 3c (07:06, 13 mẫu) | Sửa mục 8, 9 bên dưới (FREESHIP_PROVIDER_LIST, PLATFORM_*) | 13/13 | **13 / 0 / 0** |

Lượt 3b, 3c chỉ chạy lại các họ bị ảnh hưởng, không chạy lại cả 95 mẫu.

Những gì kiểm định tìm ra và đã sửa:

1. **Gõ sai giá flash bị phán là "mâu thuẫn liên team"** (FLASH_PRICE_TYPO 4/8, FLASH_DEEPER 3/3, BRANDDAY/GDWEEK_SCOPE).
   Giá thiếu số 0 làm voucher của marketing mất theo, và agent coi việc đó là xung đột liên team. Sửa luật: nếu team
   gây lỗi làm lệch contract ngay trên đối tượng của mình, phán quyết là `BUSINESS_MISCONFIG`, còn ưu đãi của team
   khác mất theo là hệ quả. Chấm nhãn trước đây cho `CONFIG_DRIFT` khớp cả `CROSS_TEAM_CONTRADICTION`, nên eval báo
   94/95 trong khi phán quyết sai. Giờ chấm chặt.
2. **Hồ sơ cắt mất giá trị sai.** Batch giá xóa rồi tạo lại bản ghi, và 10 dòng diff đầu toàn là dòng xóa, nên
   auditor không thấy 179.000đ ở đâu. Diff giờ gộp theo `price_set`, thành "1.790.000 → 179.000". Bản sửa ghi rõ "chỉ
   đổi 1/4 giá; các giá khác giữ nguyên".
3. **Rollback một quyết định hợp lệ** (SHOP_TYPE_DOWNGRADE, NEW_PROVIDER_UNDECLARED). Agent không biết thay đổi là
   sơ suất hay cố ý. Ở ca liên team, đề xuất rollback giờ nói rõ nó đảo ngược thay đổi của ai: sơ suất thì áp, quyết
   định hợp lệ thì các team chủ điều khoản chọn sửa contract. Người duyệt gồm chủ của mọi điều khoản bị ảnh hưởng (ví
   dụ trước đây thiếu category cho GDW8).
4. **Tự áp bản sửa làm khách trả nhiều hơn** (FLASH_DEEPER: giá thấp hơn contract có thể là thương lượng với shop).
   Bản sửa nào làm tăng giá đều cần duyệt, kèm lựa chọn "trình sửa contract thay vì áp".
5. Ghi nhận model: CLI chạy kèm haiku cho việc phụ nên báo cáo ghi nhầm model. Giờ ghi đúng model làm bài (sonnet).

Soát lần cuối sau lượt 3 tìm thêm:

6. **`samples.jsonl` lộ đáp án.** File "agent được đọc" chứa `title`, `story`, `family`, nói thẳng team nào làm gì và
   vì sao (vd "Category team được duyệt contract mới nhưng người cấu hình chưa sửa promotion theo"). Eval của FlashSRE
   không bị ảnh hưởng vì agent inject lại trên Heroku và không đọc file này, nhưng ai dùng dataset để chấm model khác
   sẽ bị lộ đáp án. Đã chuyển ba trường sang `labels.jsonl`, cả trong code sinh lẫn dataset hiện có; dữ liệu giữ
   nguyên, đã kiểm từng trường. `sample_id` vẫn mang tên họ lỗi, nên chỉ được dùng làm khoá.
7. **`config_changes` của mẫu bị lọc theo team gây lỗi.** Nếu có thay đổi của team khác trong lúc chạy mẫu, file đã
   tự loại chúng đi, khiến việc gắn đúng team dễ một cách giả tạo. Đối chiếu audit log trên Heroku cho cửa sổ chạy
   dataset (3.573 bản ghi, 01:33–02:20 UTC): **không có bản ghi nào bị loại trong 95 mẫu này** (các dòng lệch đều
   nằm sau mẫu cuối, thuộc lượt eval). Đã bỏ bộ lọc trong code sinh.
8. **Bản sửa phía điều khoản làm rơi team gây lỗi khỏi danh sách duyệt** (FREESHIP_PROVIDER_LIST 4/4, do sửa ở mục 3
   gây ra): chỉ còn marketing, mất logistics. Đã sửa.
9. **Oracle quy lỗi engine sang lỗi cấu hình.** Khi một promotion vừa bị đổi, oracle gán nhãn `CONFIG_DRIFT` cho các
   phát hiện vượt trần và thứ tự áp trên promotion đó, trong khi ở mốc chúng là `ENGINE_GAP`. Key đổi nên agent tưởng
   là phát hiện mới; rollback xong nhãn quay lại `ENGINE_GAP`, và agent báo "đã giải quyết" trong khi lỗi engine vẫn
   còn (PLATFORM_*_SCOPE, auditor bắt được). Hồ sơ giờ ghi rõ trường hợp này là "chỉ đổi nhãn, chưa được giải
   quyết". **Oracle chưa sửa**, vì sửa thì phải deploy và sinh lại dataset.

Còn mở (CONCERN, chưa sửa):

- NEW_PROVIDER_UNDECLARED (3/3): agent chỉ có hai phương án, gỡ provider hoặc chỉnh FREESHIP theo contract. Phương án
  đúng nhất là thêm provider vào FREESHIP, nhưng việc đó đòi sửa contract, và agent chưa sinh được phương án "đề xuất
  sửa contract".
- "Chuỗi bằng chứng" là tiêu chí trượt nhiều nhất: các phát hiện gộp vào một sự cố chưa có giải trình riêng. Hồ sơ đã
  thêm `covered_detail` (lý do gộp, đánh dấu phát hiện kiểu engine do thay đổi làm lộ ra).
- Auditor có độ nhiễu: cùng cách xử lý, giữa hai lượt có mẫu đổi SOUND ↔ CONCERN. Con số SOUND nên đọc theo
  xu hướng, không nên đọc như một điểm chính xác.
- Oracle: lỗi trần và thứ tự áp nên luôn là `ENGINE_GAP`, kể cả khi promotion vừa bị đổi (mục 9). Sửa ở
  `marketplace-check.ts` (`kind` cho `direction === "calc"`) cần đi kèm sinh lại dataset.
- Chưa có canary, áp lên live và rollback thật. Hồ sơ dừng ở đề xuất đã kiểm trong sandbox.

Đầu ra: `incidents/agent-eval/` là lượt 3 (đủ 95 mẫu: `EVAL.md`, `eval.jsonl`, `dossiers.json`, `dossiers.md`,
`HANDLING_AUDIT.md`, `handling-audit.jsonl`); `incidents/agent-eval/reruns/` chứa lượt 3b, 3c. Chi phí kiểm định khoảng
$8–10 mỗi lượt 95 mẫu.

## 8. Case demo: Flash Sale đắt hơn hôm qua (Heroku v17, 2026-10-28)

Các case trước bị phản biện đúng: hoặc là chuyện bình thường (đổi thuộc tính thì voucher đổi theo), hoặc dính giới hạn
của Medusa (cộng dồn, trần, kế thừa ngành cha), hoặc một cảnh báo trên chính đối tượng đó là đủ. Case này tránh cả ba.

**Chuyện xảy ra.** Seller Ops chạy "Khuyến mãi của shop": AirChef 6L giá 1.550.000đ cả tháng. Voucher shop AirChef100K áp
cho đơn từ 1.500.000đ. Merchandising chốt Flash Sale 1.490.000đ với shop và sửa contract theo giá mới. Hai quyết định đều
có duyệt và đều đúng khi xét riêng. Ghép lại: giá flash rơi dưới ngưỡng voucher, chỉ sâu hơn giá shop 60.000đ trong khi
khách mất voucher 100.000đ.

**Giỏ thật trên Medusa** (đo bằng Store API, khách thường, Brand Day -20% tự áp):

| | Ngoài giờ flash (giá shop) | Trong giờ flash |
|---|---|---|
| Chỉ nhập voucher shop | 1.160.000đ | 1.192.000đ (+32.000đ) |
| Voucher shop + voucher sàn SAN10 | 1.044.000đ | 1.072.800đ (+28.800đ) |

**Vì sao không phải lỗi BE.** Engine làm đúng từng quy tắc: trong giờ flash lấy giá thấp hơn (giống Shopee), voucher xét
ngưỡng trên tiền hàng. Nền tảng không thể biết ngưỡng 1.500.000đ được đặt để khách mua 1 nồi là đủ điều kiện.

**Phát hiện.** Invariant mới `FLASH_NOT_DEARER_THAN_OFF_FLASH`: oracle tính mỗi giỏ có hàng flash hai lần, có và không có
các bảng giá flash của contract. Cùng giỏ mà trong giờ flash trả nhiều hơn là sai, và không cần contract nói ra. Oracle
cũng chọn bảng giá đúng như `calculatePrices` của Medusa (bảng đứng đầu theo giá; `override` dùng nguyên giá, `sale` so
với giá mặc định). Thứ tự này đã được kiểm bằng giỏ thật cho bảng giá có điều kiện nhóm khách.

**Agent xử lý** (eval trên Heroku v17, hai mẫu lỗi, hai mẫu đối chứng):

| Phương án đã thử trong sandbox | Kết quả |
|---|---|
| Xoá khuyến mãi của shop | Loại: cảnh báo hết, nhưng khách trong giờ flash vẫn trả 1.072.800đ |
| Đưa giá flash về 1.790.000đ | Hết lỗi, nhưng lệch giá flash đã duyệt (`FLASH_PRICE_MATCHES_CONTRACT`) |
| Hạ ngưỡng AirChef100K xuống 1.490.000đ | Hết lỗi, nhưng lệch ngưỡng đã duyệt (`PROMOTION_MIN_SPEND`) |
| Rollback mọi thay đổi | Loại: khách trong giờ flash trả đắt hơn (1.216.800đ) |

Không bản sửa cấu hình nào vừa giúp khách vừa giữ đúng mọi điều khoản đã duyệt. Phán quyết `CROSS_TEAM_CONTRADICTION`,
`ESCALATE` cho merchandising và seller_ops. Trước đây, trường hợp không có bản sửa nào đạt mặc định rơi về
`ENGINE_OR_BACKEND`, tức sẽ đổ nhầm cho engine.

| | Kết quả |
|---|---|
| Kịch bản (sub-agent kiểm định) | 4/4 PASS, độ thực tế 4–5/5 |
| Oracle | 2/2 mẫu lỗi bắt được; 2/2 đối chứng (flash vẫn trên ngưỡng; giảm đủ sâu để bù voucher) không báo; 4/4 giỏ thật khớp mô phỏng |
| Agent | 2/2 phán đúng, 2/2 đối chứng không mở hồ sơ |
| Kiểm định cách xử lý | 4/4 SOUND |
| Hồi quy | Chạy lại 46 mẫu của 10 họ dính giá và ngành hàng: 43/43 mẫu lỗi cho đúng y phát hiện như dataset 2026-10-26; 3 đối chứng vẫn sạch; invariant mới không báo ở mẫu nào khác |

Đầu ra: `incidents/dataset/marketplace-1111-2026-10-28T08-59-19-057Z/` (4 mẫu, có giỏ thật),
`incidents/agent-eval/reruns/2026-10-28T08-32-03-267Z/` (gồm cả đối chứng) và `.../2026-10-28T09-05-18-339Z/` (hai mẫu
lỗi, câu chữ hồ sơ bản cuối).

Còn mở: oracle mới xét bảng giá không có điều kiện nhóm khách. Bảng giá có điều kiện nhóm khách đã được kiểm bằng giỏ
thật: bảng cụ thể hơn luôn thắng kể cả khi đắt hơn bảng flash, nhưng oracle chưa mô phỏng trường hợp này.
