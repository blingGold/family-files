import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encryptPlainPassword } from '../src/common/password-crypto';

const prisma = new PrismaClient();

async function main() {
  // 占位符（CHANGE_ME）视为未配置，兜底 admin123，避免把占位符当密码
  const raw = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const placeholder =
    raw.includes('CHANGE_ME') || raw.toLowerCase().includes('change-me');
  const adminPassword = placeholder ? 'admin123' : raw;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      passwordPlainEnc: encryptPlainPassword(adminPassword),
      displayName: '管理员',
      role: 'ADMIN',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: id=${admin.id} username=${admin.username} password=${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
