import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async list(user: AuthUser) {
    const ids = await this.access.visiblePatientIds(user);
    const patients = await this.prisma.patient.findMany({
      where: ids === null ? { deletedAt: null } : { id: { in: ids }, deletedAt: null },
      orderBy: { id: 'asc' },
      include: {
        // 软删疾病不出现在病人列表（复查等随之隐藏）
        conditions: { where: { deletedAt: null }, include: { followUps: true } },
        insurances: true,
      },
    });
    return patients.map((p) => this.toSummary(p, user));
  }

  async detail(user: AuthUser, id: number) {
    await this.access.assertCanAccess(user, id);
    const p = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        conditions: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          include: {
            encounters: { where: { deletedAt: null }, orderBy: { encounterDate: 'desc' }, take: 1 },
            followUps: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' } },
          },
        },
        insurances: true,
      },
    });
    if (!p) throw new ForbiddenException('病人不存在');
    // 标签由已录入疾病自动生成，不再手动录入
    return {
      ...p,
      chronicTags: (p.conditions || []).map((c: any) => c.name).join(','),
    };
  }

  async create(user: AuthUser, dto: CreatePatientDto) {
    // 任何登录用户都可新增家庭成员（家庭协作：谁录的谁管）
    // 非管理员创建后自动获得该成员的查看/管理权限；管理员天然可见全部，无需授权
    const patient = await this.prisma.patient.create({ data: this.toData(dto) });
    if (user.role !== 'ADMIN') {
      await this.prisma.userPatientAccess.upsert({
        where: { userId_patientId: { userId: user.id, patientId: patient.id } },
        update: {},
        create: { userId: user.id, patientId: patient.id },
      });
    }
    return patient;
  }

  async update(user: AuthUser, id: number, dto: UpdatePatientDto) {
    await this.access.assertCanAccess(user, id);
    return this.prisma.patient.update({ where: { id }, data: this.toData(dto) });
  }

  /** 软删除病人（deletedAt 打标；疾病/就诊/复查数据保留可追溯） */
  async softDelete(user: AuthUser, id: number) {
    await this.access.assertCanAccess(user, id);
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /** 手动编辑病人当前用药列表（覆盖式保存） */
  async updateMedications(user: AuthUser, id: number, dto: any) {
    await this.access.assertCanAccess(user, id);
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    const current: any[] = Array.isArray(patient?.currentMedications) ? patient.currentMedications : [];
    const remove = new Set((dto?.removeDiseaseIds || []).map(Number));
    // 保留：未删除疾病的绑定记录 + 全部手动记录
    const kept = current.filter((m: any) => !(!m.manual && m.diseaseId != null && remove.has(m.diseaseId)));
    const keptBinding = kept.filter((m: any) => !m.manual);
    // 手动记录全量替换
    const manual = (dto?.manual || []).map((m: any) => ({
      id: m.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      diseaseId: m.diseaseId ?? null,
      diseaseName: m.diseaseName || '',
      sourceEncounterId: null,
      manual: true,
      text: m.text || m.name || '',
      startDate: m.startDate || null,
      endDate: m.endDate || null,
      timeRange:
        m.startDate && m.endDate
          ? `${m.startDate} ~ ${m.endDate}`
          : m.endDate
            ? `~ ${m.endDate} 止`
            : m.startDate
              ? `${m.startDate} 起`
              : '长期',
    })).filter((m: any) => m.text);
    return this.prisma.patient.update({
      where: { id },
      data: { currentMedications: [...keptBinding, ...manual] },
    });
  }

  private toData(dto: CreatePatientDto) {
    return {
      name: dto.name,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      bloodType: dto.bloodType,
      allergies: dto.allergies,
      familyHistory: dto.familyHistory,
      chronicTags: dto.chronicTags,
      notes: dto.notes,
    };
  }

  private toSummary(p: any, _user: AuthUser) {
    const pendingFollowUps = p.conditions.flatMap((c: any) =>
      c.followUps.filter((f: any) => f.status === 'PENDING'),
    );
    return {
      id: p.id,
      name: p.name,
      gender: p.gender,
      birthDate: p.birthDate,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      bloodType: p.bloodType,
      allergies: p.allergies,
      familyHistory: p.familyHistory,
      // 标签由已录入疾病自动生成，不再手动录入
      chronicTags: (p.conditions || []).map((c: any) => c.name).join(','),
      notes: p.notes,
      conditions: p.conditions,
      insurances: p.insurances,
      pendingFollowUpCount: pendingFollowUps.length,
    };
  }
}
