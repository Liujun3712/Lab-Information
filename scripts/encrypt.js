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
console.log('📁 创建输出目录: _site');

// 复制公开的 index.html
const srcIndex = path.join(srcDir, 'index.html');
const destIndex = path.join(outDir, 'index.html');
if (fs.existsSync(srcIndex)) {
  fs.copyFileSync(srcIndex, destIndex);
  console.log('✅ 已复制公开首页: index.html');
} else {
  console.error('❌ 未找到 src/index.html');
  process.exit(1);
}

// 找出所有需要加密的 HTML 文件
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`📋 需要加密的文件: ${files.join(', ') || '(无)'}`);

if (files.length === 0) {
  console.log('⚠️  没有需要加密的文件，直接部署公开页面。');
} else {
  files.forEach(file => {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(outDir, file);

    console.log(`\n🔐 正在加密: ${file}`);

    try {
      // 通过环境变量传递密码，避免交互提示
      const cmd = `npx staticrypt "${inputPath}" -o "${outputPath}" -f`;
      console.log(`  执行命令: npx staticrypt [参数已隐藏]`);

      execSync(cmd, {
        stdio: 'inherit',
        timeout: 30000,
        env: {
          ...process.env,
          STATICRYPT_PASSWORD: password   // 设置环境变量
        }
      });

      // 检查输出文件是否生成
      if (fs.existsSync(outputPath)) {
        const fileSize = fs.statSync(outputPath).size;
        console.log(`  ✅ 加密成功！文件大小: ${fileSize} bytes`);
      } else {
        console.error(`  ❌ 加密后文件未找到: ${outputPath}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`  ❌ 加密失败: ${error.message}`);
      if (error.stdout) console.error('stdout:', error.stdout.toString());
      if (error.stderr) console.error('stderr:', error.stderr.toString());
      process.exit(1);
    }
  });
}

// 最终验证
console.log('\n📁 _site 目录最终内容:');
const outputFiles = fs.readdirSync(outDir);
outputFiles.forEach(f => {
  const stats = fs.statSync(path.join(outDir, f));
  console.log(`  ✅ ${f} (${stats.size} bytes)`);
});

if (!outputFiles.includes('lab-network-config.html')) {
  console.error('\n❌ 严重错误: lab-network-config.html 未生成！');
  process.exit(1);
}