# Kiểm định kịch bản (sub-agent độc lập, mỗi mẫu một sub-agent)

45 mẫu: PASS 38 · REVISE 7 · REJECT 0 · lỗi 0 · độ thật trung bình 4.3/5 · claude-cli/sonnet · ~$6.59

| Họ | Mẫu | PASS | REVISE | REJECT | Độ thật | Tiêu chí hay trượt |
|---|---|---|---|---|---|---|
| FLASH_DEEPER_CROSSES_THRESHOLD | 3 | 0 | 3 | 0 | 4.0 | expected_detection_sensible (1) |
| PLATFORM_CATEGORY_SCOPE | 5 | 5 | 0 | 0 | 4.2 | - |
| SHOP_TYPE_DOWNGRADE | 6 | 6 | 0 | 0 | 4.5 | - |
| CATEGORY_PARENT_UNASSIGNED | 8 | 8 | 0 | 0 | 4.9 | - |
| CATEGORY_MOVED | 3 | 2 | 1 | 0 | 4.0 | expected_detection_sensible (1) |
| FREESHIP_THRESHOLD | 3 | 1 | 2 | 0 | 4.3 | expected_detection_sensible (2) |
| FREESHIP_PROVIDER_LIST | 4 | 4 | 0 | 0 | 4.0 | - |
| UNPLANNED_STACKING | 3 | 3 | 0 | 0 | 4.0 | - |
| GDWEEK_SCOPE | 4 | 3 | 1 | 0 | 3.8 | label_consistent (1) |
| CONTRACT_CONFIG_LAG | 2 | 2 | 0 | 0 | 4.5 | - |
| CONTROL_BENIGN_AUDITED | 4 | 4 | 0 | 0 | 4.5 | - |

## Mẫu không PASS

### FLASH_DEEPER_CROSSES_THRESHOLD-01: REVISE (độ thật 4/5)
- Câu 'tổng giá khách trả có khi còn cao hơn trước khi giảm sâu' không khớp với số liệu đã cho: giá giảm 300.000đ (1.790.000→1.490.000) trong khi voucher mất chỉ 100.000đ, nên net giá sau giảm (1.490.000đ) vẫn thấp hơn net giá trước giảm có voucher (1.690.000đ) ở mọi kịch bản giỏ 1 sản phẩm hay cộng thêm SAN10. Với giá flash gốc cố định 1.790.000đ trong contract, không có cách chọn params.price nào (miễn vẫn dưới ngưỡng 1.500.000đ) khiến tổng giá sau cao hơn trước, vì khoảng cách giá gốc–ngưỡng (290.000đ) luôn lớn hơn giá trị voucher (100.000đ). Đây là lời khẳng định sai lệch với dữ kiện, dù invariant cốt lõi (mất entitlement voucher) vẫn đúng và đáng phát hiện.
- đề xuất sửa: Giữ nguyên nhãn CROSS_TEAM_CONFLICT và toàn bộ cấu trúc steps/inject, chỉ sửa câu trong 'slip': bỏ khẳng định 'tổng giá khách trả có khi còn cao hơn trước khi giảm sâu' (sai với số liệu vì giá giảm 300k > voucher mất 100k nên net luôn thấp hơn). Thay bằng mô tả đúng hậu quả: 'khách mua 1 nồi bất ngờ mất voucher shop 100.000đ dù giá flash đã giảm sâu hơn, làm giá trị khuyến mãi thực nhận thấp hơn kỳ vọng marketing truyền thông (giảm sâu + voucher)' — tập trung vào ENTITLEMENT_LOSS thay vì so sánh tổng tiền cuối cùng.

