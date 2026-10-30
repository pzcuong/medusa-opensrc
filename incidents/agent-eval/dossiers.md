## Giá flash của FS-MK-AIRCHEF6-DEN là 179000, contract duyệt 1790000; khách trả 179000, lệch -1611000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-DEN là 179000, contract duyệt 1790000; khách trả 179000, lệch -1611000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 179000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 179000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 179000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 179000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 179000 -> 1790000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-AIRCHEF6-DEN là 17900000, contract duyệt 1790000; engine lấy giá niêm yết 2490000 vì thấp hơn, khách mất ưu đãi flash 700000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-DEN là 17900000, contract duyệt 1790000; engine lấy giá niêm yết 2490000 vì thấp hơn, khách mất ưu đãi flash 700000" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 17900000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 17900000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 17900000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 17900000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 17900000 -> 1790000; các giá khác giữ nguyên) (duyệt: merchandising)

## Giá flash của FS-MK-AIRCHEF6-TRANG là 179000, contract duyệt 1790000; khách trả 179000, lệch -1611000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-TRANG là 179000, contract duyệt 1790000; khách trả 179000, lệch -1611000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 179000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 179000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 179000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 179000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 179000 -> 1790000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-AIRCHEF6-TRANG là 17900000, contract duyệt 1790000; engine lấy giá niêm yết 2490000 vì thấp hơn, khách mất ưu đãi flash 700000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-TRANG là 17900000, contract duyệt 1790000; engine lấy giá niêm yết 2490000 vì thấp hơn, khách mất ưu đãi flash 700000" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 17900000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 17900000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 17900000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 17900000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 17900000 -> 1790000; các giá khác giữ nguyên) (duyệt: merchandising)

## Giá flash của FS-MK-HOMELUX-V8 là 269000, contract duyệt 2690000; khách trả 269000, lệch -2421000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-HOMELUX-V8 là 269000, contract duyệt 2690000; khách trả 269000, lệch -2421000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 269000 -> 2690000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 269000 -> 2690000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 269000 -> 2690000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 269000 -> 2690000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 269000 -> 2690000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-HOMELUX-V8 là 26900000, contract duyệt 2690000; engine lấy giá niêm yết 3200000 vì thấp hơn, khách mất ưu đãi flash 510000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-HOMELUX-V8 là 26900000, contract duyệt 2690000; engine lấy giá niêm yết 3200000 vì thấp hơn, khách mất ưu đãi flash 510000" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 26900000 -> 2690000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 26900000 -> 2690000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 26900000 -> 2690000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 26900000 -> 2690000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: 26900000 -> 2690000; các giá khác giữ nguyên) (duyệt: merchandising)

## Giá flash của FS-MK-WATCHX-S3 là 189000, contract duyệt 1890000; khách trả 189000, lệch -1701000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-WATCHX-S3 là 189000, contract duyệt 1890000; khách trả 189000, lệch -1701000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 189000 -> 1890000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 189000 -> 1890000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 189000 -> 1890000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 189000 -> 1890000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 189000 -> 1890000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-WATCHX-S3 là 18900000, contract duyệt 1890000; engine lấy giá niêm yết 2190000 vì thấp hơn, khách mất ưu đãi flash 300000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-WATCHX-S3 là 18900000, contract duyệt 1890000; engine lấy giá niêm yết 2190000 vì thấp hơn, khách mất ưu đãi flash 300000" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 18900000 -> 1890000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 18900000 -> 1890000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 18900000 -> 1890000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 18900000 -> 1890000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: 18900000 -> 1890000; các giá khác giữ nguyên) (duyệt: merchandising)

## FS-MK-AIRCHEF6-DEN không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2490000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "FS-MK-AIRCHEF6-DEN không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2490000" vi phạm FLASH_PRICE_COVERS_ALL_VARIANTS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: không có -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: không có -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: không có -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: không có -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: không có -> 1790000; các giá khác giữ nguyên) (duyệt: merchandising, seller_ops)

