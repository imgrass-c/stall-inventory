/**
 * 台灣時區與工具函式庫
 */

export function formatTaiwanTime(timestamp, formatType = 'datetime') {
  if (!timestamp) return '';
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) return String(timestamp);

  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(dateObj);
  const map = {};
  parts.forEach(p => map[p.type] = p.value);

  const year = map.year;
  const month = map.month;
  const day = map.day;
  const hour = map.hour;
  const minute = map.minute;
  const second = map.second;

  if (formatType === 'date') {
    return `${year}-${month}-${day}`;
  } else if (formatType === 'time') {
    return `${hour}:${minute}`;
  } else if (formatType === 'month') {
    return `${year}-${month}`;
  } else {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}

export function exportToCsv(filename, headers, rows) {
  const csvContent = "\uFEFF" + [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function compressImageFile(file, maxDimension = 360, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > maxDimension) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          }
        } else {
          if (h > maxDimension) {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
