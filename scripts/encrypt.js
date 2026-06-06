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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f3f4f6;
    }
    .box {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      width: 90%;
      max-width: 400px;
    }
    h2 {
      margin-bottom: 1rem;
      color: #111827;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.6rem;
      margin: 0.5rem 0 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      box-sizing: border-box;
      outline: none;
    }
    input[type="password"]:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }
    button {
      width: 100%;
      padding: 0.6rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      box-sizing: border-box;
      transition: background 0.2s;
    }
    button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    .error {
      color: #dc2626;
      margin-top: 0.5rem;
      display: none;
      font-size: 0.9rem;
    }
    .countdown {
      color: #6b7280;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="box" id="lock">
    <h2>🔐 需要密码</h2>
    <input type="password" id="pwd" placeholder="输入访问密码" onkeydown="if(event.key==='Enter')decrypt()">
    <button id="unlockBtn" onclick="decrypt()">解锁</button>
    <div class="error" id="error">密码错误，请重试</div>
    <div class="countdown" id="countdown"></div>
  </div>
  <div id="content" style="display:none; width:100%; max-width:800px; background:white; padding:2rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>

  <script>
    const encryptedData = '${encrypted}';
    const saltHex = '${salt.toString('hex')}';
    const ivHex = '${iv.toString('hex')}';

    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    let attempts = parseInt(localStorage.getItem('pwd_attempts') || '0');
    let lockoutExpiry = parseInt(localStorage.getItem('pwd_lockout') || '0');

    const input = document.getElementById('pwd');
    const button = document.getElementById('unlockBtn');
    const errorDiv = document.getElementById('error');
    const countdownDiv = document.getElementById('countdown');

    function updateUI() {
      const now = Date.now();
      if (lockoutExpiry > now) {
        // 锁定状态
        input.disabled = true;
        button.disabled = true;
        errorDiv.style.display = 'none';
        const remaining = Math.ceil((lockoutExpiry - now) / 1000);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        countdownDiv.textContent = '尝试次数过多，请 ' + minutes + '分' + (seconds < 10 ? '0' : '') + seconds + '秒 后再试';
      } else {
        // 未锁定或锁定已过期
        input.disabled = false;
        button.disabled = false;
        countdownDiv.textContent = '';
        if (lockoutExpiry !== 0 && lockoutExpiry <= now) {
          // 锁定时间到期，清除记录
          attempts = 0;
          lockoutExpiry = 0;
          localStorage.removeItem('pwd_attempts');
          localStorage.removeItem('pwd_lockout');
        }
      }
    }

    function lockout() {
      lockoutExpiry = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      localStorage.setItem('pwd_lockout', lockoutExpiry);
      updateUI();
    }

    async function decrypt() {
      if (input.disabled) return;
      const userPassword = input.value;
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
        // 成功：清除计数和锁定
        attempts = 0;
        lockoutExpiry = 0;
        localStorage.removeItem('pwd_attempts');
        localStorage.removeItem('pwd_lockout');
        document.getElementById('lock').style.display = 'none';
        document.getElementById('content').innerHTML = plaintext;
        document.getElementById('content').style.display = 'block';
      } catch (e) {
        // 密码错误
        attempts++;
        localStorage.setItem('pwd_attempts', attempts);
        errorDiv.style.display = 'block';
        input.value = '';
        if (attempts >= MAX_ATTEMPTS) {
          lockout();
        }
      }
    }

    // 页面加载时及每秒更新一次倒计时
    updateUI();
    setInterval(updateUI, 1000);
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