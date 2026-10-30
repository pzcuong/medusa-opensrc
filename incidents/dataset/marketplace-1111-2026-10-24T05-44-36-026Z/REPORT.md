# Dataset marketplace 11.11 (CT-1111-MARKETPLACE, CT-BRANDDAY-AIRCHEF, CT-GIADUNG-WEEK)

103 mẫu, 24 họ lỗi. Phát hiện đúng: 103/103. Gắn đúng team gây lỗi: 103/103. Lỗi khi chạy: 0.

| Họ lỗi | Team gây lỗi | Loại (nhãn) | Mẫu | Phát hiện đúng | Gắn đúng team |
|---|---|---|---|---|---|
| FLASH_PRICE_TYPO | merchandising | CONFIG_DRIFT | 8 | 100% | 100% |
| FLASH_VARIANT_MISSING | merchandising | CONFIG_DRIFT | 4 | 100% | 100% |
| FLASH_DEEPER_CROSSES_THRESHOLD | merchandising | CROSS_TEAM_CONFLICT | 3 | 100% | 100% |
| SHOP_VOUCHER_WRONG_SHOP | seller_ops | CONFIG_DRIFT | 5 | 100% | 100% |
| PLATFORM_CATEGORY_SCOPE | marketing | CONFIG_DRIFT | 5 | 100% | 100% |
| PLATFORM_SHOP_TYPE_SCOPE | marketing | CONFIG_DRIFT | 4 | 100% | 100% |
| SHOP_TYPE_DOWNGRADE | seller_ops | CROSS_TEAM_CONFLICT | 6 | 100% | 100% |
| CATEGORY_PARENT_UNASSIGNED | merchandising | CROSS_TEAM_CONFLICT | 8 | 100% | 100% |
| CATEGORY_MOVED | merchandising | CROSS_TEAM_CONFLICT | 3 | 100% | 100% |
| FREESHIP_THRESHOLD | logistics | CONFIG_DRIFT | 3 | 100% | 100% |
| FREESHIP_PROVIDER_LIST | logistics | CONFIG_DRIFT | 4 | 100% | 100% |
| NEW_PROVIDER_UNDECLARED | logistics | CROSS_TEAM_CONFLICT | 3 | 100% | 100% |
| FREESHIP_PROGRAM_TAG | seller_ops | CROSS_TEAM_CONFLICT | 9 | 100% | 100% |
| BUDGET_TYPO | finance | CONFIG_DRIFT | 5 | 100% | 100% |
| SEGMENT_RULE | marketing | CONFIG_DRIFT | 2 | 100% | 100% |
| MIN_SPEND_TYPO | seller_ops, marketing | CONFIG_DRIFT | 4 | 100% | 100% |
| VALUE_TYPO | marketing, seller_ops | CONFIG_DRIFT | 4 | 100% | 100% |
| UNPLANNED_STACKING | category | CROSS_TEAM_CONFLICT | 4 | 100% | 100% |
| PROMO_PAUSED | marketing, seller_ops | MISSING_CONFIG | 3 | 100% | 100% |
| BRANDDAY_SCOPE | seller_ops | CONFIG_DRIFT | 3 | 100% | 100% |
| GDWEEK_SCOPE | category | CROSS_TEAM_CONFLICT | 4 | 100% | 100% |
| CONTRACT_REVISION | seller_ops, category | CONTRACT_CONFLICT | 3 | 100% | 100% |
| CONTRACT_CONFIG_LAG | category | CONFIG_DRIFT | 2 | 100% | 100% |
| CONTROL_NO_OP | merchandising, logistics | NO_OP | 4 | 100% | 100% |

File: `samples.jsonl` (dữ liệu agent được đọc: audit, phát hiện mới so với baseline, delta mô phỏng, giỏ hàng thật), `labels.jsonl` (đáp án, chỉ evaluator đọc), `baseline.json`.