## FS-MK-AIRCHEF6-TRANG không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2490000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "FS-MK-AIRCHEF6-TRANG không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2490000" vi phạm FLASH_PRICE_COVERS_ALL_VARIANTS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: không có -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: không có -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: không có -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: không có -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: không có -> 1790000; các giá khác giữ nguyên) (duyệt: merchandising, seller_ops)

## FS-MK-HOMELUX-V8 không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 3200000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "FS-MK-HOMELUX-V8 không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 3200000" vi phạm FLASH_PRICE_COVERS_ALL_VARIANTS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: không có -> 2690000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: không có -> 2690000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: không có -> 2690000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: không có -> 2690000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5MY1AW97K35C9XZDK34JBV9: không có -> 2690000; các giá khác giữ nguyên) (duyệt: merchandising, seller_ops)

## FS-MK-WATCHX-S3 không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2190000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "FS-MK-WATCHX-S3 không có giá flash trong "FS1111-MK Flash 20-22h", khách trả giá niêm yết 2190000" vi phạm FLASH_PRICE_COVERS_ALL_VARIANTS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: không có -> 1890000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: không có -> 1890000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: không có -> 1890000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: không có -> 1890000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 1/4 giá: pset_01M5N3D114TS96Q6T8SQRW5SWB: không có -> 1890000; các giá khác giữ nguyên) (duyệt: merchandising, seller_ops)

## Giá flash của FS-MK-AIRCHEF6-DEN là 1490000, contract duyệt 1790000; khách trả 1490000, lệch -300000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-DEN là 1490000, contract duyệt 1790000; khách trả 1490000, lệch -300000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1490000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1490000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1490000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1490000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1490000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1490000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1490000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1490000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1490000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1490000 -> 1790000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-AIRCHEF6-DEN là 1450000, contract duyệt 1790000; khách trả 1450000, lệch -340000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-DEN là 1450000, contract duyệt 1790000; khách trả 1450000, lệch -340000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1450000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1450000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1450000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1450000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1450000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1450000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1450000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1450000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1450000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1450000 -> 1790000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Giá flash của FS-MK-AIRCHEF6-DEN là 1390000, contract duyệt 1790000; khách trả 1390000, lệch -400000 so với contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST price_list "FS1111-MK Flash 20-22h". Phát hiện "Giá flash của FS-MK-AIRCHEF6-DEN là 1390000, contract duyệt 1790000; khách trả 1390000, lệch -400000 so với contract" vi phạm FLASH_PRICE_MATCHES_CONTRACT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1390000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1390000 -> 1790000; các giá khác giữ nguyên)" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1390000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1390000 -> 1790000; các giá khác giữ nguyên)" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1390000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1390000 -> 1790000; các giá khác giữ nguyên)

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1390000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1390000 -> 1790000; các giá khác giữ nguyên) | có | có | có | 0 |

Đề xuất: Đưa price_list "FS1111-MK Flash 20-22h" về trạng thái trước thay đổi của merchandising (chỉ đổi 2/4 giá: pset_01M5MY19EYE5QT755QM6CBZ41P: 1390000 -> 1790000; pset_01M5MY19EZ2VRVFJ0S4X5DH6Y5: 1390000 -> 1790000; các giá khác giữ nguyên). Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, merchandising trình sửa contract thay vì áp (duyệt: merchandising)

## Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Phạm vi áp dụng của FS-MK-AIRCHEF100K lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-GLOW30K lệch contract ở: items.product.collection_id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-GLOW30K". Phát hiện "Phạm vi áp dụng của FS-MK-GLOW30K lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-GLOW30K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-BABY40K lệch contract ở: items.product.collection_id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-BABY40K". Phát hiện "Phạm vi áp dụng của FS-MK-BABY40K lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-BABY40K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-BABY40K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-BABY40K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-BABY40K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-BABY40K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-BABY40K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phạm vi áp dụng của FS-MK-SAN10 lệch contract ở: items.product.tags.id" vi phạm PROMOTION_SCOPE_RULES của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 60 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: shop_type_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 2 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-airchef-mini"; seller_ops (sellerops@flashsre.dev) POST product "fs-mk-airchef-6l". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 60 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: shop_type_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước | có | có | có | 0 |
| Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của seller_ops | không | không | không | 0 |
| Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của seller_ops | không | không | không | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing, category phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing, category)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: shop_type_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-homelux-v8". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: shop_type_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-GDW8 áp NGOÀI phạm vi contract trên 20 giỏ (FS-MK-SUNHOUSE-NC) do thuộc tính sản phẩm bị đổi: shop_type_tag
- Contract: CT-GIADUNG-WEEK | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-sunhouse-noicom". Phát hiện "FS-MK-GDW8 áp NGOÀI phạm vi contract trên 20 giỏ (FS-MK-SUNHOUSE-NC) do thuộc tính sản phẩm bị đổi: shop_type_tag" vi phạm ELIGIBILITY_LEAK của CT-GIADUNG-WEEK. Phép thử nhân quả: "Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, category phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, category)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: shop_type_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-watchx-s3". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: shop_type_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 30 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-airchef-6l". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 30 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 30 giỏ (FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-airchef-mini". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 30 giỏ (FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-homelux-v8". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing, category phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing, category)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-TZ-BUDS) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-techzone-buds". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-TZ-BUDS) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-SUNHOUSE-NC) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-sunhouse-noicom". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-SUNHOUSE-NC) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-sunhouse-noicom" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-watchx-s3". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-BABYCARE-XL) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-babycare-xl". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 10 giỏ (FS-MK-BABYCARE-XL) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-TZ-BUDS) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-techzone-buds". Phát hiện "FS-MK-SAN10 BỊ MẤT dù contract cho hưởng trên 20 giỏ (FS-MK-TZ-BUDS) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-SAN10 áp NGOÀI phạm vi contract trên 10 giỏ (FS-MK-GLOW-SERUM) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-glow-serum". Phát hiện "FS-MK-SAN10 áp NGOÀI phạm vi contract trên 10 giỏ (FS-MK-GLOW-SERUM) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ELIGIBILITY_LEAK của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, marketing)

## FS-MK-GDW8 áp NGOÀI phạm vi contract trên 10 giỏ (FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: category_assignment
- Contract: CT-GIADUNG-WEEK | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: merchandising (merch@flashsre.dev) POST product "fs-mk-momshop-gold". Phát hiện "FS-MK-GDW8 áp NGOÀI phạm vi contract trên 10 giỏ (FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: category_assignment" vi phạm ELIGIBILITY_LEAK của CT-GIADUNG-WEEK. Phép thử nhân quả: "Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của merchandising" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của merchandising" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của merchandising

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của merchandising | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của merchandising. Bản sửa này đảo ngược thay đổi của merchandising: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, category phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: merchandising, category)

## Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)" vi phạm FREESHIP_THRESHOLD_BASE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)" vi phạm FREESHIP_THRESHOLD_BASE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)" vi phạm FREESHIP_THRESHOLD_BASE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Danh sách provider được freeship lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Danh sách provider được freeship lệch contract" vi phạm FREESHIP_PROVIDERS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract (duyệt: marketing)

## Danh sách provider được freeship lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Danh sách provider được freeship lệch contract" vi phạm FREESHIP_PROVIDERS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract (duyệt: marketing)

## Danh sách provider được freeship lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Danh sách provider được freeship lệch contract" vi phạm FREESHIP_PROVIDERS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract (duyệt: marketing)

## Danh sách provider được freeship lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "Danh sách provider được freeship lệch contract" vi phạm FREESHIP_PROVIDERS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract (duyệt: marketing)

## Provider "FS-MK-X-Ninja Van" đang bán ở vn nhưng chương trình freeship không khai báo
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST shipping_option "FS-MK-X-Ninja Van". Phát hiện "Provider "FS-MK-X-Ninja Van" đang bán ở vn nhưng chương trình freeship không khai báo" vi phạm PROVIDER_DECLARED_IN_FREESHIP của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa shipping_option "FS-MK-X-Ninja Van" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa shipping_option "FS-MK-X-Ninja Van" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa shipping_option "FS-MK-X-Ninja Van" về trạng thái trước thay đổi của logistics

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa shipping_option "FS-MK-X-Ninja Van" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa shipping_option "FS-MK-X-Ninja Van" về trạng thái trước thay đổi của logistics. Bản sửa này đảo ngược thay đổi của logistics: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: logistics, marketing)

