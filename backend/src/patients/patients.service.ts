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
      where: ids === null ? {} : { id: { in: ids } },
      orderBy: { id: 'asc' },
      include: {
        conditions: { include: { followUps: true } },
        insurances: true,
      },
    });
    return patients.map((p) => this.toSummary(p, user));
  }

  async detail(user: AuthUser, id: number) {
    await this.access.assertCanAccess(user, id);
    const p = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        conditions: {
          orderBy: { updatedAt: 'desc' },
          include: {
            encounters: { orderBy: { encounterDate: 'desc' }, take: 1 },
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
    if (user.role !== 'ADMIN') throw new ForbiddenException('仅管理员可新建家庭成员');
    return this.prisma.patient.create({ data: this.toData(dto) });
  }

  async update(user: AuthUser, id: number, dto: UpdatePatientDto) {
    await this.access.assertCanAccess(user, id);
    return this.prisma.patient.update({ where: { id }, data: this.toData(dto) });
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
