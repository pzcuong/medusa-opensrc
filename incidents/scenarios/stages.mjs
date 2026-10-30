/**
 * Các khâu của từng kịch bản: ai làm gì, vì sao việc đó hợp lý với vai trò của họ, chỗ trượt nằm ở đâu, vì sao không ai
 * thấy. Đây là thứ sub-agent kiểm định đọc để chấm "từng khâu hợp lý nhưng vô tình gây lỗi".
 *
 * step: { at, team, action, reason }  (at: t0 = cấu hình đã duyệt từ trước, t1.. = thay đổi trong sự cố)
 */

const T0_SAN10 = { at: 't0', team: 'marketing', action: 'Cấu hình FS-MK-SAN10: -10% (trần 150.000đ), đơn từ 500.000đ, ngành Gia dụng/Điện tử/Mẹ & Bé, shop Mall/Yêu thích+/Yêu thích', reason: 'Đúng contract CT-1111-MARKETPLACE đã duyệt' }
const T0_FREESHIP = { at: 't0', team: 'marketing', action: 'Cấu hình FS-MK-FREESHIP: hỗ trợ 40.000đ phí ship cho shop Freeship Xtra, đơn từ 300.000đ (trước voucher), provider GHN/GHTK/Viettel Post', reason: 'Đúng contract' }
const T0_GDW = { at: 't0', team: 'category', action: 'Cấu hình FS-MK-GDW8 tự động: -8% ngành Gia dụng cho shop Yêu thích và Thường', reason: 'Đúng contract CT-GIADUNG-WEEK; Mall bị loại vì đã có Brand Day riêng' }
const T0_BD = { at: 't0', team: 'seller_ops', action: 'Cấu hình FS-MK-BD-AIRCHEF20 tự động: -20% toàn shop AirChef', reason: 'Đúng contract CT-BRANDDAY-AIRCHEF' }

const typo = (team, what, how) => ({
  steps: [{ at: 't1', team, action: what, reason: 'Việc thường ngày của team trước giờ mở campaign' }],
  slip: how,
  unnoticed: 'Admin không so giá trị nhập với contract đã duyệt; không có bước người thứ hai kiểm tra trước khi lưu',
})

