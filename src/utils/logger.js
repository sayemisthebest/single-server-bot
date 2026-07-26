const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(path.join(logDir, 'bot.log'), line, 'utf8');
  console.log(line.trim());
}

module.exports = {
  info: (message) => writeLog('INFO', message),
  warn: (message) => writeLog('WARN', message),
  error: (message) => writeLog('ERROR', message),
};
