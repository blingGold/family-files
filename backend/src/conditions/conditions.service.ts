import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { CreateConditionDto, UpdateConditionDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class ConditionsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async listForPatient(user: AuthUser, patientId: number) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.condition.findMany({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
      include: {
        encounters: { orderBy: { encounterDate: 'desc' }, take: 1 },
        followUps: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' }, take: 1 },
      },
    });
  }

  async detail(user: AuthUser, id: number) {
    const c = await this.prisma.condition.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);
    return c;
  }

  async create(user: AuthUser, patientId: number, dto: CreateConditionDto) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.condition.create({
      data: {
        patientId,
        name: dto.name,
        aliases: dto.aliases,
        category: dto.category,
        discoveredDate: dto.discoveredDate ? new Date(dto.discoveredDate) : undefined,
        status: dto.status,
        severity: dto.severity,
        notes: dto.notes,
        advice: dto.advice,
        examSuggest: dto.examSuggest,
        examResult: dto.examResult,
        medication: dto.medication,
      },
    });
  }

  async update(user: AuthUser, id: number, dto: UpdateConditionDto) {
    const c = await this.detail(user, id);
    return this.prisma.condition.update({
      where: { id },
      data: {
        name: dto.name,
        aliases: dto.aliases,
        category: dto.category,
        discoveredDate: dto.discoveredDate ? new Date(dto.discoveredDate) : undefined,
        status: dto.status,
        severity: dto.severity,
        notes: dto.notes,
        advice: dto.advice,
        examSuggest: dto.examSuggest,
        examResult: dto.examResult,
        medication: dto.medication,
      },
    });
  }

  /** 疾病时间轴：就诊 + 复查合并按日期倒序 */
  async timeline(user: AuthUser, conditionId: number) {
    const c = await this.prisma.condition.findUnique({ where: { id: conditionId } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);

    const [encounters, followUps] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { conditionId },
        orderBy: { encounterDate: 'desc' },
        include: {
          exams: { include: { attachments: true } },
          medications: true,
          procedures: { include: { attachments: true } },
        },
      }),
      this.prisma.followUp.findMany({
        where: { conditionId },
        orderBy: { dueDate: 'desc' },
      }),
    ]);

    const nodes: any[] = [];
    for (const e of encounters) {
      nodes.push({ type: 'encounter', date: e.encounterDate, data: e });
    }
    for (const f of followUps) {
      nodes.push({ type: 'followup', date: f.dueDate, data: f });
    }
    nodes.sort((a, b) => b.date.getTime() - a.date.getTime());
    return { condition: c, nodes };
  }
}
