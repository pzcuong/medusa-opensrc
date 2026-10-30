# Dataset marketplace 11.11 (CT-1111-MARKETPLACE, CT-BRANDDAY-AIRCHEF, CT-GIADUNG-WEEK)

95 mẫu, 23 họ lỗi. Phát hiện đúng: 95/95. Gắn đúng team gây lỗi: 95/95. Giỏ thật khớp mô phỏng: 94/95 giỏ so được. Lỗi khi chạy: 0.

| Họ lỗi | Team gây lỗi | Loại (nhãn) | Mẫu | Kịch bản PASS kiểm định | Phát hiện đúng | Gắn đúng team | Giỏ thật khớp |
|---|---|---|---|---|---|---|---|
| FLASH_PRICE_TYPO | merchandising | CONFIG_DRIFT | 8 | 8/8 | 100% | 100% | 8/8 |
| FLASH_VARIANT_MISSING | merchandising | CONFIG_DRIFT | 4 | 4/4 | 100% | 100% | 4/4 |
| FLASH_DEEPER_CROSSES_THRESHOLD | merchandising | CONFIG_DRIFT | 3 | 3/3 | 100% | 100% | 3/3 |
| SHOP_VOUCHER_WRONG_SHOP | seller_ops | CONFIG_DRIFT | 5 | 5/5 | 100% | 100% | 5/5 |
| PLATFORM_CATEGORY_SCOPE | marketing | CONFIG_DRIFT | 5 | 5/5 | 100% | 100% | 5/5 |
| PLATFORM_SHOP_TYPE_SCOPE | marketing | CONFIG_DRIFT | 4 | 4/4 | 100% | 100% | 4/4 |
| SHOP_TYPE_DOWNGRADE | seller_ops | CROSS_TEAM_CONFLICT | 4 | 4/4 | 100% | 100% | 4/4 |
| CATEGORY_PARENT_UNASSIGNED | merchandising | CROSS_TEAM_CONFLICT | 7 | 7/7 | 100% | 100% | 7/7 |
| CATEGORY_MOVED | merchandising | CROSS_TEAM_CONFLICT | 3 | 3/3 | 100% | 100% | 3/3 |
| FREESHIP_THRESHOLD | marketing | CONFIG_DRIFT | 3 | 3/3 | 100% | 100% | 3/3 |
| FREESHIP_PROVIDER_LIST | logistics | CROSS_TEAM_CONFLICT | 4 | 4/4 | 100% | 100% | 4/4 |
| NEW_PROVIDER_UNDECLARED | logistics | CROSS_TEAM_CONFLICT | 3 | 3/3 | 100% | 100% | 3/3 |
| FREESHIP_PROGRAM_TAG | seller_ops | CROSS_TEAM_CONFLICT | 9 | 9/9 | 100% | 100% | 9/9 |
| BUDGET_TYPO | finance | CONFIG_DRIFT | 5 | 5/5 | 100% | 100% | 5/5 |
| SEGMENT_RULE | marketing | CONFIG_DRIFT | 2 | 2/2 | 100% | 100% | 1/2 |
| MIN_SPEND_TYPO | seller_ops, marketing | CONFIG_DRIFT | 4 | 4/4 | 100% | 100% | 4/4 |
| VALUE_TYPO | marketing, seller_ops | CONFIG_DRIFT | 4 | 4/4 | 100% | 100% | 4/4 |
| UNPLANNED_STACKING | category | CROSS_TEAM_CONFLICT | 3 | 3/3 | 100% | 100% | 3/3 |
| PROMO_PAUSED | marketing, seller_ops | MISSING_CONFIG | 3 | 3/3 | 100% | 100% | 3/3 |
| BRANDDAY_SCOPE | seller_ops | CONFIG_DRIFT | 3 | 3/3 | 100% | 100% | 3/3 |
| GDWEEK_SCOPE | category | CONFIG_DRIFT | 4 | 4/4 | 100% | 100% | 4/4 |
| CONTRACT_REVISION | seller_ops, category | CONTRACT_CONFLICT | 3 | 3/3 | 100% | 100% | 3/3 |
| CONTRACT_CONFIG_LAG | category | CONFIG_DRIFT | 2 | 2/2 | 100% | 100% | 2/2 |

File: `samples.jsonl` (dữ liệu agent được đọc: audit, phát hiện mới so với baseline, delta mô phỏng, giỏ hàng thật), `labels.jsonl` (đáp án, chỉ evaluator đọc), `baseline.json`.
