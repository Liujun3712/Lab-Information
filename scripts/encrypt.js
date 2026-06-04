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

// 创建输出目录（确保干净）
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 复制公开的 index.html
const srcIndex = path.join(srcDir, 'index.html');
const destIndex = path.join(outDir, 'index.html');
fs.copyFileSync(srcIndex, destIndex);
console.log('✅ 已复制公开首页: index.html');

// 找出所有需要加密的 HTML 文件（除了 index.html）
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');

if (files.length === 0) {
  console.log('⚠️  没有找到需要加密的文件');
} else {
  files.forEach(file => {
    const input = path.join(srcDir, file);
    const output = path.join(outDir, file);  // 直接放在 _site 根目录
    console.log(`🔐 正在加密 ${file} ...`);
    try {
      execSync(
        `npx staticrypt "${input}" -o "${output}" -p "${password}" -f --short`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ 已生成: ${output}`);
    } catch (error) {
      console.error(`  ❌ 加密 ${file} 失败:`, error.message);
    }
  });
}

// 调试：列出输出目录的文件
console.log('\n📁 _site 目录内容：');
const outputFiles = fs.readdirSync(outDir);
outputFiles.forEach(f => console.log('  -', f));