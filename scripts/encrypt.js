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
if (fs.existsSync(srcIndex)) {
  fs.copyFileSync(srcIndex, destIndex);
  console.log('✅ 已复制公开首页: index.html');
} else {
  console.log('⚠️  未找到 src/index.html');
}

// 找出所有需要加密的 HTML 文件
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`🔍 找到 ${files.length} 个需要加密的文件:`, files);

if (files.length === 0) {
  console.log('⚠️  没有需要加密的文件');
} else {
  files.forEach(file => {
    const input = path.resolve(path.join(srcDir, file));
    const output = path.resolve(path.join(outDir, file));
    
    console.log(`🔐 正在加密: ${file}`);
    console.log(`  输入文件: ${input}`);
    console.log(`  输出文件: ${output}`);
    console.log(`  输入文件存在: ${fs.existsSync(input)}`);
    
    if (!fs.existsSync(input)) {
      console.error(`  ❌ 输入文件不存在: ${input}`);
      return;
    }
    
    try {
      // 使用完整路径执行 staticrypt
      const command = `npx staticrypt "${input}" -o "${output}" -p "${password}" -f`;
      console.log(`  执行命令: npx staticrypt [参数已隐藏]`);
      
      const result = execSync(command, { 
        stdio: 'pipe',  // 捕获输出以便调试
        timeout: 30000  // 30秒超时
      });
      
      console.log(`  📄 Staticrypt 输出:`, result.toString());
      
      // 检查输出文件是否真的生成了
      if (fs.existsSync(output)) {
        const stats = fs.statSync(output);
        console.log(`  ✅ 加密成功: ${file} (${stats.size} bytes)`);
      } else {
        console.error(`  ❌ 加密后文件未生成: ${output}`);
      }
    } catch (error) {
      console.error(`  ❌ 加密失败: ${error.message}`);
      if (error.stdout) console.error(`  标准输出:`, error.stdout.toString());
      if (error.stderr) console.error(`  错误输出:`, error.stderr.toString());
    }
  });
}

// 详细列出输出目录的内容
console.log('\n📁 _site 目录完整内容：');
if (fs.existsSync(outDir)) {
  const outputFiles = fs.readdirSync(outDir);
  if (outputFiles.length === 0) {
    console.log('  (空目录)');
  } else {
    outputFiles.forEach(f => {
      const stat = fs.statSync(path.join(outDir, f));
      console.log(`  - ${f} (${stat.size} bytes)`);
    });
  }
} else {
  console.log('  _site 目录不存在！');
}