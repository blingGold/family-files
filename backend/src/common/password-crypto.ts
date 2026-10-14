import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// 可查看密码的对称加密：AES-256-GCM
// 用途：管理员在用户管理页查看各账号密码（家庭私有场景）；数据库不裸存明文。
// 密钥与应用绑定（固定派生），与 JWT_SECRET 解耦，避免 seed/bootstrap 时序导致解密失败。
const APP_KEY = 'family-files-pwd-cipher-key-2026';

function key(): Buffer {
  return createHash('sha256').update(APP_KEY).digest();
}

export function encryptPlainPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptPlainPassword(token: string): string {
  try {
    const [ivB64, tagB64, dataB64] = token.split('.');
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