### FLASH_DEEPER_CROSSES_THRESHOLD-02: REVISE (độ thật 4/5)
- Câu 'tổng giá khách trả có khi còn cao hơn trước khi giảm sâu' trong trường slip không được số liệu hỗ trợ: với giá mới 1.450.000đ, dù mất voucher AIRCHEF100K (100k) hoặc cả SAN10, tổng tiền khách trả vẫn luôn thấp hơn giá cũ 1.790.000đ trừ voucher (1.690.000đ hoặc 1.540.000đ nếu cộng dồn). Nên bỏ hoặc sửa câu này để tránh phóng đại hệ quả, chỉ giữ thông điệp cốt lõi là 'khách mất voucher 100k dù giá sản phẩm đã giảm sâu hơn'.
- Ranh giới giữa CONFIG_DRIFT (giá flash lệch khỏi đúng số trong contract do chính merchandising sở hữu) và CROSS_TEAM_CONFLICT (vi phạm ngưỡng voucher do Seller Ops sở hữu) hơi mờ; nên làm rõ trong story rằng giá flash coi như biến số thương lượng được, phần vi phạm chính là ảnh hưởng chéo tới ngưỡng voucher của Seller Ops, để tránh người đọc hiểu nhầm đây chỉ là lỗi tự thân của merchandising.
- đề xuất sửa: Giữ nguyên cấu trúc và nhãn CROSS_TEAM_CONFLICT, nhưng sửa trường 'slip': bỏ câu 'tổng giá khách trả có khi còn cao hơn trước khi giảm sâu' (không đúng với số liệu cho trước); thay bằng mô tả chính xác hơn, ví dụ: 'Khách mua đúng 1 nồi ở giá mới 1.450.000đ không đạt ngưỡng 1.500.000đ nên mất voucher shop 100.000đ – phần lợi từ giá giảm sâu bị voucher mất đi bào mòn, dù tổng tiền khách trả vẫn thấp hơn giá cũ'. Đồng thời có thể thêm một câu trong story làm rõ rằng giá flash vốn ghi cố định trong contract, việc merchandising hạ thêm là thỏa thuận ngoài contract gốc nên chưa kịp đồng bộ ngưỡng voucher của Seller Ops, để nhãn CROSS_TEAM_CONFLICT (thay vì CONFIG_DRIFT) rõ ràng hơn.

### FLASH_DEEPER_CROSSES_THRESHOLD-03: REVISE (độ thật 4/5)
- expected_detection_sensible: Invariant ENTITLEMENT_LOSS hợp lý (khách mất voucher AIRCHEF100K vì cart dưới ngưỡng 1.500.000đ). Nhưng câu 'tổng giá khách trả có khi còn cao hơn trước khi giảm giá sâu' SAI về số học với tham số này: mức giảm giá flash là 400.000đ (1.790.000→1.390.000) lớn hơn giá trị voucher mất đi (100.000đ), nên dù mất voucher, khách vẫn trả ít hơn so với trước khi giảm sâu (1.390.000đ < 1.690.000đ = 1.790.000-100.000). Vì threshold (1.500.000) thấp hơn (giá cũ - voucher) = 1.690.000, không có cách nào chọn giá mới để claim này đúng. Đây là lỗi logic nghiệp vụ cần sửa.
- Câu 'tổng giá khách trả có khi còn cao hơn trước khi giảm giá sâu' không khả thi về mặt số học với bộ tham số hiện tại: mức giảm giá flash (400.000đ) luôn lớn hơn giá trị voucher mất đi (100.000đ) vì threshold (1.500.000đ) thấp hơn (giá cũ trừ voucher) = 1.690.000đ. Cần sửa narrative hoặc tham số.
- Ranh giới nhãn CROSS_TEAM_CONFLICT vs CONFIG_DRIFT hơi mờ vì bản thân giá live của merchandising cũng lệch đúng con số đã ký trong contract (1.790.000đ) mà không amend – nên gọi là 'config drift của merchandising gây hệ quả chéo' sẽ rõ ràng hơn.
- đề xuất sửa: Sửa câu slip: bỏ hoặc thay 'tổng giá khách trả có khi còn cao hơn trước khi giảm giá sâu' bằng mô tả đúng bản chất, ví dụ: 'khách tưởng được hưởng cả giá giảm sâu lẫn voucher 100K nhưng vì giá mới dưới ngưỡng nên bị âm thầm từ chối voucher, không đạt mức giá tối ưu như kỳ vọng dù tổng vẫn thấp hơn giá cũ'. Đồng thời có thể làm rõ trong root_cause/criteria rằng đây là ca biên giữa CONFIG_DRIFT (giá lệch contract) và CROSS_TEAM_CONFLICT (ảnh hưởng ngưỡng voucher của seller_ops) để tránh tranh cãi khi gán nhãn.

