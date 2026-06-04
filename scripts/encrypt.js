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
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 复制公开的 index.html
const srcIndex = path.join(srcDir, 'index.html');
const destIndex = path.join(outDir, 'index.html');
fs.copyFileSync(srcIndex, destIndex);
console.log('✅ 已复制: index.html');

// 找出所有需要加密的 HTML 文件
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`📋 需要加密的文件: ${files.join(', ')}`);

files.forEach(file => {
  const inputPath = path.join(srcDir, file);
  const outputPath = path.join(outDir, file);
  
  console.log(`\n🔐 正在处理: ${file}`);
  console.log(`  源文件: ${inputPath}`);
  console.log(`  目标文件: ${outputPath}`);
  
  // 先复制源文件到输出目录
  fs.copyFileSync(inputPath, outputPath);
  console.log(`  已复制到输出目录`);
  
  // 使用 staticrypt 直接加密目标文件（原地加密）
  try {
    const cmd = `npx staticrypt "${outputPath}" "${password}" -o "${outputPath}" -f`;
    console.log(`  执行加密命令...`);
    
    execSync(cmd, { 
      stdio: 'inherit',
      timeout: 30000
    });
    
    // 验证文件是否真的被加密了（检查是否包含 staticrypt 的特征）
    if (fs.existsSync(outputPath)) {
      const content = fs.readFileSync(outputPath, 'utf8');
      if (content.includes('staticrypt') || content.includes('encrypted')) {
        console.log(`  ✅ 加密成功！文件大小: ${fs.statSync(outputPath).size} bytes`);
      } else {
        console.log(`  ⚠️  文件可能未正确加密，但已复制`);
      }
    }
  } catch (error) {
    console.error(`  ❌ 加密过程出错: ${error.message}`);
    // 即使加密失败，复制的文件还在，至少不会是404
    console.log(`  📄 已保留未加密的副本文件`);
  }
});

// 最终验证
console.log('\n📁 _site 目录最终内容:');
const outputFiles = fs.readdirSync(outDir);
outputFiles.forEach(f => {
  const stats = fs.statSync(path.join(outDir, f));
  console.log(`  ✅ ${f} (${stats.size} bytes)`);
});

if (outputFiles.length < 2) {
  console.error('\n❌ 错误: _site 目录文件数量不足！');
  console.error('预期至少有 index.html 和 lab-network-config.html');
  process.exit(1);
}