export const STAGES = {
  FLASH_PRICE_TYPO: (p) => ({
    steps: [
      { at: 't0', team: 'marketing', action: `Contract duyệt giá flash ${p.sku}`, reason: 'Bảng giá flash do Category đề xuất, Marketing duyệt' },
      { at: 't1', team: 'merchandising', action: `Nhập bảng giá flash từ file Excel vào price list "FS1111-MK Flash 20-22h"`, reason: 'Merchandising sở hữu giá; nhập theo lô là quy trình chuẩn trước flash sale' },
    ],
    slip: `Ô giá của ${p.sku} bị ${p.factor < 1 ? 'mất' : 'thêm'} một số 0 khi copy từ Excel (định dạng số có dấu chấm ngăn cách)`,
    unnoticed: p.factor < 1
      ? 'Giá vẫn là số dương hợp lệ; admin không cảnh báo giá thấp bất thường so với giá niêm yết'
      : 'Price list loại sale lấy giá thấp hơn giữa giá flash và giá niêm yết, nên storefront hiện giá niêm yết như ngày thường: không có gì "trông sai", chỉ là khách mất ưu đãi flash',
  }),
  FLASH_VARIANT_MISSING: (p) => ({
    steps: [{ at: 't1', team: 'merchandising', action: 'Chọn SKU cho flash sale bằng bộ lọc trong admin rồi nhập giá theo lô', reason: 'Quy trình chuẩn' }],
    slip: `Dòng ${p.sku} bị lọc mất (biến thể màu khác/sản phẩm nằm trang sau), price list thiếu đúng một SKU`,
    unnoticed: 'Sản phẩm vẫn bán bình thường với giá niêm yết; không có báo lỗi',
  }),
  FLASH_DEEPER_CROSSES_THRESHOLD: (p) => ({
    steps: [
      { at: 't0', team: 'seller_ops', action: 'Cấu hình FS-MK-AIRCHEF100K: giảm 100.000đ cho đơn AirChef từ 1.500.000đ', reason: 'Ngưỡng đặt theo giá flash 1.790.000đ trong contract' },
      { at: 't1', team: 'merchandising', action: `Thương lượng với shop AirChef (shop đồng tài trợ phần giảm thêm), hạ giá flash AirChef 6L xuống ${p.price.toLocaleString('vi-VN')}đ để cạnh tranh với sàn đối thủ`, reason: 'Giá thuộc thẩm quyền Merchandising; giảm sâu hơn có shop tài trợ là quyết định thương mại hợp lệ' },
    ],
    slip: 'Merchandising không mở lại contract và không báo Seller Ops; không ai biết ngưỡng voucher shop được đặt theo giá flash cũ. Giá mới thấp hơn ngưỡng 1.500.000đ nên khách mua 1 nồi bị âm thầm từ chối voucher 100.000đ: vẫn trả ít hơn giá cũ, nhưng không nhận đủ "giá giảm sâu + voucher" mà truyền thông 11.11 hứa, và shop tài trợ phần giảm thêm mà khách không được trọn',
    unnoticed: 'Mỗi team chỉ thấy đối tượng của mình; storefront hiện giá flash thấp hơn nên ai nhìn cũng thấy "đã giảm sâu", không ai thử áp voucher',
  }),
  FLASH_DEARER_THAN_SHOP_PROMO: (p) => ({
    steps: [
      { at: 't0', team: 'seller_ops', action: 'Cấu hình FS-MK-AIRCHEF100K: giảm 100.000đ cho đơn AirChef từ 1.500.000đ', reason: 'Để khách mua 1 nồi AirChef 6L là đủ điều kiện' },
      { at: 't0', team: 'seller_ops', action: `Chạy "Khuyến mãi của shop": AirChef 6L ${p.shop.toLocaleString('vi-VN')}đ cả tháng`, reason: 'Shop tự quyết giá khuyến mãi của mình; vẫn trên ngưỡng voucher nên khách vừa được giá shop vừa được voucher' },
      { at: 't1', team: 'merchandising', action: `Chốt suất Flash Sale AirChef 6L ${p.flash.toLocaleString('vi-VN')}đ với shop, sửa contract 11.11 theo giá mới và cập nhật bảng giá flash`, reason: 'Giá flash thuộc thẩm quyền Merchandising, sâu hơn giá shop như đã thương lượng, contract được duyệt' },
    ],
    slip: p.dearer
      ? `Giá flash ${p.flash.toLocaleString('vi-VN')}đ thấp hơn ngưỡng 1.500.000đ, chỉ sâu hơn giá shop ${(p.shop - p.flash).toLocaleString('vi-VN')}đ, ít hơn voucher 100.000đ mà khách mất: trong giờ flash khách trả nhiều hơn ngoài giờ flash. Merchandising duyệt giá theo giá niêm yết và giá shop, không xét ngưỡng voucher của shop; Seller Ops đặt ngưỡng theo giá thường`
      : (p.flash >= 1500000 ? 'Giá flash vẫn trên ngưỡng voucher: khách được cả giá flash lẫn voucher' : 'Giá flash giảm sâu hơn phần voucher mất: trong giờ flash khách vẫn trả ít hơn'),
    unnoticed: p.dearer
      ? 'Mỗi cấu hình đúng điều khoản của team mình; storefront hiện giá flash thấp hơn giá shop, chỉ khi tính cả voucher ở giỏ mới thấy đắt hơn hôm qua'
      : 'Không có gì sai để phát hiện (đối chứng)',
  }),
  SHOP_VOUCHER_WRONG_SHOP: (p) => ({
    steps: [{ at: 't1', team: 'seller_ops', action: `Mở ${p.code} để nhân bản làm voucher cho shop ${p.to}`, reason: 'Seller Ops tạo voucher shop cho shop mới tham gia; admin Medusa không có nút nhân bản nên thường mở voucher cũ làm mẫu' }],
    slip: `Sửa điều kiện shop ngay trên bản gốc ${p.code} thay vì bản sao: voucher giờ chỉ áp cho ${p.to}`,
    unnoticed: 'Lưu thành công, voucher vẫn active; shop gốc không được báo',
  }),
  PLATFORM_CATEGORY_SCOPE: (p) => ({
    steps: [T0_SAN10, {
      at: 't1', team: 'marketing',
      action: {
        remove: 'Gỡ tạm điều kiện ngành của SAN10 khi điều tra khiếu nại "mã không áp được"',
        'add-my-pham': 'Thêm ngành Mỹ phẩm vào voucher sàn theo đề nghị của team Mỹ phẩm',
        'swap-to-my-pham': 'Chuẩn bị voucher Mỹ phẩm tuần sau bằng cách sửa điều kiện ngành',
        'drop-dien-tu': 'Chỉnh danh sách ngành của SAN10 trong ô chọn nhiều giá trị',
        'drop-me-be': 'Chỉnh danh sách ngành của SAN10 trong ô chọn nhiều giá trị',
      }[p.op],
      reason: 'Marketing sở hữu voucher sàn',
    }],
    slip: {
      remove: 'Quên thêm lại điều kiện sau khi điều tra xong',
      'add-my-pham': 'Contract loại Mỹ phẩm vì biên lợi nhuận thấp; người sửa nghĩ SAN10 là voucher chung',
      'swap-to-my-pham': 'Sửa trên voucher 11.11 đang chạy thay vì tạo voucher mới',
      'drop-dien-tu': 'Bấm nhầm bỏ chọn Điện tử',
      'drop-me-be': 'Bấm nhầm bỏ chọn Mẹ & Bé',
    }[p.op],
    unnoticed: ['remove', 'add-my-pham'].includes(p.op)
      ? 'Voucher áp rộng hơn contract (cả Mỹ phẩm), khách được lợi nên không ai khiếu nại; admin không diff với contract khi lưu; chỉ lộ khi Finance đối soát ngân sách fs-mk-san, thường sau khi campaign kết thúc'
      : 'Admin không diff với contract khi lưu; khách bị mất mã chỉ thấy "mã không áp dụng" không kèm lý do, phần lớn bỏ qua thay vì khiếu nại',
  }),
  PLATFORM_SHOP_TYPE_SCOPE: (p) => ({
    steps: [T0_SAN10, { at: 't1', team: 'marketing', action: p.types ? `Đặt loại shop của SAN10 thành ${p.types.join(', ')}` : 'Gỡ điều kiện loại shop của SAN10', reason: 'Marketing sở hữu voucher sàn' }],
    slip: !p.types ? 'Gỡ khi thử nghiệm, quên đặt lại'
      : p.types.length === 4 ? 'Cộng đồng người bán xin mở cho shop Thường; contract loại shop Thường vì rủi ro gian lận, người sửa không biết'
        : p.types.length === 1 ? 'Hiểu nhầm chỉ đạo cắt chi phí của Finance thành "chỉ Mall"'
          : 'Hạng Yêu thích+ mới được thêm gần đây; người sửa dùng danh sách hạng cũ',
    unnoticed: 'Không có diff so với contract khi lưu',
  }),
  SHOP_TYPE_DOWNGRADE: (p) => {
    const giaDung = ['airchef', 'homelux', 'sunhouse'].includes(p.shop)
    const noImpact = p.shop === 'glow' || p.shop === 'techzone'
    return {
      steps: [T0_SAN10, ...(giaDung ? [T0_GDW] : []), ...(p.shop === 'airchef' ? [T0_BD] : []),
        { at: 't1', team: 'seller_ops', action: `Đánh giá lại hạng shop định kỳ: ${p.shop} chuyển sang ${p.to}`, reason: 'Quy trình xếp hạng shop theo KPI (đánh giá, tỉ lệ hủy), đúng thẩm quyền của Seller Ops' }],
      slip: noImpact
        ? (p.shop === 'glow' ? 'Không có: Glow chỉ bán Mỹ phẩm, vốn ngoài phạm vi ngành của voucher sàn và Tuần lễ Gia dụng; đổi hạng không đổi quyền lợi khách' : 'Không có: hạng Yêu thích vẫn nằm trong phạm vi voucher sàn, và TechZone bán Điện tử nên không thuộc Tuần lễ Gia dụng')
        : p.shop === 'airchef' ? 'Kỳ xếp hạng rơi vào giữa campaign; Seller Ops không biết voucher sàn xét theo hạng shop (AirChef mất SAN10) và Tuần lễ Gia dụng loại Mall theo hạng (AirChef lọt vào, cộng thêm 8% lên Brand Day -20%)'
          : p.shop === 'sunhouse' ? 'Kỳ xếp hạng rơi vào giữa campaign; Sunhouse xuống Yêu thích nên lọt vào Tuần lễ Gia dụng, chương trình này loại Mall có chủ đích'
            : 'Kỳ xếp hạng rơi vào giữa campaign; Seller Ops không biết voucher sàn xét theo hạng shop, shop xuống hạng Thường mất voucher sàn',
      unnoticed: noImpact ? 'Không áp dụng: đối chứng sát nút, agent không được báo lỗi' : 'Hạng shop là dữ liệu hồ sơ, không gắn với campaign nào trong admin; Marketing và Category không được báo',
    }
  },
  CATEGORY_PARENT_UNASSIGNED: (p) => ({
    steps: [T0_SAN10, { at: 't1', team: 'merchandising', action: `Chuẩn hóa cây danh mục: ${p.handle} chỉ giữ ngành con`, reason: 'Thực hành chuẩn của PIM: sản phẩm gắn ở ngành lá, tránh hiển thị trùng' }],
    slip: p.handle === 'fs-mk-pinpro-20k'
      ? 'Không có: PinPro là shop Thường, vốn ngoài phạm vi loại shop của voucher sàn; bỏ ngành cha không đổi quyền lợi khách (đối chứng sát nút)'
      : 'Quy ước của sàn là gán cả ngành con và ngành cha, vì rule items.product.categories.id của Medusa chỉ khớp ngành gán trực tiếp, không kế thừa ngành cha; quy ước này chưa được viết ra nên Merchandising không biết. Voucher sàn target ngành cha nên không còn khớp',
    unnoticed: p.handle === 'fs-mk-pinpro-20k' ? 'Không áp dụng' : 'Storefront vẫn hiện sản phẩm dưới ngành cha (qua cây danh mục) nên nhìn mọi thứ vẫn đúng',
  }),
  CATEGORY_MOVED: (p) => ({
    steps: [{ at: 't1', team: 'merchandising', action: `Dọn danh mục bằng kéo thả một lô sản phẩm vào ngành ${p.to[0]}; ${p.handle} lẫn vào lô và được gán ${p.to[0]} cùng ngành cha ${p.to[1]} theo quy ước`, reason: 'Merchandising sở hữu gán ngành' }],
    slip: 'Kéo thả nhầm dòng trong lô',
    unnoticed: 'Sản phẩm vẫn bán được; chỉ điều kiện khuyến mãi theo ngành thay đổi',
  }),
  FREESHIP_THRESHOLD: (p) => ({
    steps: [T0_FREESHIP, {
      at: 't1', team: 'marketing',
      action: p.op === 'base-item_total' ? 'Dựng lại rule ngưỡng freeship sau khi xóa nhầm, chọn thuộc tính item_total' : `Cập nhật ngưỡng freeship thành ${p.value.toLocaleString('vi-VN')}đ`,
      reason: 'Marketing sở hữu chương trình freeship, kể cả ngưỡng',
    }],
    slip: p.op === 'base-item_total' ? 'Contract ghi rõ ngưỡng xét trước voucher (item_subtotal); hai thuộc tính có tên gần giống nhau trong ô chọn thuộc tính' : 'Gõ sai số 0',
    unnoticed: p.op === 'base-item_total' ? 'Chỉ giỏ sát ngưỡng (sau voucher dưới 300.000đ, trước voucher trên 300.000đ) mất freeship; khách thấy phí ship và tự bỏ giỏ'
      : p.value > 300000 ? 'Hầu hết giỏ mất freeship ngay, nhưng storefront không báo lỗi; tỉ lệ đơn freeship chỉ có trên báo cáo ngày hôm sau, trong khi khung flash chỉ 2 giờ'
        : 'Gần như mọi đơn được freeship, khách được lợi nên không ai khiếu nại; ngân sách fs-mk-freeship cháy nhanh nhưng Finance chỉ đối soát cuối ngày',
  }),
  FREESHIP_PROVIDER_LIST: (p) => ({
    steps: [T0_FREESHIP, { at: 't1', team: 'logistics', action: `Sửa danh sách provider của promotion freeship thành ${p.providers.join(', ')}`, reason: 'Logistics quản lý provider; admin Medusa không phân quyền theo trường nên Logistics sửa được rule provider của promotion, dù danh sách này là điều khoản Marketing sở hữu' }],
    slip: p.providers.length === 1 ? 'Chọn nhầm một provider trong ô chọn nhiều giá trị'
      : p.providers.length === 2 ? 'Gỡ Viettel Post vì hợp đồng đang gia hạn, chưa biết contract 11.11 vẫn hứa Viettel Post'
        : p.providers.includes('fs-ahamove') ? 'Nghĩ giao nhanh AhaMove cũng nằm trong chương trình' : 'Thêm J&T vì vừa ký hợp tác mới, contract chưa cập nhật',
    unnoticed: 'Khách chỉ thấy phí ship khác nhau giữa các provider',
  }),
  NEW_PROVIDER_UNDECLARED: (p) => ({
    steps: [T0_FREESHIP, { at: 't1', team: 'logistics', action: `Mở provider ${p.label} (${p.fee.toLocaleString('vi-VN')}đ) cho Việt Nam`, reason: 'Onboard đối tác giao hàng rẻ hơn là việc của Logistics' }],
    slip: 'Freeship liệt kê provider tường minh; provider mới không có trong danh sách nên khách chọn nó (thường vì rẻ nhất) mất hỗ trợ 40.000đ',
    unnoticed: 'Logistics không sở hữu chương trình freeship; Marketing không được báo có provider mới',
  }),
  FREESHIP_PROGRAM_TAG: (p) => ({
    steps: [T0_FREESHIP, { at: 't1', team: 'seller_ops', action: `${p.op === 'remove' ? 'Gỡ' : 'Thêm'} shop ${p.shop} ${p.op === 'remove' ? 'khỏi' : 'vào'} Freeship Xtra theo yêu cầu của shop`, reason: 'Seller Ops xử lý đăng ký/rút khỏi chương trình của shop' }],
    slip: 'Danh sách shop Freeship Xtra cho 11.11 đã chốt trong contract; Seller Ops xử lý yêu cầu như ngày thường',
    unnoticed: 'Tag chương trình là dữ liệu hồ sơ shop; không có cảnh báo campaign đang dùng',
  }),
  BUDGET_TYPO: (p) => ({ ...typo('finance', `Cập nhật ngân sách campaign ${p.campaign}`, 'Nhập theo đơn vị nghìn đồng như trong báo cáo nội bộ, thiếu 3 số 0'), unnoticed: 'Campaign vẫn chạy cho tới khi chạm ngân sách, lúc đó mã ngừng áp mà không báo lý do' }),
  SEGMENT_RULE: (p) => ({
    steps: [{ at: 't1', team: 'marketing', action: p.op === 'add-new' ? 'Thử điều kiện nhóm khách mới, sao chép rule sang SAN10' : 'Gỡ điều kiện nhóm khách của NEWBIE50K khi xử lý khiếu nại "khách mới không dùng được mã"', reason: 'Marketing sở hữu phân khúc' }],
    slip: p.op === 'add-new' ? 'Lưu nhầm rule lên voucher sàn đang chạy' : 'Khiếu nại do đồng bộ nhóm khách chậm; gỡ điều kiện làm mọi khách dùng được mã khách mới',
    unnoticed: 'Không có diff so với contract khi lưu',
  }),
  MIN_SPEND_TYPO: (p) => typo(p.team ?? 'seller_ops', `Cập nhật đơn tối thiểu của ${p.code}`, `Gõ ${p.value.toLocaleString('vi-VN')}đ (sai số 0)`),
  VALUE_TYPO: (p) => typo(p.team ?? 'marketing', `Cập nhật giá trị ưu đãi ${p.code}`, `Gõ ${p.value} (sai số 0 hoặc nhầm đơn vị)`),
  UNPLANNED_STACKING: (p) => ({
    steps: [
      p.cat === 'my-pham'
        ? { at: 't0', team: 'seller_ops', action: 'Cấu hình FS-MK-GLOW30K: giảm 30.000đ cho đơn Glow từ 300.000đ', reason: 'Đúng contract' }
        : T0_SAN10,
      { at: 't1', team: 'category', action: `Bật ưu đãi tự động -${p.pct}% cho ngành ${p.cat} trong tuần lễ ngành; brief ghi "không cộng voucher sàn/voucher shop"`, reason: 'Category được chạy chương trình riêng cho ngành' },
    ],
    slip: `Medusa không có cờ loại trừ cộng dồn; brief không biểu diễn được trong cấu hình nên ưu đãi cộng với ${p.cat === 'my-pham' ? 'voucher shop Glow' : 'voucher sàn SAN10'}. Contract 11.11 không liệt kê mã mới trong danh sách được cộng`,
    unnoticed: 'Category nghĩ brief đã đủ và không biết engine không chặn được; Marketing/Seller Ops không biết có chương trình mới',
  }),
  PROMO_PAUSED: (p) => ({
    steps: [{ at: 't1', team: p.team ?? 'marketing', action: `Chuyển ${p.code} về draft để sửa mô tả`, reason: 'Admin Medusa không cho sửa một số trường khi promotion đang active ở một số luồng; người dùng quen tạm dừng rồi bật lại' }],
    slip: 'Quên bật lại',
    unnoticed: 'Không có cảnh báo promotion thuộc campaign đang chạy bị tắt',
  }),
  BRANDDAY_SCOPE: (p) => ({
    steps: [T0_BD, { at: 't1', team: 'seller_ops', action: p.op === 'remove' ? 'Gỡ điều kiện shop của Brand Day khi chuẩn bị nhân bản cho shop khác' : `Sửa điều kiện shop của Brand Day ${p.op === 'to' ? `sang ${p.shop}` : `thêm ${p.shop}`}`, reason: 'Seller Ops sở hữu Brand Day và chuẩn bị Brand Day cho shop khác' }],
    slip: 'Sửa trên Brand Day AirChef đang chạy thay vì bản sao',
    unnoticed: 'Ưu đãi tự động, khách thấy giảm giá nhiều hơn nên không ai khiếu nại',
  }),
  GDWEEK_SCOPE: (p) => ({
    steps: [T0_GDW, ...(p.types !== undefined ? [T0_BD] : []), {
      at: 't1', team: 'category',
      action: p.types !== undefined
        ? (p.types ? 'Mở Tuần lễ Gia dụng cho cả shop Mall để tăng GMV' : 'Gỡ điều kiện loại shop của Tuần lễ Gia dụng để "áp đồng nhất cho mọi shop" khi mở rộng chương trình')
        : p.categories ? 'Thêm ngành Điện tử vào Tuần lễ Gia dụng (nhầm "điện gia dụng" với ngành Điện tử)' : 'Gỡ điều kiện ngành của Tuần lễ Gia dụng khi thử nghiệm',
      reason: 'Category sở hữu chương trình này',
    }],
    slip: p.types !== undefined ? 'Người sửa mới nhận chương trình, không biết lý do contract loại Mall. Hậu quả: shop Mall ngành Gia dụng (AirChef, Sunhouse) được giảm thêm 8% ngoài kế hoạch; riêng AirChef đang có Brand Day -20% của Seller Ops nên bị cộng 20% + 8%' : 'Sửa nhầm điều kiện ngành',
    unnoticed: 'Ưu đãi tự động; khách được giảm thêm nên không khiếu nại',
  }),
  CONTRACT_REVISION: (p) => ({
    steps: [
      { at: 't0', team: 'marketing', action: 'Contract 11.11 cho phép SAN10 và NEWBIE50K cộng với Brand Day/Tuần lễ Gia dụng', reason: 'Đã duyệt' },
      { at: 't1', team: p.team ?? 'seller_ops', action: { 'bd-no-san10': 'Sửa contract Brand Day: không cộng voucher sàn', 'bd-no-newbie': 'Sửa contract Brand Day: không cộng voucher khách mới', 'gd-no-san10': 'Sửa contract Tuần lễ Gia dụng: không cộng voucher sàn' }[p.op], reason: 'Lo ngại biên lợi nhuận, chủ contract có quyền sửa contract của mình' },
    ],
    slip: 'Mỗi team chỉ duyệt contract của mình; không có bước rà mâu thuẫn giữa các contract',
    unnoticed: 'Cấu hình không đổi nên không có cảnh báo cấu hình nào',
  }),
  CONTRACT_CONFIG_LAG: (p) => ({
    steps: [
      { at: 't1', team: 'category', action: p.op === 'gd-value-10' ? 'Duyệt contract Tuần lễ Gia dụng mới: -10%' : 'Duyệt contract Tuần lễ Gia dụng mới: mở thêm ngành Mẹ & Bé (đồ dùng gia đình cho bé)', reason: 'Chủ contract điều chỉnh chương trình' },
    ],
    slip: 'Người cấu hình chưa sửa promotion theo contract mới (đang nghỉ/không được giao việc)',
    unnoticed: 'Duyệt contract và sửa cấu hình là hai việc tách rời, không có checklist nối hai bước',
  }),
  CONTROL_NO_OP: (p) => ({
    steps: [{ at: 't1', team: p.team ?? 'merchandising', action: { title: 'Đổi tiêu đề sản phẩm Son Xinh', 'pricelist-desc': 'Đổi mô tả price list flash sale', 'aha-fee': 'Tăng phí AhaMove (ngoài freeship)', 'vtp-fee': 'Giảm phí Viettel Post' }[p.op], reason: 'Việc thường ngày' }],
    slip: 'Không có: thay đổi hợp lệ, không đụng điều khoản contract',
    unnoticed: 'Không áp dụng',
  }),
  CONTROL_BENIGN_AUDITED: (p) => ({
    steps: [{ at: 't1', team: p.team ?? 'marketing', action: { 'campaign-desc': 'Đổi mô tả campaign 11.11', 'category-rename': 'Đổi tên hiển thị ngành Gia dụng (giữ handle)', 'shop-title': 'Đổi tên hiển thị shop AirChef', 'campaign-extend': 'Gia hạn campaign Brand Day thêm 7 ngày theo đề nghị của shop AirChef' }[p.op], reason: 'Việc thường ngày của team sở hữu đối tượng' }],
    slip: 'Không có: thay đổi hợp lệ trên đối tượng có audit',
    unnoticed: 'Không áp dụng',
  }),
  OUT_OF_BAND_DB: (p) => ({
    steps: [{
      at: 't1', team: 'platform (không có tài khoản trong audit)',
      action: {
        'promo-value': `Script bảo trì chuẩn hóa raw_value của promotion chạy thẳng trên DB, ghi đè giá trị ${p.code}`,
        'rule-values-lost': `Migration dọn rule trùng lặp xóa nhầm giá trị điều kiện phạm vi của ${p.code}`,
        'flash-price': `Job đồng bộ giá từ ERP ghi thẳng vào bảng price, sai hệ số đơn vị cho ${p.sku}`,
        'tag-link-lost': `Job đồng bộ hồ sơ shop từ hệ thống seller center ghi đè liên kết tag của shop ${p.shop}`,
        'promo-draft': `Hotfix tay trên DB đặt ${p.code} về draft khi xử lý sự cố khác`,
      }[p.op],
      reason: 'Thao tác kỹ thuật hợp lệ về mục đích nhưng đi ngoài Admin API',
    }],
    slip: 'Thay đổi không đi qua Admin API nên không có bản ghi ai sửa',
    unnoticed: 'Không có audit; các team nghiệp vụ không biết cấu hình đã đổi',
  }),
}