## Provider "FS-MK-X-BEST Express" đang bán ở vn nhưng chương trình freeship không khai báo
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST shipping_option "FS-MK-X-BEST Express". Phát hiện "Provider "FS-MK-X-BEST Express" đang bán ở vn nhưng chương trình freeship không khai báo" vi phạm PROVIDER_DECLARED_IN_FREESHIP của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa shipping_option "FS-MK-X-BEST Express" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa shipping_option "FS-MK-X-BEST Express" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa shipping_option "FS-MK-X-BEST Express" về trạng thái trước thay đổi của logistics

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa shipping_option "FS-MK-X-BEST Express" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa shipping_option "FS-MK-X-BEST Express" về trạng thái trước thay đổi của logistics. Bản sửa này đảo ngược thay đổi của logistics: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: logistics, marketing)

## Provider "FS-MK-X-GrabExpress" đang bán ở vn nhưng chương trình freeship không khai báo
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: logistics (logistics@flashsre.dev) POST shipping_option "FS-MK-X-GrabExpress". Phát hiện "Provider "FS-MK-X-GrabExpress" đang bán ở vn nhưng chương trình freeship không khai báo" vi phạm PROVIDER_DECLARED_IN_FREESHIP của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa shipping_option "FS-MK-X-GrabExpress" về trạng thái trước thay đổi của logistics" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa shipping_option "FS-MK-X-GrabExpress" về trạng thái trước thay đổi của logistics" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa shipping_option "FS-MK-X-GrabExpress" về trạng thái trước thay đổi của logistics

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa shipping_option "FS-MK-X-GrabExpress" về trạng thái trước thay đổi của logistics | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa shipping_option "FS-MK-X-GrabExpress" về trạng thái trước thay đổi của logistics. Bản sửa này đảo ngược thay đổi của logistics: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: logistics, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 18 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 2 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-airchef-mini"; seller_ops (sellerops@flashsre.dev) POST product "fs-mk-airchef-6l". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 18 giỏ (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước | có | có | có | 0 |
| Đưa product "fs-mk-airchef-6l" về trạng thái trước thay đổi của seller_ops | không | không | không | 0 |
| Đưa product "fs-mk-airchef-mini" về trạng thái trước thay đổi của seller_ops | không | không | không | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa 2 đối tượng seller_ops vừa sửa (fs-mk-airchef-6l, fs-mk-airchef-mini) về trạng thái trước. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-homelux-v8". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-HOMELUX-V8) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-homelux-v8" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 12 giỏ (FS-MK-TZ-BUDS, FS-MK-PINPRO-20K) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-techzone-buds". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 12 giỏ (FS-MK-TZ-BUDS, FS-MK-PINPRO-20K) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-techzone-buds" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-GLOW-SERUM) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-glow-serum". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-GLOW-SERUM) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-glow-serum" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-watchx-s3". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 6 giỏ (FS-MK-WATCHX-S3) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-watchx-s3" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 12 giỏ (FS-MK-BABYCARE-XL, FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-babycare-xl". Phát hiện "FS-MK-FREESHIP BỊ MẤT dù contract cho hưởng trên 12 giỏ (FS-MK-BABYCARE-XL, FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ENTITLEMENT_LOSS của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-babycare-xl" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 12 giỏ (FS-MK-PINPRO-20K, FS-MK-SONXINH) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-pinpro-20k". Phát hiện "FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 12 giỏ (FS-MK-PINPRO-20K, FS-MK-SONXINH) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ELIGIBILITY_LEAK của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-pinpro-20k" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-pinpro-20k" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-pinpro-20k" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-pinpro-20k" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-pinpro-20k" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 6 giỏ (FS-MK-SONXINH, FS-MK-PINPRO-20K) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-sonxinh-velvet". Phát hiện "FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 6 giỏ (FS-MK-SONXINH, FS-MK-PINPRO-20K) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ELIGIBILITY_LEAK của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-sonxinh-velvet" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-sonxinh-velvet" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-sonxinh-velvet" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-sonxinh-velvet" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-sonxinh-velvet" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 6 giỏ (FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: program_tag
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST product "fs-mk-momshop-gold". Phát hiện "FS-MK-FREESHIP áp NGOÀI phạm vi contract trên 6 giỏ (FS-MK-MOMSHOP-GOLD) do thuộc tính sản phẩm bị đổi: program_tag" vi phạm ELIGIBILITY_LEAK của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | không | không | không | 0 |

Đề xuất: Đưa product "fs-mk-momshop-gold" về trạng thái trước thay đổi của seller_ops. Bản sửa này đảo ngược thay đổi của seller_ops: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: seller_ops, marketing)

## Ngân sách fs-mk-shop là 50000, thấp hơn mức tối thiểu 50000000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: finance (finance@flashsre.dev) POST campaign "fs-mk-shop". Phát hiện "Ngân sách fs-mk-shop là 50000, thấp hơn mức tối thiểu 50000000" vi phạm BUDGET_LIMIT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa campaign "fs-mk-shop" về trạng thái trước thay đổi của finance" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa campaign "fs-mk-shop" về trạng thái trước thay đổi của finance" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa campaign "fs-mk-shop" về trạng thái trước thay đổi của finance

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa campaign "fs-mk-shop" về trạng thái trước thay đổi của finance | có | có | có | 0 |

Đề xuất: Đưa campaign "fs-mk-shop" về trạng thái trước thay đổi của finance (duyệt: finance)

## Ngân sách fs-mk-san là 100000, thấp hơn mức tối thiểu 100000000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: finance (finance@flashsre.dev) POST campaign "fs-mk-san". Phát hiện "Ngân sách fs-mk-san là 100000, thấp hơn mức tối thiểu 100000000" vi phạm BUDGET_LIMIT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa campaign "fs-mk-san" về trạng thái trước thay đổi của finance" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa campaign "fs-mk-san" về trạng thái trước thay đổi của finance" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa campaign "fs-mk-san" về trạng thái trước thay đổi của finance

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa campaign "fs-mk-san" về trạng thái trước thay đổi của finance | có | có | có | 0 |

Đề xuất: Đưa campaign "fs-mk-san" về trạng thái trước thay đổi của finance (duyệt: finance)

## Ngân sách fs-mk-freeship là 30000, thấp hơn mức tối thiểu 30000000
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: finance (finance@flashsre.dev) POST campaign "fs-mk-freeship". Phát hiện "Ngân sách fs-mk-freeship là 30000, thấp hơn mức tối thiểu 30000000" vi phạm BUDGET_LIMIT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa campaign "fs-mk-freeship" về trạng thái trước thay đổi của finance" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa campaign "fs-mk-freeship" về trạng thái trước thay đổi của finance" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa campaign "fs-mk-freeship" về trạng thái trước thay đổi của finance

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa campaign "fs-mk-freeship" về trạng thái trước thay đổi của finance | có | có | có | 0 |

Đề xuất: Đưa campaign "fs-mk-freeship" về trạng thái trước thay đổi của finance (duyệt: finance)

## Ngân sách fs-mk-brandday là 40000, thấp hơn mức tối thiểu 40000000
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: finance (finance@flashsre.dev) POST campaign "fs-mk-brandday". Phát hiện "Ngân sách fs-mk-brandday là 40000, thấp hơn mức tối thiểu 40000000" vi phạm BUDGET_LIMIT của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa campaign "fs-mk-brandday" về trạng thái trước thay đổi của finance" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa campaign "fs-mk-brandday" về trạng thái trước thay đổi của finance" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa campaign "fs-mk-brandday" về trạng thái trước thay đổi của finance

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa campaign "fs-mk-brandday" về trạng thái trước thay đổi của finance | có | có | có | 0 |

Đề xuất: Đưa campaign "fs-mk-brandday" về trạng thái trước thay đổi của finance (duyệt: finance)

## Ngân sách fs-mk-gdweek là 20000, thấp hơn mức tối thiểu 20000000
- Contract: CT-GIADUNG-WEEK | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: finance (finance@flashsre.dev) POST campaign "fs-mk-gdweek". Phát hiện "Ngân sách fs-mk-gdweek là 20000, thấp hơn mức tối thiểu 20000000" vi phạm BUDGET_LIMIT của CT-GIADUNG-WEEK. Phép thử nhân quả: "Đưa campaign "fs-mk-gdweek" về trạng thái trước thay đổi của finance" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa campaign "fs-mk-gdweek" về trạng thái trước thay đổi của finance" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa campaign "fs-mk-gdweek" về trạng thái trước thay đổi của finance

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa campaign "fs-mk-gdweek" về trạng thái trước thay đổi của finance | có | có | có | 0 |

Đề xuất: Đưa campaign "fs-mk-gdweek" về trạng thái trước thay đổi của finance (duyệt: finance)

## Phân khúc khách của FS-MK-SAN10 lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Phân khúc khách của FS-MK-SAN10 lệch contract" vi phạm PROMOTION_SEGMENT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phân khúc khách của FS-MK-NEWBIE50K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-NEWBIE50K". Phát hiện "Phân khúc khách của FS-MK-NEWBIE50K lệch contract" vi phạm PROMOTION_SEGMENT của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-NEWBIE50K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Đơn tối thiểu của FS-MK-AIRCHEF100K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Đơn tối thiểu của FS-MK-AIRCHEF100K lệch contract" vi phạm PROMOTION_MIN_SPEND của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Đơn tối thiểu của FS-MK-AIRCHEF100K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Đơn tối thiểu của FS-MK-AIRCHEF100K lệch contract" vi phạm PROMOTION_MIN_SPEND của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Đơn tối thiểu của FS-MK-GLOW30K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-GLOW30K". Phát hiện "Đơn tối thiểu của FS-MK-GLOW30K lệch contract" vi phạm PROMOTION_MIN_SPEND của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-GLOW30K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Đơn tối thiểu của FS-MK-SAN10 lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Đơn tối thiểu của FS-MK-SAN10 lệch contract" vi phạm PROMOTION_MIN_SPEND của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Giá trị FS-MK-SAN10 lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Giá trị FS-MK-SAN10 lệch contract" vi phạm PROMOTION_VALUE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Giá trị FS-MK-SAN10 lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "Giá trị FS-MK-SAN10 lệch contract" vi phạm PROMOTION_VALUE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Giá trị FS-MK-NEWBIE50K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-NEWBIE50K". Phát hiện "Giá trị FS-MK-NEWBIE50K lệch contract" vi phạm PROMOTION_VALUE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-NEWBIE50K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-NEWBIE50K" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Giá trị FS-MK-AIRCHEF100K lệch contract
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-AIRCHEF100K". Phát hiện "Giá trị FS-MK-AIRCHEF100K lệch contract" vi phạm PROMOTION_VALUE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-AIRCHEF100K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-AIRCHEF100K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Ưu đãi tự động FS-MK-X-CAT20 ngoài contract đang cộng dồn lên sản phẩm của campaign
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-X-CAT20". Phát hiện "Ưu đãi tự động FS-MK-X-CAT20 ngoài contract đang cộng dồn lên sản phẩm của campaign" vi phạm NO_UNPLANNED_STACKING của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-X-CAT20" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-X-CAT20" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-X-CAT20" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-X-CAT20" về trạng thái trước thay đổi của category | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-X-CAT20" về trạng thái trước thay đổi của category. Bản sửa này đảo ngược thay đổi của category: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, marketing phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: category, marketing)

