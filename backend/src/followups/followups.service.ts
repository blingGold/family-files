import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { CompleteFollowUpDto, UpdateFollowUpDto, CreateFollowUpDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FollowUpsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private config: ConfigService,
  ) {}

  /** 提醒中心：返回当前用户可见范围内所有 PENDING 复查，逾期置顶 */
  async list(user: AuthUser, scope: 'all' | 'patient', patientId?: number) {
    const ids = await this.access.visiblePatientIds(user);
    const leadDays = Number(this.config.get('LEAD_DAYS') || 30);
    const horizon = new Date(Date.now() + leadDays * 86400000);

    const where: any = {
      status: 'PENDING',
      dueDate: { lte: horizon },
      // 疾病已软删除、病人已软删除的复查不再提醒（FollowUp 无 patient 关系，经 condition 关系链过滤）
      condition: { deletedAt: null, patient: { deletedAt: null } },
    };
    if (scope === 'patient' && patientId) {
      await this.access.assertCanAccess(user, patientId);
      where.patientId = patientId;
    } else if (ids !== null) {
      where.patientId = { in: ids };
    }

    const rows = await this.prisma.followUp.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        condition: { select: { id: true, name: true } },
      },
    });
    // 逾期口径：当天到期不算逾期，从次日 0 点起算（dueDate < 今天零点）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return rows.map((r) => ({
      ...r,
      overdue: r.dueDate < todayStart,
      overdueDays: r.dueDate < todayStart
        ? Math.floor((todayStart.getTime() - r.dueDate.getTime()) / 86400000)
        : Math.floor((r.dueDate.getTime() - todayStart.getTime()) / 86400000),
    }));
  }

  async create(user: AuthUser, conditionId: number, dto: CreateFollowUpDto) {
    const c = await this.prisma.condition.findUnique({ where: { id: conditionId } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);
    return this.prisma.followUp.create({
      data: {
        conditionId,
        patientId: c.patientId,
        dueDate: new Date(dto.dueDate),
        items: dto.items,
        recurring: dto.recurring ?? false,
        intervalMonths: dto.recurring ? dto.intervalMonths : null,
      },
    });
  }

  /** 完成复查：周期性则自动排下一条 */
  async complete(user: AuthUser, id: number, dto: CompleteFollowUpDto) {
    const fu = await this.prisma.followUp.findUnique({ where: { id } });
    if (!fu) throw new NotFoundException('复查不存在');
    await this.access.assertCanAccess(user, fu.patientId);

    const completedDate = dto.completedDate ? new Date(dto.completedDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 复查完成 → 自动创建一条就诊记录（复诊）
      const cond = await tx.condition.findUnique({ where: { id: fu.conditionId } });
      const enc = await tx.encounter.create({
        data: {
          conditionId: fu.conditionId,
          patientId: fu.patientId,
          encounterDate: completedDate,
          diagnosis: cond?.name ?? undefined,
          notes: `复查完成（${fu.items || '复查'}）`,
        },
      });
      await tx.followUp.update({
        where: { id },
        data: {
          status: 'DONE',
          completedDate,
          completedEncounterId: dto.completedEncounterId ?? enc.id,
        },
      });
      if (fu.recurring && fu.intervalMonths) {
        const next = new Date(completedDate);
        next.setMonth(next.getMonth() + fu.intervalMonths);
        await tx.followUp.create({
          data: {
            conditionId: fu.conditionId,
            patientId: fu.patientId,
            dueDate: next,
            items: fu.items,
            recurring: true,
            intervalMonths: fu.intervalMonths,
            status: 'PENDING',
          },
        });
      }
      return tx.followUp.findUnique({ where: { id } });
    });
  }

  async update(user: AuthUser, id: number, dto: UpdateFollowUpDto) {
    const fu = await this.prisma.followUp.findUnique({ where: { id } });
    if (!fu) throw new NotFoundException('复查不存在');
    await this.access.assertCanAccess(user, fu.patientId);
    return this.prisma.followUp.update({
      where: { id },
      data: {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        items: dto.items,
        recurring: dto.recurring,
        intervalMonths: dto.recurring ? dto.intervalMonths : null,
        status: dto.status,
      },
    });
  }

  /** 角标计数：当前用户可见范围内到期/逾期的 PENDING 数 */
  async remove(user: AuthUser, id: number) {
    const fu = await this.prisma.followUp.findUnique({ where: { id } });
    if (!fu) throw new NotFoundException('复查不存在');
    await this.access.assertCanAccess(user, fu.patientId);
    await this.prisma.followUp.delete({ where: { id } });
    return { ok: true };
  }

  async badgeCount(user: AuthUser) {
    const ids = await this.access.visiblePatientIds(user);
    const leadDays = Number(this.config.get('LEAD_DAYS') || 30);
    const horizon = new Date(Date.now() + leadDays * 86400000);
    const where: any = {
      status: 'PENDING',
      dueDate: { lte: horizon },
      condition: { deletedAt: null, patient: { deletedAt: null } },
    };
    if (ids !== null) where.patientId = { in: ids };
    const count = await this.prisma.followUp.count({ where });
    return { count };
  }
}
