import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../common/access.service';
import { CreateEncounterDto, UpdateEncounterDto } from './dto';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class EncountersService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async create(user: AuthUser, conditionId: number, dto: CreateEncounterDto) {
    const condition = await this.prisma.condition.findUnique({ where: { id: conditionId } });
    if (!condition) throw new NotFoundException('疾病不存在');
    await this.access.assertCanAccess(user, condition.patientId);

    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.create({
        data: {
          conditionId,
          patientId: condition.patientId,
          encounterDate: new Date(dto.encounterDate),
          hospital: dto.hospital,
          department: dto.department,
          doctor: dto.doctor,
          chiefComplaint: dto.chiefComplaint,
          diagnosis: dto.diagnosis,
          advice: dto.advice,
          notes: dto.notes,
          exams: dto.exams?.length
            ? {
                create: dto.exams.map((e) => ({
                  name: e.name,
                  resultValue: e.resultValue,
                  conclusion: e.conclusion,
                  examDate: e.examDate ? new Date(e.examDate) : undefined,
                })),
              }
            : undefined,
          medications: dto.medications?.length
            ? {
                create: dto.medications.map((m) => ({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  startDate: m.startDate ? new Date(m.startDate) : undefined,
                  endDate: m.endDate ? new Date(m.endDate) : undefined,
                  purpose: m.purpose,
                })),
              }
            : undefined,
          procedures: dto.procedures?.length
            ? {
                create: dto.procedures.map((p) => ({
                  name: p.name,
                  procedureDate: p.procedureDate ? new Date(p.procedureDate) : undefined,
                  surgeon: p.surgeon,
                  result: p.result,
                  hospital: p.hospital,
                  admissionDate: p.admissionDate ? new Date(p.admissionDate) : undefined,
                  dischargeDate: p.dischargeDate ? new Date(p.dischargeDate) : undefined,
                  notes: p.notes,
                })),
              }
            : undefined,
        },
        include: { exams: true, medications: true, procedures: true },
      });

      // 把已上传的 exam/procedure 附件挂到刚创建的记录上
      if (dto.exams?.length) {
        for (let i = 0; i < dto.exams.length; i++) {
          const exam = encounter.exams[i];
          const ids = dto.exams[i].examAttachmentIds;
          if (exam && ids?.length) {
            await tx.attachment.updateMany({
              where: { id: { in: ids }, examId: null },
              data: { examId: exam.id },
            });
          }
        }
      }
      if (dto.procedures?.length) {
        for (let i = 0; i < dto.procedures.length; i++) {
          const proc = encounter.procedures[i];
          const ids = dto.procedures[i].procedureAttachmentIds;
          if (proc && ids?.length) {
            await tx.attachment.updateMany({
              where: { id: { in: ids }, procedureId: null },
              data: { procedureId: proc.id },
            });
          }
        }
      }

      // 同步生成复查计划
      if (dto.hasFollowUp && dto.followUpDueDate) {
        await tx.followUp.create({
          data: {
            conditionId,
            patientId: condition.patientId,
            dueDate: new Date(dto.followUpDueDate),
            items: dto.followUpItems,
            recurring: dto.followUpRecurring ?? false,
            intervalMonths: dto.followUpRecurring ? dto.followUpIntervalMonths : null,
            status: 'PENDING',
          },
        });
      }

      return encounter;
    });
  }

  async update(user: AuthUser, id: number, dto: UpdateEncounterDto) {
    const e = await this.prisma.encounter.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('就诊不存在');
    await this.access.assertCanAccess(user, e.patientId);

    return this.prisma.$transaction(async (tx) => {
      // 传了 exams 数组则整组重建
      if (dto.exams) {
        await tx.exam.deleteMany({ where: { encounterId: id } });
        await tx.exam.createMany({
          data: dto.exams.map((x) => ({
            encounterId: id,
            name: x.name,
            resultValue: x.resultValue,
            conclusion: x.conclusion,
            examDate: x.examDate ? new Date(x.examDate) : undefined,
          })),
        });
      }
      if (dto.medications) {
        await tx.medication.deleteMany({ where: { encounterId: id } });
        await tx.medication.createMany({
          data: dto.medications.map((m) => ({
            encounterId: id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            startDate: m.startDate ? new Date(m.startDate) : undefined,
            endDate: m.endDate ? new Date(m.endDate) : undefined,
            purpose: m.purpose,
          })),
        });
      }
      return tx.encounter.update({
        where: { id },
        data: {
          encounterDate: dto.encounterDate ? new Date(dto.encounterDate) : undefined,
          hospital: dto.hospital,
          department: dto.department,
          doctor: dto.doctor,
          chiefComplaint: dto.chiefComplaint,
          diagnosis: dto.diagnosis,
          advice: dto.advice,
          notes: dto.notes,
        },
        include: { exams: true, medications: true, procedures: true },
      });
    });
  }

  async get(user: AuthUser, id: number) {
    const e = await this.prisma.encounter.findUnique({
      where: { id },
      include: {
        exams: { include: { attachments: true } },
        medications: true,
        procedures: { include: { attachments: true } },
      },
    });
    if (!e) throw new NotFoundException('就诊不存在');
    await this.access.assertCanAccess(user, e.patientId);
    return e;
  }
}