### CATEGORY_MOVED-01: REVISE (độ thật 4/5)
- expected_detection_sensible: ENTITLEMENT_LOSS hợp lý (TZ-BUDS rời khỏi dien-tu nên mất FS-MK-SAN10, kể cả trong cart mixed ['FS-MK-TZ-BUDS','FS-MK-PINPRO-20K'] vì PinPro cũng fail do shop_type=normal). Nhưng ELIGIBILITY_LEAK không có cơ sở: không contract nào scope theo 'my-pham' hoặc 'cham-soc-da' nên sản phẩm không chiếm được ưu đãi nào mới sau khi đổi ngành — invariant này là thừa, không thực sự xảy ra trong ma trận giỏ đã cho.
- expected_new_invariants liệt kê cả ELIGIBILITY_LEAK nhưng không có promotion nào scope theo my-pham/cham-soc-da trong 3 contract, nên invariant này không thể manifest trong ma trận giỏ đã cho — chỉ ENTITLEMENT_LOSS là thực sự xảy ra.
- Chỉ có 1 bước (t1) nên không có tương tác thật giữa hai team; nhãn CROSS_TEAM_CONFLICT đúng về hậu quả nhưng nên làm rõ trong narrative rằng hậu quả xuyên team mới là lý do dùng nhãn này, tránh nhầm với CONFIG_DRIFT.
- đề xuất sửa: Bỏ ELIGIBILITY_LEAK khỏi expected_new_invariants (chỉ giữ ENTITLEMENT_LOSS), vì theo contract hiện có không có promotion nào scope theo 'my-pham' hay 'cham-soc-da' để tạo ra leak thực sự; nếu muốn giữ leak, cần thêm/chỉnh một contract có scope chạm tới my-pham hoặc đổi 'to' sang một category khác đang được một promotion khác nhắm tới (vd. 'gia-dung') để tạo leak thật.

### FREESHIP_THRESHOLD-02: REVISE (độ thật 4/5)
- expected_detection_sensible: root_cause chỉ rõ field bị đổi là rules[item_subtotal] với giá trị ngưỡng (threshold VALUE), và inject_source với op='value' chỉ set lại value, giữ nguyên attribute 'item_subtotal' (không đổi sang item_total). Nhưng expected_new_invariants lại ghi 'FREESHIP_THRESHOLD_BASE' - tên này gợi ý kiểm tra thuộc tính nền (item_subtotal vs item_total), tức nhánh op='base-item_total', không phải nhánh giá trị ngưỡng đang dùng ở đây. Có vẻ bị dán nhầm từ biến thể khác trong cùng family (FREESHIP_THRESHOLD -01 kiểm base, -02 này kiểm value).
- expected_new_invariants ghi 'FREESHIP_THRESHOLD_BASE' nhưng thay đổi thực tế (op='value') chỉ sửa giá trị ngưỡng, không đổi thuộc tính base (item_subtotal/item_total) -> tên invariant kỳ vọng không khớp với lỗi được inject, nghi copy-paste từ biến thể op='base-item_total' khác trong cùng family.
- đề xuất sửa: Giữ nguyên story, actor, params và label (CONFIG_DRIFT) vì các phần này hợp lý và inject_source khớp đúng câu chuyện. Chỉ cần sửa expected_new_invariants từ 'FREESHIP_THRESHOLD_BASE' thành tên invariant đúng ngữ nghĩa cho việc kiểm tra giá trị ngưỡng (vd 'FREESHIP_THRESHOLD_VALUE'), để khớp với root_cause (rules[item_subtotal] value) và nhánh inject op='value' đang dùng, tránh nhầm với biến thể kiểm tra thuộc tính base (item_subtotal vs item_total) của family FREESHIP_THRESHOLD.