## Ưu đãi tự động FS-MK-X-CAT25 ngoài contract đang cộng dồn lên sản phẩm của campaign
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-X-CAT25". Phát hiện "Ưu đãi tự động FS-MK-X-CAT25 ngoài contract đang cộng dồn lên sản phẩm của campaign" vi phạm NO_UNPLANNED_STACKING của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-X-CAT25" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-X-CAT25" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-X-CAT25" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-X-CAT25" về trạng thái trước thay đổi của category | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-X-CAT25" về trạng thái trước thay đổi của category. Bản sửa này đảo ngược thay đổi của category: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, chủ điều khoản phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: category)

## Ưu đãi tự động FS-MK-X-CAT5 ngoài contract đang cộng dồn lên sản phẩm của campaign
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CROSS_TEAM_CONTRADICTION** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-X-CAT5". Phát hiện "Ưu đãi tự động FS-MK-X-CAT5 ngoài contract đang cộng dồn lên sản phẩm của campaign" vi phạm NO_UNPLANNED_STACKING của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-X-CAT5" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-X-CAT5" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-X-CAT5" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-X-CAT5" về trạng thái trước thay đổi của category | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-X-CAT5" về trạng thái trước thay đổi của category. Bản sửa này đảo ngược thay đổi của category: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, chủ điều khoản phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback (duyệt: category)

