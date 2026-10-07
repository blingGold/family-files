import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ExamDto {
  @IsString() name!: string;
  @IsOptional() @IsString() resultValue?: string;
  @IsOptional() @IsString() conclusion?: string;
  @IsOptional() @IsString() examDate?: string;
  @IsOptional() @IsArray() examAttachmentIds?: number[];
}

export class MedicationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() dosage?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() purpose?: string;
}

export class ProcedureDto {
  @IsString() name!: string;
  @IsOptional() @IsString() procedureDate?: string;
  @IsOptional() @IsString() surgeon?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsString() hospital?: string;
  @IsOptional() @IsString() admissionDate?: string;
  @IsOptional() @IsString() dischargeDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() procedureAttachmentIds?: number[];
}

export class CreateEncounterDto {
  @IsString() encounterDate!: string;
  @IsOptional() @IsString() hospital?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() doctor?: string;
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() advice?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsArray() @ValidateNested() @Type(() => ExamDto)
  exams?: ExamDto[];

  @IsOptional() @IsArray() @ValidateNested() @Type(() => MedicationDto)
  medications?: MedicationDto[];

  @IsOptional() @IsArray() @ValidateNested() @Type(() => ProcedureDto)
  procedures?: ProcedureDto[];

  // 复查：保存就诊时可同步生成 follow-up
  @IsOptional() hasFollowUp?: boolean;
  @IsOptional() followUpItems?: string;
  @IsOptional() followUpDueDate?: string;
  @IsOptional() followUpRecurring?: boolean;
  @IsOptional() followUpIntervalMonths?: number;
}

export class UpdateEncounterDto {
  @IsOptional() @IsString() encounterDate?: string;
  @IsOptional() @IsString() hospital?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() doctor?: string;
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() advice?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsArray() @ValidateNested() @Type(() => ExamDto)
  exams?: ExamDto[];

  @IsOptional() @IsArray() @ValidateNested() @Type(() => MedicationDto)
  medications?: MedicationDto[];
}
