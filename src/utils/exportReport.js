/* 多 Sheet Excel 报告导出（当前筛选条件） */
import * as XLSX from 'xlsx';

export function exportReport(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.widths) ws['!cols'] = s.widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export function reportName(prefix, scopeText) {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${prefix}_${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}_${scopeText}.xlsx`;
}
