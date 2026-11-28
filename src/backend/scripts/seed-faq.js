const articles = [
  ['NETWORK', 'Kiểm tra khi máy tính mất kết nối Wi-Fi', 'Kiểm tra chế độ máy bay và thử kết nối lại Wi-Fi. Nếu nhiều thiết bị cùng mất kết nối, hãy ghi tên mạng, khu vực và thời điểm sự cố vào phiếu hỗ trợ.', 'PUBLIC'],
  ['ACCOUNT', 'Cần làm gì khi không đăng nhập được email?', 'Kiểm tra địa chỉ email và bộ gõ rồi thử lại. Nếu vẫn không được, gửi ảnh lỗi đã che thông tin cá nhân. Không đính kèm mật khẩu hoặc mã xác minh.', 'PUBLIC'],
  ['HARDWARE', 'Thông tin cần thu thập khi máy in kẹt giấy', 'Ghi mã thiết bị, loại giấy và vị trí kẹt. Kiểm tra theo hướng dẫn của nhà sản xuất. Ghi kết quả in thử vào phiếu trước khi hoàn tất xử lý.', 'INTERNAL'],
];

export async function seedSampleFaq(conn) {
  const [[existing]] = await conn.query('SELECT id FROM knowledge_articles LIMIT 1');
  if (existing) return 0;

  const [categories] = await conn.query('SELECT id, code FROM categories WHERE is_active = 1');
  const ids = new Map(categories.map(row => [row.code, row.id]));
  const rows = articles
    .filter(([code]) => ids.has(code))
    .map(([code, ...article]) => [ids.get(code), ...article]);
  if (!rows.length) return 0;

  const [result] = await conn.query(
    'INSERT INTO knowledge_articles (category_id, title, body, visibility) VALUES ?',
    [rows],
  );
  return result.affectedRows;
}
