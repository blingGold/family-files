import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  /** 当前用户可见的 patientId 集合（admin 返回 null 表示不限制） */
  async visiblePatientIds(user: AuthUser): Promise<number[] | null> {
    if (user.role === 'ADMIN') return null;
    const rows = await this.prisma.userPatientAccess.findMany({
      where: { userId: user.id },
      select: { patientId: true },
    });
    return rows.map((r) => r.patientId);
  }

  /** 断言当前用户可访问该病人；否则抛 403/404 */
  async assertCanAccess(user: AuthUser, patientId: number) {
    if (user.role === 'ADMIN') return;
    const ok = await this.prisma.userPatientAccess.findUnique({
      where: { userId_patientId: { userId: user.id, patientId } },
    });
    if (!ok) throw new ForbiddenException('无权访问该病人档案');
  }

  async assertPatientExists(patientId: number) {
    const p = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!p) throw new NotFoundException('病人不存在');
    return p;
  }
}
