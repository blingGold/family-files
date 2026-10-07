import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, SetAccessDto } from './dto/users.dto';
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
        displayName: dto.displayName,
        role: dto.role ?? 'USER',
      },
    });
    return { id: u.id, username: u.username, displayName: u.displayName, role: u.role };
  }

  async update(id: number, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {
      displayName: dto.displayName,
      role: dto.role,
    };
    if (dto.password) data['passwordHash'] = await bcrypt.hash(dto.password, 10);
    try {
      const u = await this.prisma.user.update({ where: { id }, data });
      return { id: u.id, username: u.username, displayName: u.displayName, role: u.role };
    } catch {
      throw new NotFoundException('用户不存在');
    }
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
