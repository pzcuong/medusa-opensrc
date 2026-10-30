# Kiểm định kịch bản (sub-agent độc lập, mỗi mẫu một sub-agent)

2 mẫu: PASS 0 · REVISE 2 · REJECT 0 · lỗi 0 · độ thật trung bình 3.0/5 · claude-cli/sonnet · ~$0.44

| Họ | Mẫu | PASS | REVISE | REJECT | Độ thật | Tiêu chí hay trượt |
|---|---|---|---|---|---|---|
| SHOP_TYPE_DOWNGRADE | 1 | 0 | 1 | 0 | 4.0 | expected_detection_sensible (1) |
| FREESHIP_THRESHOLD | 1 | 0 | 1 | 0 | 2.0 | inadvertent (1), label_consistent (1) |

## Mẫu không PASS

### SHOP_TYPE_DOWNGRADE-01: REVISE (độ thật 4/5)
- expected_detection_sensible: Hạ airchef từ mall xuống normal không chỉ gây ENTITLEMENT_LOSS cho FS-MK-SAN10 (mall/preferred_plus/preferred) mà còn khiến airchef bất ngờ ĐỦ điều kiện FS-MK-GDW8 (preferred/normal) — một promotion mà CT-GIADUNG-WEEK chủ ý loại trừ Mall vì 'đã có Brand Day riêng'. Vì FS-MK-BD-AIRCHEF20 không phụ thuộc shop_type nên vẫn áp dụng song song, dẫn tới airchef bị cộng dồn cả Brand Day lẫn GDW8 — vi phạm chủ đích loại trừ giữa hai contract. Đây là hệ quả thứ hai, quan trọng không kém, nhưng expected_new_invariants chỉ liệt kê ENTITLEMENT_LOSS, bỏ sót phần 'gain + chồng khuyến mãi ngoài ý muốn'.
- Thiếu invariant cho hệ quả airchef bất ngờ đủ điều kiện FS-MK-GDW8 sau khi xuống hạng normal, trong khi vẫn giữ FS-MK-BD-AIRCHEF20 (shop-specific, không phụ thuộc shop_type) — gây chồng hai khuyến mãi mà CT-GIADUNG-WEEK chủ ý loại trừ lẫn nhau với Brand Day.
- Do thiết kế scope hiện tại (SAN10 gồm mall/preferred_plus/preferred; GDW8 gồm preferred/normal), bất kỳ hạ cấp nào gây mất SAN10 (chỉ có thể là xuống 'normal') đều tất yếu kéo theo được thêm GDW8 — nên câu chuyện/kỳ vọng cần phản ánh đủ cả hai chiều, không chỉ ENTITLEMENT_LOSS.
- đề xuất sửa: Giữ nguyên premise và label CROSS_TEAM_CONFLICT, nhưng bổ sung vào expected_new_invariants hệ quả thứ hai: airchef sau khi hạ xuống 'normal' sẽ đủ điều kiện FS-MK-GDW8 (do CT-GIADUNG-WEEK gồm shop_type normal/preferred), trong khi vẫn giữ FS-MK-BD-AIRCHEF20 (không phụ thuộc shop_type) — gây cộng dồn hai khuyến mãi mà CT-GIADUNG-WEEK chủ ý loại trừ Mall để tránh trùng với Brand Day. Nên thêm một invariant kiểu ENTITLEMENT_GAIN hoặc STACKING_CONFLICT cho cặp FS-MK-GDW8/FS-MK-BD-AIRCHEF20, đồng thời cập nhật phần 'unnoticed' để nói rõ Category team cũng không lường trước việc shop_type của airchef có thể đổi nên không chủ động loại trừ theo shop cụ thể.

### FREESHIP_THRESHOLD-01: REVISE (độ thật 2/5)
- khâu t1 (logistics): Theo bảng teams, logistics chỉ quản provider/phí ship/vùng giao, không sở hữu rule ngưỡng của promotion freeship (thuộc marketing). Lý do 'được Marketing cấp quyền' là một giả định tiện lợi để hợp thức hóa hành vi ngoài mandate, không có cơ chế ủy quyền nào trong thế giới được mô tả. Đồng thời động cơ 'theo đề nghị Finance giảm chi phí' cho thấy đây là quyết định có chủ đích thay đổi chính sách, không phải thao tác bảo trì đơn thuần bị nhầm field.
- inadvertent: Reason vừa nói 'theo đề nghị giảm chi phí freeship của Finance' (chủ đích thay đổi chính sách) vừa nói slip do 'hai thuộc tính có nhãn gần giống nhau' (nhầm lẫn UI). Hai lý do mâu thuẫn: nếu Finance chủ động đề nghị đổi base để giảm chi phí thì đây là quyết định có chủ đích bỏ qua quy trình duyệt lại contract, không còn là sơ suất thuần túy.
- label_consistent (đề xuất CROSS_TEAM_CONFLICT): FS-MK-FREESHIP do marketing sở hữu; người thực hiện thay đổi (gây lệch contract) là logistics, không phải chủ sở hữu. Theo định nghĩa, CONFIG_DRIFT là team tự làm lệch phạm vi của chính mình; ở đây team khác (logistics) chỉnh điều khoản của team sở hữu khác (marketing) → đúng mẫu CROSS_TEAM_CONFLICT, không phải CONFIG_DRIFT.
- Actor team (logistics) không khớp mandate: rule ngưỡng của FS-MK-FREESHIP thuộc phạm vi marketing (chủ sở hữu contract), logistics không có thẩm quyền chỉnh promotion rule theo bảng teams.
- Nhãn CONFIG_DRIFT không khớp bản chất sự việc: một team khác (logistics) làm lệch điều khoản do team khác (marketing) sở hữu — đúng mẫu CROSS_TEAM_CONFLICT.
- Động cơ hành động mâu thuẫn: vừa là 'đề nghị chủ đích từ Finance để giảm chi phí' (quyết định có chủ ý, bỏ qua duyệt lại contract) vừa là 'nhầm lẫn do nhãn giống nhau' (sơ suất UI) — không nhất quán với tinh thần 'lỗi do sơ suất, không cố ý' của dataset.
- Nếu giữ actor là logistics cho mục đích đối chứng cross-team, cần mô tả rõ cơ chế truy cập hợp lệ (vd: logistics và marketing cùng có quyền sửa cấu hình freeship trong admin vì đây là cấu hình chung giữa hai team), thay vì nói 'được cấp quyền' mơ hồ.
- đề xuất sửa: Sửa theo một trong hai hướng: (1) Giữ actor_team=marketing (chủ sở hữu FS-MK-FREESHIP) tự nhầm đổi item_subtotal→item_total khi thao tác định kỳ cập nhật rule, giữ nguyên lý do 'nhãn admin giống nhau' làm slip thuần túy, bỏ chi tiết 'theo đề nghị Finance' để giữ tính sơ suất; gắn label_kind=CONFIG_DRIFT là hợp lý. Hoặc (2) giữ actor_team=logistics nhưng đổi label_kind=CROSS_TEAM_CONFLICT, và viết lại step t1 để thể hiện rõ đây là xung đột liên team: ví dụ logistics cập nhật cấu hình provider/phí ship hợp lệ trong cùng rule-set chung với marketing, và do giao diện gộp field khiến logistics vô tình đổi luôn thuộc tính threshold_base của marketing — bỏ chi tiết 'được Marketing cấp quyền' và 'đề nghị giảm chi phí Finance' để tránh cảm giác cố ý thay đổi chính sách.