### FREESHIP_THRESHOLD-03: REVISE (độ thật 4/5)
- expected_detection_sensible: Tên invariant kỳ vọng 'FREESHIP_THRESHOLD_BASE' gây hiểu lầm: mẫu này chỉ đổi giá trị ngưỡng (op='value', vẫn giữ comparator 'gte' trên item_subtotal), không đổi trường cơ sở (base) sang item_total như nhánh 'base-item_total'. Nên đặt tên invariant phản ánh đúng việc so khớp giá trị ngưỡng (vd FREESHIP_THRESHOLD_VALUE) để tránh lẫn với sample kiểm tra đổi base.
- Tên invariant kỳ vọng 'FREESHIP_THRESHOLD_BASE' không phản ánh đúng bản chất lỗi (sai giá trị ngưỡng) vì nhánh inject dùng là 'value' chứ không phải 'base-item_total'; dễ gây nhầm lẫn giữa các biến thể trong family FREESHIP_THRESHOLD.
- đề xuất sửa: Đổi tên expected_new_invariants từ FREESHIP_THRESHOLD_BASE thành một tên phản ánh đúng việc so khớp giá trị ngưỡng (ví dụ FREESHIP_THRESHOLD_VALUE), giữ nguyên toàn bộ story, params, steps và nhãn CONFIG_DRIFT vì các phần này đã hợp lý và khớp inject.

### GDWEEK_SCOPE-02: REVISE (độ thật 3/5)
- label_consistent (đề xuất CONFIG_DRIFT): Lỗi nằm hoàn toàn trong phạm vi sở hữu của category: GDW8 (promotion do category sở hữu) bị gỡ điều kiện shop_types mà CT-GIADUNG-WEEK quy định rõ (['preferred','normal']). Oracle phát hiện được chỉ bằng cách so trực tiếp live-config GDW8 với CT-GIADUNG-WEEK, không cần mô phỏng cộng dồn hai team. Bản sửa cũng chỉ cần category khôi phục lại scope của chính mình, Seller Ops không cần thay đổi gì. Đây là mẫu CONFIG_DRIFT điển hình (team tự lệch hợp đồng của mình); tác động chéo tới ngân sách Brand Day chỉ là hệ quả, không phải cơ chế lỗi cần mô phỏng cross-team. Nên dành CROSS_TEAM_CONFLICT cho case mà so hợp đồng riêng từng team không đủ phát hiện, phải mô phỏng giỏ hàng/cộng dồn mới lộ ra.
- label_kind đang là CROSS_TEAM_CONFLICT nhưng cơ chế lỗi và cách sửa chỉ nằm trong phạm vi hợp đồng của category (so trực tiếp GDW8 vs CT-GIADUNG-WEEK là đủ phát hiện và đủ để sửa) -> nên là CONFIG_DRIFT.
- Story khẳng định cả AirChef và Sunhouse 'đang có Brand Day -20% của Seller Ops', nhưng theo CT-BRANDDAY-AIRCHEF, promotion FS-MK-BD-AIRCHEF20 chỉ scope cho shop airchef, Sunhouse không có Brand Day. Claim này sai dữ liệu thế giới, cần sửa.
- Vì Sunhouse không có Brand Day, câu 'ngân sách hai campaign cùng cháy' chỉ đúng cho AirChef, không đúng cho Sunhouse; với Sunhouse hệ quả chỉ là GDW8 bị áp sai phạm vi (giảm thêm 8% không đúng hợp đồng), không phải xung đột ngân sách hai bên.
- đề xuất sửa: Sửa label_kind thành CONFIG_DRIFT (root cause và cách sửa đều nằm trong phạm vi hợp đồng CT-GIADUNG-WEEK của category; việc va chạm ngân sách Brand Day chỉ là hệ quả minh hoạ mức độ nghiêm trọng, không phải cơ chế phát hiện). Đồng thời sửa story: chỉ nói AirChef (không phải Sunhouse) đang có Brand Day -20% của Seller Ops và bị cộng dồn 20%+8%; với Sunhouse chỉ nêu là bị áp GDW8 sai phạm vi (giảm thêm 8% ngoài kế hoạch cho Mall) mà không có ngân sách Brand Day bị ảnh hưởng, hoặc bỏ Sunhouse khỏi ví dụ để tránh sai dữ liệu."

