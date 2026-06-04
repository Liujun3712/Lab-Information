const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SRC_HTML = path.join(__dirname, '..', 'src', 'lab-network-config.html');
const OUT_HTML = path.join(__dirname, '..', '_site', 'lab-network-config.html');
const INDEX_SRC = path.join(__dirname, '..', 'src', 'index.html');
const INDEX_OUT = path.join(__dirname, '..', '_site', 'index.html');

const password = process.env.ENCRYPTION_PASSWORD;
if (!password) {
  console.error('❌ 请设置 ENCRYPTION_PASSWORD 环境变量');
  process.exit(1);
}

// 读取源文件
const plaintext = fs.readFileSync(SRC_HTML, 'utf8');

// 生成随机 Salt 和 IV
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(16);

// 使用 PBKDF2 派生密钥 (32 字节，10000 次迭代)
const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

// AES-256-CBC 加密
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(plaintext, 'utf8', 'base64');
encrypted += cipher.final('base64');

// 构建 HTML 解密页面
const decryptionPage = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>实验室网络配置</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
    #lock-screen, #content { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px; width: 100%; }
    input[type="password"] { width: 100%; padding: 0.5rem; margin: 1rem 0; box-sizing: border-box; }
    button { width: 100%; padding: 0.5rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .error { color: #dc2626; margin-top: 0.5rem; display: none; }
  </style>
</head>
<body>
  <div id="lock-screen">
    <h2>🔐 受保护的内容</h2>
    <p>请输入访问密码</p>
    <input type="password" id="password" placeholder="密码">
    <button onclick="decrypt()">解锁</button>
    <div class="error" id="error">密码错误，请重试。</div>
  </div>
  <div id="content" style="display:none;"></div>

  <script>
    const encryptedData = '${encrypted}';
    const saltHex = '${salt.toString('hex')}';
    const ivHex = '${iv.toString('hex')}';

    async function decrypt() {
      const userPassword = document.getElementById('password').value;
      if (!userPassword) return;

      try {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw', enc.encode(userPassword), 'PBKDF2', false, ['deriveKey']
        );
        const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 10000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-CBC', length: 256 },
          false,
          ['decrypt']
        );
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-CBC', iv: iv },
          key,
          encryptedBytes
        );
        const plaintext = new TextDecoder().decode(decrypted);

        document.getElementById('lock-screen').style.display = 'none';
        document.getElementById('content').innerHTML = plaintext;
        document.getElementById('content').style.display = 'block';
      } catch (e) {
        document.getElementById('error').style.display = 'block';
      }
    }
  </script>
</body>
</html>`;

// 确保输出目录存在
const outDir = path.dirname(OUT_HTML);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 写入加密后的 HTML
fs.writeFileSync(OUT_HTML, decryptionPage, 'utf8');
console.log('✅ 加密页面已生成：', OUT_HTML);

// 复制 index.html（公开页面）
if (!fs.existsSync(path.dirname(INDEX_OUT))) {
  fs.mkdirSync(path.dirname(INDEX_OUT), { recursive: true });
}
fs.copyFileSync(INDEX_SRC, INDEX_OUT);
console.log('✅ 公开首页已复制：', INDEX_OUT);