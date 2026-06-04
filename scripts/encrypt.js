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
  console.log('🗑️  清理旧的 _site 目录');
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });
console.log('📁 创建输出目录: _site');

// 复制公开的 index.html
const srcIndex = path.join(srcDir, 'index.html');
const destIndex = path.join(outDir, 'index.html');
fs.copyFileSync(srcIndex, destIndex);
console.log('✅ 已复制: index.html');

// 找出所有需要加密的 HTML 文件
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`📋 需要加密的文件: ${files.join(', ')}`);

if (files.length === 0) {
  console.log('⚠️  没有需要加密的文件');
} else {
  files.forEach(file => {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(outDir, file);
    
    console.log(`\n🔐 正在加密: ${file}`);
    
    try {
      // 关键修改：使用正确的 staticrypt 命令语法
      const cmd = `npx staticrypt "${inputPath}" "${password}" -o "${outputPath}" -f`;
      console.log(`  执行命令: npx staticrypt [参数已隐藏]`);
      
      execSync(cmd, { 
        stdio: 'inherit',
        timeout: 30000
      });
      
      // 验证加密是否成功
      if (fs.existsSync(outputPath)) {
        const content = fs.readFileSync(outputPath, 'utf8');
        const fileSize = fs.statSync(outputPath).size;
        
        if (content.includes('staticrypt') || content.includes('encrypted') || content.includes('crypto')) {
          console.log(`  ✅ 加密成功！文件大小: ${fileSize} bytes`);
          console.log(`  📄 已生成加密文件: ${outputPath}`);
        } else {
          console.log(`  ⚠️  警告：文件可能未被正确加密，文件大小: ${fileSize} bytes`);
          console.log(`  📄 文件前100个字符: ${content.substring(0, 100)}`);
        }
      } else {
        console.error(`  ❌ 加密后文件未找到: ${outputPath}`);
      }
    } catch (error) {
      console.error(`  ❌ 加密过程出错: ${error.message}`);
      console.error(`  错误详情:`, error.stderr?.toString() || '无错误输出');
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
  
  // 检查文件内容的前几个字符，确认是否是加密文件
  if (f !== 'index.html') {
    const content = fs.readFileSync(path.join(outDir, f), 'utf8');
    console.log(`    文件开头: ${content.substring(0, 80)}...`);
  }
});

if (!outputFiles.includes('lab-network-config.html')) {
  console.error('\n❌ 严重错误: lab-network-config.html 未生成！');
  process.exit(1);
}