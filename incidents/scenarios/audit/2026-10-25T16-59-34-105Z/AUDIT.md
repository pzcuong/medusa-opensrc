# Kiểm định kịch bản (sub-agent độc lập, mỗi mẫu một sub-agent)

13 mẫu: PASS 11 · REVISE 2 · REJECT 0 · lỗi 0 · độ thật trung bình 4.5/5 · claude-cli/sonnet · ~$2.54

| Họ | Mẫu | PASS | REVISE | REJECT | Độ thật | Tiêu chí hay trượt |
|---|---|---|---|---|---|---|
| FLASH_DEEPER_CROSSES_THRESHOLD | 3 | 1 | 2 | 0 | 4.0 | label_consistent (2), expected_detection_sensible (1) |
| SHOP_TYPE_DOWNGRADE | 6 | 6 | 0 | 0 | 4.5 | - |
| GDWEEK_SCOPE | 4 | 4 | 0 | 0 | 4.8 | - |

## Mẫu không PASS

### FLASH_DEEPER_CROSSES_THRESHOLD-01: REVISE (độ thật 4/5)
- label_consistent (đề xuất CROSS_TEAM_CONFLICT): Bản chất lỗi khớp đúng vế hai của định nghĩa CROSS_TEAM_CONFLICT: 'hai việc hợp lệ của hai team cộng lại thành lỗi' — ngưỡng min_spend 1.500.000 của Seller Ops (t0) vốn hợp lệ và đúng ý đồ (luôn thấp hơn giá flash để đảm bảo mua 1 món là đạt ngưỡng), và việc hạ giá của Merchandising (t1) cũng hợp lệ trong phạm vi của họ; chỉ khi cộng hai hành động này mới sinh ENTITLEMENT_LOSS. Gắn nhãn CONFIG_DRIFT bỏ qua việc t0 là một mắt xích thiết yếu của câu chuyện (nếu chỉ là CONFIG_DRIFT thuần, không cần dựng t0 làm bước riêng). FLASH_PRICE_MATCHES_CONTRACT đúng là tự thân drift của Merchandising, nhưng nhãn tổng thể của sự cố nên phản ánh hệ quả xuyên-team nổi bật hơn (ENTITLEMENT_LOSS).
- Nhãn label_kind=CONFIG_DRIFT chưa khớp bản chất: lỗi là kết quả cộng dồn của hai hành động hợp lệ từ hai team (ngưỡng voucher Seller Ops + giá flash Merchandising), đúng định nghĩa CROSS_TEAM_CONFLICT hơn.
- đề xuất sửa: Đổi label_kind thành CROSS_TEAM_CONFLICT; giữ nguyên steps, actor_team, params, inject_source và expected_new_invariants (FLASH_PRICE_MATCHES_CONTRACT, ENTITLEMENT_LOSS) vì chúng đã mô tả đúng cơ chế lỗi — chỉ cần đồng bộ lại nhãn tổng thể cho khớp với việc t0 (ngưỡng Seller Ops) là một mắt xích thiết yếu, không chỉ là bối cảnh phụ.

### FLASH_DEEPER_CROSSES_THRESHOLD-02: REVISE (độ thật 4/5)
- label_consistent (đề xuất CROSS_TEAM_CONFLICT): Dù chỉ một team (merchandising) thao tác, hệ quả chính của mẫu là hành động của merchandising làm hỏng điều khoản voucher do seller_ops sở hữu (AirChef100K mất hiệu lực dù contract không đổi) - đúng định nghĩa 'thay đổi của team A làm hỏng điều khoản do team B sở hữu'. Gắn CONFIG_DRIFT bỏ sót phần cross-team này, trong khi family 'FLASH_DEEPER_CROSSES_THRESHOLD' vốn nhấn mạnh chính hệ quả xuyên team đó.
- expected_detection_sensible: FLASH_PRICE_MATCHES_CONTRACT chắc chắn bắt được. Nhưng ENTITLEMENT_LOSS phụ thuộc ma trận giỏ: giỏ 'mixed' duy nhất chứa AIRCHEF6-DEN trong CT-1111-MARKETPLACE là kết hợp với Glow Serum (380k), tổng luôn vượt ngưỡng 1.500.000đ ở cả giá cũ (2.17tr) lẫn giá mới (1.83tr) nên giỏ này không thể hiện việc vượt ngưỡng. Nếu oracle không có thêm giỏ đơn lẻ AirChef6, ENTITLEMENT_LOSS có thể không được kích hoạt như kỳ vọng.
- Nhãn CONFIG_DRIFT chưa phản ánh đúng bản chất cross-team của hệ quả (voucher AirChef100K do seller_ops sở hữu bị vô hiệu do hành động của merchandising); nên là CROSS_TEAM_CONFLICT.
- Giỏ mixed có sẵn cho AIRCHEF6-DEN trong CT-1111-MARKETPLACE (kèm Glow Serum 380k) không bao giờ rơi dưới ngưỡng 1.500.000đ dù ở giá cũ hay giá mới (1.83tr và 2.17tr), nên không chắc kịch bản này thực sự kích hoạt ENTITLEMENT_LOSS nếu oracle chỉ dùng các giỏ đã liệt kê.
- đề xuất sửa: Đổi label_kind thành CROSS_TEAM_CONFLICT. Đồng thời điều chỉnh price hoặc giỏ test để đảm bảo invariant ENTITLEMENT_LOSS chắc chắn được bắt: ví dụ hạ price xuống dưới 1.120.000đ để giỏ mixed có sẵn (AIRCHEF6-DEN + GLOW-SERUM, tổng 380k) cũng rơi dưới ngưỡng 1.500.000đ ở giá mới nhưng vượt ngưỡng ở giá contract cũ; hoặc bổ sung một giỏ đơn lẻ chỉ chứa FS-MK-AIRCHEF6-DEN vào carts.mixed của CT-1111-MARKETPLACE để đảm bảo ma trận giỏ hàng phản ánh đúng việc 'mua 1 nồi mất voucher' như story mô tả.

