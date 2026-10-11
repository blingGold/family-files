import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const PLACEHOLDER_MARKERS = ['change_me', 'change-me', 'changeme'];

/**
 * 系统密钥解析服务（关键机制）：
 *
 * 目标：用户整体覆盖项目文件夹（zip 替换）时，data/backend.env 会被模板覆盖成
 * 占位符 CHANGE_ME——但真实密钥早已持久化在数据库（data/db，永远不被覆盖），
 * 启动时自动找回，用户无需重新填写。
 *
 * 优先级规则（resolve）：
 *   1. 环境变量是【真实值】（非占位）→ 持久化到数据库并返回（改 key 立即生效）
 *   2. 环境变量是【占位/缺失】→ 返回数据库已持久化的值（升级覆盖后自动找回）
 *   3. 都没有且 autoGenerate → 自动生成随机值并持久化（仅 JWT_SECRET 使用）
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaClient) {}

  isPlaceholder(value?: string): boolean {
    if (!value) return true;
    const t = value.trim().toLowerCase();
    return PLACEHOLDER_MARKERS.some((m) => t.includes(m));
  }

  async get(key: string): Promise<string | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async persist(key: string, value: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async resolve(
    key: string,
    envValue?: string,
    opts?: { autoGenerate?: boolean },
  ): Promise<string> {
    // 1. 环境变量为真实值 → 持久化 + 返回
    if (envValue && !this.isPlaceholder(envValue)) {
      const v = envValue.trim();
      await this.persist(key, v);
      this.logger.log(`${key} 已从环境变量加载并持久化`);
      return v;
    }
    // 2. 环境变量占位/缺失 → 找回数据库持久化值
    const stored = await this.get(key);
    if (stored) {
      this.logger.log(`${key} 从数据库找回（升级覆盖不丢密钥）`);
      return stored;
    }
    // 3. 都无 → 自动生成（JWT）
    if (opts?.autoGenerate) {
      const crypto = require('crypto');
      const gen = crypto.randomBytes(32).toString('hex');
      await this.persist(key, gen);
      this.logger.log(`${key} 未配置，已自动生成随机值`);
      return gen;
    }
    return envValue || '';
  }
}
