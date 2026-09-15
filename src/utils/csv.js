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

function parseUsernameList(content) {
  const values = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
  }

  return Array.from(new Set(
    values
      .map((value) => String(value).replace(/^\uFEFF/, '').trim())
      .filter(Boolean)
      .map((value) => value.replace(/^['"](.+)['"]$/, '$1'))
      .filter((value) => value.toLowerCase() !== 'username' && value.toLowerCase() !== 'status')
  ));
}

module.exports = { sanitizeCSVValue, escapeCSV, createCSV, parseUsernameList };