## FS-MK-SAN10 không tồn tại hoặc không active
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-SAN10". Phát hiện "FS-MK-SAN10 không tồn tại hoặc không active" vi phạm PROMOTION_ACTIVE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-SAN10 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-SAN10" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## FS-MK-GLOW30K không tồn tại hoặc không active
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-GLOW30K". Phát hiện "FS-MK-GLOW30K không tồn tại hoặc không active" vi phạm PROMOTION_ACTIVE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-GLOW30K cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GLOW30K" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## FS-MK-FREESHIP không active
- Contract: CT-1111-MARKETPLACE | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: marketing (marketing@flashsre.dev) POST promotion "FS-MK-FREESHIP". Phát hiện "FS-MK-FREESHIP không active" vi phạm FREESHIP_ACTIVE của CT-1111-MARKETPLACE. Phép thử nhân quả: "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing | có | có | có | 0 |
| Chỉnh FS-MK-FREESHIP cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-FREESHIP" về trạng thái trước thay đổi của marketing (duyệt: marketing)

## Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-BD-AIRCHEF20". Phát hiện "Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-BD-AIRCHEF20 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-BD-AIRCHEF20". Phát hiện "Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-BD-AIRCHEF20 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: seller_ops (sellerops@flashsre.dev) POST promotion "FS-MK-BD-AIRCHEF20". Phát hiện "Phạm vi áp dụng của FS-MK-BD-AIRCHEF20 lệch contract ở: items.product.collection_id" vi phạm PROMOTION_SCOPE_RULES của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops | có | có | có | 0 |
| Chỉnh FS-MK-BD-AIRCHEF20 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-BD-AIRCHEF20" về trạng thái trước thay đổi của seller_ops (duyệt: seller_ops)

