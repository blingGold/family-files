import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, SetAccessDto } from './dto/users.dto';
import { encryptPlainPassword, decryptPlainPassword } from '../common/password-crypto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: { access: { include: { patient: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      // 管理员查看密码：解密明文（老账号无加密字段则返回空）
      password: u.passwordPlainEnc ? decryptPlainPassword(u.passwordPlainEnc) : '',
      patients: u.access.map((a) => ({ id: a.patient.id, name: a.patient.name })),
    }));
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('用户名已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const u = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        passwordPlainEnc: encryptPlainPassword(dto.password),
        displayName: dto.displayName,
        role: dto.role ?? 'USER',
      },
    });
    return { id: u.id, username: u.username, displayName: u.displayName, role: u.role, password: dto.password };
  }

  async update(id: number, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {
      displayName: dto.displayName,
      role: dto.role,
    };
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 10);
      data['passwordPlainEnc'] = encryptPlainPassword(dto.password);
    }
    try {
      const u = await this.prisma.user.update({ where: { id }, data });
      return { id: u.id, username: u.username, displayName: u.displayName, role: u.role, password: u.passwordPlainEnc ? decryptPlainPassword(u.passwordPlainEnc) : '' };
    } catch {
      throw new NotFoundException('用户不存在');
    }
  }

  /** 当前账号修改自己的密码（旧密码校验） */
  async changeMyPassword(userId: number, oldPassword: string, newPassword: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('用户不存在');
    const ok = await bcrypt.compare(oldPassword, u.passwordHash);
    if (!ok) throw new BadRequestException('原密码不正确');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordPlainEnc: encryptPlainPassword(newPassword) },
    });
    return { ok: true };
  }

  async remove(id: number, currentUser: AuthUser) {
    if (id === currentUser.id) throw new BadRequestException('不能删除当前登录账号');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('用户不存在');
    if (u.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) throw new BadRequestException('至少需要保留一个管理员账号');
    }
    // UserPatientAccess 关联数据随 onDelete: Cascade 自动清除
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async setAccess(userId: number, dto: SetAccessDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userPatientAccess.deleteMany({ where: { userId } });
      for (const patientId of dto.patientIds) {
        await tx.userPatientAccess.create({ data: { userId, patientId } });
      }
    });
    return this.listForUser(userId);
  }

  async listForUser(userId: number) {
    const rows = await this.prisma.userPatientAccess.findMany({
      where: { userId },
      include: { patient: true },
    });
    return rows.map((r) => ({ id: r.patient.id, name: r.patient.name }));
  }
}
