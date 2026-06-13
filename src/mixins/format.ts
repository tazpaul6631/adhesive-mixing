const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Kiểm tra nếu chuỗi ngày tháng không hợp lệ
    if (isNaN(date.getTime())) return '';

    // Kiểm tra nếu các thành phần thời gian khác 0
    const hasTime =
        date.getHours() !== 0 ||
        date.getMinutes() !== 0 ||
        date.getSeconds() !== 0;

    if (hasTime) {
        // Trả về đầy đủ: dd/mm/yyyy, hh:mm:ss
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    // Nếu là 00:00:00, chỉ trả về ngày: dd/mm/yyyy
    return date.toLocaleDateString('vi-VN');
};

/** Bỏ số 0 thừa khi hiển thị (8.500 → 8.5, 425.000 → 425). */
const formatDisplayWeight = (value: number | string | null | undefined): string => {
    if (value == null || value === '') return '';

    const num = Number(value);
    if (!Number.isFinite(num)) return String(value).trim();

    return num.toFixed(3).replace(/\.?0+$/, '') || '0';
};

export default {
    formatDate,
    formatDisplayWeight,
};