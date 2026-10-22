import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { VaccineDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class VaccinesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async list(user: AuthUser, patientId: number) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.vaccine.findMany({
      where: { patientId },
      orderBy: [{ vaccinatedAt: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(user: AuthUser, patientId: number, dto: VaccineDto) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.vaccine.create({
      data: {
        patientId,
        name: dto.name,
        brand: dto.brand,
        doses: dto.doses ?? 1,
        doseIndex: dto.doseIndex ?? 1,
        vaccinatedAt: dto.vaccinatedAt ? new Date(dto.vaccinatedAt) : undefined,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        clinic: dto.clinic,
        note: dto.note,
      },
    });
  }

  async update(user: AuthUser, id: number, dto: VaccineDto) {
    const v = await this.prisma.vaccine.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('疫苗记录不存在');
    await this.access.assertCanAccess(user, v.patientId);
    const data: any = {
      name: dto.name,
      brand: dto.brand,
      doses: dto.doses,
      doseIndex: dto.doseIndex,
      clinic: dto.clinic,
      note: dto.note,
    };
    if (dto.vaccinatedAt !== undefined) data.vaccinatedAt = dto.vaccinatedAt ? new Date(dto.vaccinatedAt) : null;
    if (dto.nextDueDate !== undefined) data.nextDueDate = dto.nextDueDate ? new Date(dto.nextDueDate) : null;
    return this.prisma.vaccine.update({ where: { id }, data });
  }

  async remove(user: AuthUser, id: number) {
    const v = await this.prisma.vaccine.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('疫苗记录不存在');
    await this.access.assertCanAccess(user, v.patientId);
    await this.prisma.vaccine.delete({ where: { id } });
    return { ok: true };
  }

  /** 已接种下一针：把 nextDueDate 记为最近接种日，剂次 +1，清空下一针时间 */
  async completeNext(user: AuthUser, id: number) {
    const v = await this.prisma.vaccine.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('疫苗记录不存在');
    await this.access.assertCanAccess(user, v.patientId);
    if (!v.nextDueDate) throw new NotFoundException('没有设置下一针时间');
    return this.prisma.vaccine.update({
      where: { id },
      data: {
        vaccinatedAt: v.nextDueDate,
        doseIndex: Math.min((v.doseIndex ?? 1) + 1, v.doses ?? 1),
        nextDueDate: null,
      },
    });
  }
}
