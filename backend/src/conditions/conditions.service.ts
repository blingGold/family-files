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
      where: { patientId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        encounters: { where: { deletedAt: null }, orderBy: { encounterDate: 'desc' }, take: 1 },
        followUps: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' }, take: 1 },
      },
    });
  }

  async detail(user: AuthUser, id: number) {
    const c = await this.prisma.condition.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);
    return c;
  }

  /** 软删除疾病（deletedAt 打标，不物理删除；复查/就诊数据保留，可追溯） */
  async softDelete(user: AuthUser, id: number) {
    const c = await this.detail(user, id); // 校验存在 + 权限
    await this.prisma.condition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    // 疾病删除后从病人当前用药中移除该疾病条目
    await this.syncConditionMedications(c.patientId, id);
    return { id, deleted: true };
  }

  async create(user: AuthUser, patientId: number, dto: CreateConditionDto) {
    await this.access.assertCanAccess(user, patientId);
    const c = await this.prisma.condition.create({
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
    // 疾病新增后自动同步病人当前用药（取该疾病最新就诊用药）
    await this.syncConditionMedications(patientId, c.id);
    return c;
  }

  async update(user: AuthUser, id: number, dto: UpdateConditionDto) {
    const c = await this.detail(user, id);
    const updated = await this.prisma.condition.update({
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
    // 疾病编辑后自动同步病人当前用药
    await this.syncConditionMedications(c.patientId, id);
    return updated;
  }

  /**
   * 同步病人"当前用药"（与就诊绑定）：取该疾病最新就诊，多行用药建议合并为「一条」
   * 绑定记录（sourceEncounterId=该就诊）；最新就诊无药则移除该疾病绑定记录。
   * 手动录入的用药记录（manual=true）不受影响。
   * timeRange：按用药起止推断——有起止=时间段；只有止=「~ xx 止」；只有起=「xx 起」；都没有=长期。
   */
  async syncConditionMedications(patientId: number, conditionId: number) {
    const condition = await this.prisma.condition.findUnique({ where: { id: conditionId } });
    const latest = await this.prisma.encounter.findFirst({
      where: { conditionId, deletedAt: null },
      orderBy: { encounterDate: 'desc' },
      include: { medications: true },
    });
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    const current: any[] = Array.isArray(patient?.currentMedications)
      ? patient.currentMedications
      : [];
    // 该疾病已有的绑定记录（manual 为假值即视为绑定；手动记录 manual=true 不受影响）
    const isBinding = (m: any) => !m.manual && m.diseaseId === conditionId;
    const rest = current.filter((m: any) => !isBinding(m));

    let entry: any = null;
    if (latest && latest.medications.length) {
      const text = latest.medications
        .map((m: any) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' '))
        .join('\n');
      const withStart = latest.medications.filter((m: any) => m.startDate)
        .map((m: any) => m.startDate.toISOString().slice(0, 10)).sort();
      const withEnd = latest.medications.filter((m: any) => m.endDate)
        .map((m: any) => m.endDate.toISOString().slice(0, 10)).sort();
      const startDate = withStart.length ? withStart[0] : '';
      const endDate = withEnd.length ? withEnd[withEnd.length - 1] : '';
      let timeRange = '长期';
      if (startDate && endDate) timeRange = `${startDate} ~ ${endDate}`;
      else if (endDate) timeRange = `~ ${endDate} 止`;
      else if (startDate) timeRange = `${startDate} 起`;
      entry = {
        id: `c-${conditionId}`,
        diseaseId: conditionId,
        diseaseName: condition?.name || '',
        sourceEncounterId: latest.id,
        manual: false,
        text,
        startDate: startDate || null,
        endDate: endDate || null,
        timeRange,
      };
    }
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { currentMedications: entry ? [...rest, entry] : rest },
    });
  }

  /** 疾病时间轴：就诊 + 复查合并按日期倒序 */
  async timeline(user: AuthUser, conditionId: number) {
    const c = await this.prisma.condition.findFirst({ where: { id: conditionId, deletedAt: null } });
    if (!c) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, c.patientId);

    const [encounters, followUps] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { conditionId, deletedAt: null },
        orderBy: { encounterDate: 'desc' },
        include: {
          exams: { include: { attachments: true } },
          medications: true,
          procedures: { include: { attachments: true } },
          attachments: true,
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
