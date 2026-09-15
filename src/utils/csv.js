function sanitizeCSVValue(value) {
  if (value == null) return '';

  let normalized = String(value).replace(/\r?\n/g, ' ');
  if (/^[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }

  return normalized;
}

function escapeCSV(value) {
  return `"${sanitizeCSVValue(value).replace(/"/g, '""')}"`;
}

function createCSV(headers, rows) {
  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');
}

module.exports = { sanitizeCSVValue, escapeCSV, createCSV };
