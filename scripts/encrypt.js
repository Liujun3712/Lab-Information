const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcDir = 'src';
const outDir = '_site';
const password = process.env.ENCRYPTION_PASSWORD;

if (!password) {
  console.error('❌ 请设置 ENCRYPTION_PASSWORD 环境变量');
  process.exit(1);
}

// 创建输出目录
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 复制无需加密的公开文件
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(outDir, 'index.html'));

// 找出所有需要加密的 HTML 文件（除了 index.html）
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');

files.forEach(file => {
  const input = path.join(srcDir, file);
  const output = path.join(outDir, file);
  console.log(`🔐 正在加密 ${file} ...`);
  execSync(
    `npx staticrypt "${input}" -o "${output}" -p "${password}" -f --short`,
    { stdio: 'inherit' }
  );
});

console.log('✅ 加密完成，输出目录：', outDir);