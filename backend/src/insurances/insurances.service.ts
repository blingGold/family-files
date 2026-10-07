import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { InsuranceDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class InsurancesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async list(user: AuthUser, patientId: number) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.insurance.findMany({
      where: { patientId },
      orderBy: { kind: 'asc' },
      include: { attachments: true },
    });
  }

  async create(user: AuthUser, patientId: number, dto: InsuranceDto) {
    await this.access.assertCanAccess(user, patientId);
    return this.prisma.insurance.create({
      data: {
        patientId,
        kind: dto.kind,
        medicalType: dto.medicalType,
        enrollRegion: dto.enrollRegion,
        reimburseNote: dto.reimburseNote,
        insurer: dto.insurer,
        productType: dto.productType,
        policyNo: dto.policyNo,
        coverageAmount: dto.coverageAmount,
        coverageScope: dto.coverageScope,
        deductible: dto.deductible,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async update(user: AuthUser, id: number, dto: InsuranceDto) {
    const ins = await this.prisma.insurance.findUnique({ where: { id } });
    if (!ins) throw new NotFoundException('保险记录不存在');
    await this.access.assertCanAccess(user, ins.patientId);
    return this.prisma.insurance.update({ where: { id }, data: dto as any });
  }
}
