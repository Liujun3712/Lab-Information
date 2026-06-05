const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const outDir = path.join(__dirname, '..', '_site');
const password = process.env.ENCRYPTION_PASSWORD;

if (!password) {
  console.error('❌ 请设置 ENCRYPTION_PASSWORD 环境变量');
  process.exit(1);
}

// 确保输出目录存在
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 处理 src 下所有 .html 文件
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const outPath = path.join(outDir, file);

  // 公开的 index.html 直接复制
  if (file === 'index.html') {
    fs.copyFileSync(srcPath, outPath);
    console.log(`📄 公开页面: ${file}`);
    return;
  }

  // 需要加密的页面
  const plaintext = fs.readFileSync(srcPath, 'utf8');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const decryptionPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>受保护页面</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
    .box { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 90%; max-width: 400px; }
    input[type="password"] { width: 100%; padding: 0.6rem; margin: 1rem 0; border: 1px solid #d1d5db; border-radius: 6px; }
    button { width: 100%; padding: 0.6rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .error { color: #dc2626; margin-top: 0.5rem; display: none; }
  </style>
</head>
<body>
  <div class="box" id="lock">
    <h2>🔐 需要密码</h2>
    <input type="password" id="pwd" placeholder="输入访问密码">
    <button onclick="decrypt()">解锁</button>
    <div class="error" id="error">密码错误，请重试</div>
  </div>
  <div id="content" style="display:none; width:100%; max-width:800px; background:white; padding:2rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>

  <script>
    const encryptedData = '${encrypted}';
    const saltHex = '${salt.toString('hex')}';
    const ivHex = '${iv.toString('hex')}';

    async function decrypt() {
      const userPassword = document.getElementById('pwd').value;
      if (!userPassword) return;
      try {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(userPassword), 'PBKDF2', false, ['deriveKey']);
        const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
          keyMaterial, { name: 'AES-CBC', length: 256 }, false, ['decrypt']
        );
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, encryptedBytes);
        const plaintext = new TextDecoder().decode(decrypted);
        document.getElementById('lock').style.display = 'none';
        document.getElementById('content').innerHTML = plaintext;
        document.getElementById('content').style.display = 'block';
      } catch (e) {
        document.getElementById('error').style.display = 'block';
      }
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(outPath, decryptionPage, 'utf8');
  console.log(`🔐 已加密: ${file}`);
});

// --- 复制静态资源（图片、apk 等）到 _site ---
const assetDirs = ['images', 'apks'];
assetDirs.forEach(dir => {
  const srcDirPath = path.join(srcDir, dir);
  const outDirPath = path.join(outDir, dir);
  if (fs.existsSync(srcDirPath)) {
    fs.cpSync(srcDirPath, outDirPath, { recursive: true });
    console.log(`📁 已复制静态资源: ${dir}`);
  }
});

console.log('✅ 所有页面处理完成');