## FS-MK-GDW8 (campaign khác) cộng dồn lên 40 giỏ của CT-BRANDDAY-AIRCHEF mà contract này không cho phép (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-GDW8". Phát hiện "FS-MK-GDW8 (campaign khác) cộng dồn lên 40 giỏ của CT-BRANDDAY-AIRCHEF mà contract này không cho phép (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vi phạm CROSS_CAMPAIGN_STACKING của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category (duyệt: category)

## FS-MK-GDW8 (campaign khác) cộng dồn lên 40 giỏ của CT-BRANDDAY-AIRCHEF mà contract này không cho phép (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-GDW8". Phát hiện "FS-MK-GDW8 (campaign khác) cộng dồn lên 40 giỏ của CT-BRANDDAY-AIRCHEF mà contract này không cho phép (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vi phạm CROSS_CAMPAIGN_STACKING của CT-BRANDDAY-AIRCHEF. Phép thử nhân quả: "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. Medusa 2.21.2 không có trường trần giảm giá (max discount); voucher % có trần trong contract sẽ vượt trần. Engine áp promotion theo value giảm dần, không theo thứ tự trong contract. Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category (duyệt: category)

## Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id
- Contract: CT-GIADUNG-WEEK | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-GDW8". Phát hiện "Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-GIADUNG-WEEK. Phép thử nhân quả: "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category (duyệt: category)

## Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id
- Contract: CT-GIADUNG-WEEK | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.9) | Quyền: NEEDS_APPROVAL | LLM: rules
- Business Analyst: Kể từ mốc có 1 thay đổi cấu hình: category (category@flashsre.dev) POST promotion "FS-MK-GDW8". Phát hiện "Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id" vi phạm PROMOTION_SCOPE_RULES của CT-GIADUNG-WEEK. Phép thử nhân quả: "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category | có | có | có | 0 |
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Đưa promotion "FS-MK-GDW8" về trạng thái trước thay đổi của category (duyệt: category)

## CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20, nhưng CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-SAN10 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20, nhưng CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-SAN10 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vẫn lệch contract CT-1111-MARKETPLACE.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: marketing, seller_ops)

## CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-SAN10, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-SAN10, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vẫn lệch contract CT-BRANDDAY-AIRCHEF.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: seller_ops, marketing)

## CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20, nhưng CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-NEWBIE50K trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20, nhưng CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-NEWBIE50K trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vẫn lệch contract CT-1111-MARKETPLACE.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: marketing, seller_ops)

## CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-NEWBIE50K, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)
- Contract: CT-BRANDDAY-AIRCHEF | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-BRANDDAY-AIRCHEF không cho cộng FS-MK-NEWBIE50K, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-BD-AIRCHEF20 trên cùng sản phẩm (FS-MK-AIRCHEF6-TRANG, FS-MK-AIRCHEF6-DEN, FS-MK-AIRCHEF-MINI)" vẫn lệch contract CT-BRANDDAY-AIRCHEF.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: seller_ops, marketing)

## CT-1111-MARKETPLACE cho cộng FS-MK-GDW8, nhưng CT-GIADUNG-WEEK không cho cộng FS-MK-SAN10 trên cùng sản phẩm (FS-MK-HOMELUX-V8)
- Contract: CT-1111-MARKETPLACE | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-1111-MARKETPLACE cho cộng FS-MK-GDW8, nhưng CT-GIADUNG-WEEK không cho cộng FS-MK-SAN10 trên cùng sản phẩm (FS-MK-HOMELUX-V8)" vẫn lệch contract CT-1111-MARKETPLACE.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: marketing, category)

## CT-GIADUNG-WEEK không cho cộng FS-MK-SAN10, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-GDW8 trên cùng sản phẩm (FS-MK-HOMELUX-V8)
- Contract: CT-GIADUNG-WEEK | Phán quyết: **CONTRACT_CONFLICT** (tin cậy 0.85) | Quyền: ESCALATE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "CT-GIADUNG-WEEK không cho cộng FS-MK-SAN10, nhưng CT-1111-MARKETPLACE cho cộng FS-MK-GDW8 trên cùng sản phẩm (FS-MK-HOMELUX-V8)" vẫn lệch contract CT-GIADUNG-WEEK.
- Platform Engineer: Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.
- Judge: Không có phương án đạt

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|

Đề xuất: chuyển người phụ trách (duyệt: category, marketing)

## Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id
- Contract: CT-GIADUNG-WEEK | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.75) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "Phạm vi áp dụng của FS-MK-GDW8 lệch contract ở: items.product.categories.id" vẫn lệch contract CT-GIADUNG-WEEK.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract (duyệt: category)

## Giá trị FS-MK-GDW8 lệch contract
- Contract: CT-GIADUNG-WEEK | Phán quyết: **BUSINESS_MISCONFIG** (tin cậy 0.75) | Quyền: AUTO_ELIGIBLE | LLM: rules
- Business Analyst: Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "Giá trị FS-MK-GDW8 lệch contract" vẫn lệch contract CT-GIADUNG-WEEK.
- Platform Engineer: Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới.  Phép thử cho thấy chỉ cần "Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.
- Judge: Chọn: Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract

| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |
|---|---|---|---|---|
| Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract | có | có | có | 0 |

Đề xuất: Chỉnh FS-MK-GDW8 cho khớp đúng điều khoản contract (duyệt: category)
