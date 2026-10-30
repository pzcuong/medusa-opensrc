// Kiến thức về engine khuyến mãi của Medusa 2.21.2, dùng chung cho agent và sub-agent kiểm định
export const ENGINE_KB = [
  'Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần.',
  'Engine áp promotion theo value giảm dần, không theo thứ tự trong contract.',
  'Engine không có cờ chặn cộng dồn; mọi promotion hợp lệ đều cộng.',
  'Rule items.product.categories.id chỉ khớp category gán trực tiếp cho sản phẩm, không kế thừa ngành cha.',
  'Điều kiện đơn tối thiểu (item_subtotal) xét trên cả giỏ, không theo phạm vi voucher.',
  'Mã bị từ chối không trả lý do; storefront không hiện thông báo.',
  'Price list loại sale lấy giá thấp hơn giữa giá price list và giá niêm yết; loại override luôn dùng giá price list.',
  // Đã kiểm bằng giỏ thật trên Heroku (2026-10-28)
  'Nhiều price list cùng hiệu lực trên một SKU: Medusa chỉ lấy MỘT price list, xếp theo số điều kiện (vd nhóm khách) giảm dần rồi giá tăng dần; bảng có điều kiện nhóm khách thắng bảng chung kể cả khi đắt hơn. Không có điều kiện thì bảng rẻ nhất thắng (khuyến mãi shop và flash: giá thấp hơn thắng).',
  'Ngưỡng xét trên item_subtotal là tiền hàng trước mọi giảm giá. Ngưỡng xét trên item_total: lần tính đầu vẫn dùng tiền hàng trước giảm, nhưng từ lần cập nhật giỏ sau (đổi email, chọn lại ship) giảm giá đã lưu được trừ, nên ưu đãi có thể mất ở bước thanh toán.',
  'Freeship là ưu đãi trên phí ship của từng shipping method (hỗ trợ tối đa một số tiền), không phải giảm tiền hàng.',
]

// Ý nghĩa các invariant của oracle (tên là định danh lịch sử, đọc theo mô tả, không đoán theo tên)
export const INVARIANTS = {
  FLASH_PRICE_MATCHES_CONTRACT: 'Giá trong price list flash khác giá contract duyệt (kiểm tĩnh)',
  FLASH_PRICE_COVERS_ALL_VARIANTS: 'SKU contract liệt kê nhưng price list flash không có giá',
  PROMOTION_ACTIVE: 'Promotion là điều khoản contract nhưng không tồn tại hoặc không active',
  PROMOTION_VALUE: 'Giá trị ưu đãi (application_method.value) khác contract',
  PROMOTION_SCOPE_RULES: 'Điều kiện phạm vi (shop, ngành, loại shop) của promotion khác contract',
  PROMOTION_MIN_SPEND: 'Đơn tối thiểu khác contract',
  PROMOTION_SEGMENT: 'Điều kiện nhóm khách khác contract',
  FREESHIP_ACTIVE: 'Promotion freeship không active',
  FREESHIP_THRESHOLD_BASE: 'Rule ngưỡng freeship sai: sai thuộc tính (item_subtotal/item_total) HOẶC sai giá trị ngưỡng',
  FREESHIP_PROVIDERS: 'Danh sách provider của promotion freeship khác contract',
  PROVIDER_DECLARED_IN_FREESHIP: 'Provider đang bán ở thị trường nhưng contract freeship không khai báo (được hay không được hỗ trợ)',
  PROVIDER_PRICED_IN_MARKET: 'Provider phục vụ thị trường nhưng không có giá ở tiền tệ thị trường',
  BUDGET_LIMIT: 'Ngân sách campaign khác contract',
  NO_UNPLANNED_STACKING: 'Có promotion ngoài mọi contract cộng vào giỏ thuộc phạm vi contract',
  ELIGIBILITY_LEAK: 'Mô phỏng giỏ: một mã áp cho item mà contract nói không được hưởng (rò rỉ)',
  ENTITLEMENT_LOSS: 'Mô phỏng giỏ: item được hưởng theo contract nhưng mã không áp (khách mất ưu đãi)',
  CROSS_CAMPAIGN_STACKING: 'Mô phỏng giỏ: mã của campaign khác cộng vào item trong phạm vi mà contract không cho phép cộng',
  CONTRACT_STACKING_AGREEMENT: 'Hai contract đã duyệt nói ngược nhau về việc cho cộng một cặp mã',
  MAX_ITEM_DISCOUNT_PER_ORDER: 'Tổng ưu đãi của contract trên một giỏ vượt trần mỗi đơn',
  AMOUNT_CAP_NOT_ENFORCED: 'Engine không có trần giảm giá nên số tiền giảm vượt trần contract',
  AMOUNT_ORDER_SEMANTICS: 'Số tiền lệch vì thứ tự áp/cơ sở tính % của engine khác cách contract tính',
  CROSS_CAMPAIGN_ORDER_UNSPECIFIED: 'Số tiền phụ thuộc thứ tự áp giữa các campaign mà contract không quy định',
}

// FlashSRE là gì, để sub-agent kiểm định biết kịch bản có nằm trong phạm vi không
export const FLASHSRE_SCOPE = [
  'FlashSRE phát hiện lỗi cấu hình nghiệp vụ trên sàn thương mại điện tử nhiều team (merchandising, seller_ops, marketing, logistics, finance, category) cùng cấu hình một hệ thống Medusa.',
  'Nguồn sự thật là contract campaign đã duyệt (JSON, có phiên bản, mỗi contract có team sở hữu). Oracle so cấu hình live với contract và mô phỏng ma trận giỏ hàng qua engine khuyến mãi thật.',
  'Mọi thay đổi qua Admin API được audit (ai, team nào, before/after). Thay đổi ngoài Admin API (DB, script) không có audit.',
  'Agent điều tra: thu thay đổi kể từ mốc, sinh phương án sửa (rollback, chỉnh về contract), chạy trong sandbox trên mọi contract, tranh luận Business Analyst / Platform Engineer / Judge.',
  'Trong phạm vi: config nhầm, các team cấu hình mâu thuẫn nhau, contract mâu thuẫn nhau, contract chưa quy định, contract đã đổi mà config chưa theo. Ngoài phạm vi (phải phân biệt được): lỗi code/engine, hạ tầng, dữ liệu đổi ngoài luồng.',
  'Tinh thần dataset: mỗi khâu do một người có thẩm quyền làm vì một lý do hợp lý; lỗi xảy ra do sơ suất hoặc do không ai thấy tác động chéo, không phải do cố ý hay vô lý.',
]
