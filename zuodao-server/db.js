// 极简 JSON 文件库：每个集合一个 .json 文件，读写即持久化。
// MVP 够用；后续可平滑替换为 SQLite / 云数据库。
const fs = require('fs');
const path = require('path');

// 支持环境变量覆盖数据目录（测试时用临时目录）
const DATA_DIR = process.env.ZUODAO_DATA_DIR || path.join(__dirname, 'data');

function fileOf(name) {
  return path.join(DATA_DIR, name + '.json');
}

function load(name) {
  try {
    return JSON.parse(fs.readFileSync(fileOf(name), 'utf8'));
  } catch (e) {
    return null;
  }
}

function save(name, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = fileOf(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, fileOf(name)); // 先写临时文件再改名，避免写坏
}

// tokens 是 {token: userId} 的映射；其余集合是数组
function col(name) {
  const v = load(name);
  if (v != null) return v;
  return name === 'tokens' ? {} : [];
}

module.exports = { load, save, col, fileOf, DATA_DIR };
