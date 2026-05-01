const fs = require('fs');
const path = require('path');
const util = require('util');

let logDir = null;
let stream = null;
let logFilePath = '';
let bytesWritten = 0;
let installed = false;

function formatArgs(args) {
  return args.map((a) => {
    if (typeof a === 'string')
      return a;
    if (a instanceof Error)
      return a.stack || a.message;
    try {
      return util.inspect(a, { depth: 4, breakLength: 120, colors: false });
    }
    catch {
      return String(a);
    }
  }).join(' ');
}

function maxBytes() {
  const n = parseInt(process.env.SUBARR_LOG_MAX_MB || '10', 10);
  return (Number.isFinite(n) && n > 0 ? n : 10) * 1024 * 1024;
}

function rotateIfNeeded() {
  if (!logFilePath)
    return;
  try {
    if (!fs.existsSync(logFilePath))
      return;
    if (fs.statSync(logFilePath).size < maxBytes())
      return;
    if (stream) {
      stream.end();
      stream = null;
    }
    const prev = path.join(logDir, 'subarr.previous.log');
    if (fs.existsSync(prev))
      fs.unlinkSync(prev);
    fs.renameSync(logFilePath, prev);
    stream = fs.createWriteStream(logFilePath, { flags: 'a' });
    bytesWritten = 0;
  }
  catch (err) {
    process.stderr.write(`[logger] rotation failed: ${err.message}\n`);
  }
}

function writeLine(level, args) {
  if (!stream)
    return;
  const line = `[${new Date().toISOString()}] [${level}] ${formatArgs(args)}\n`;
  rotateIfNeeded();
  stream.write(line);
  bytesWritten += Buffer.byteLength(line, 'utf8');
  if (bytesWritten >= 256 * 1024) {
    bytesWritten = 0;
    rotateIfNeeded();
  }
}

/**
 * When SUBARR_LOG_DIR is set, mirror console.log / warn / error to subarr.log
 * (simple rotation to subarr.previous.log when file exceeds SUBARR_LOG_MAX_MB, default 10).
 */
function install() {
  if (installed)
    return;
  logDir = process.env.SUBARR_LOG_DIR;
  if (!logDir || logDir === '0' || logDir === 'false')
    return;

  logDir = path.resolve(logDir);
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, 'subarr.log');
  stream = fs.createWriteStream(logFilePath, { flags: 'a' });

  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args) => {
    orig.log(...args);
    writeLine('INFO', args);
  };
  console.warn = (...args) => {
    orig.warn(...args);
    writeLine('WARN', args);
  };
  console.error = (...args) => {
    orig.error(...args);
    writeLine('ERROR', args);
  };

  installed = true;
  orig.log(`[subarr] File logging enabled: ${logFilePath}`);
}

module.exports = { install };
