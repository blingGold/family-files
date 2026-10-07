import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CompleteFollowUpDto {
  @IsOptional() completedEncounterId?: number;
  @IsOptional() completedDate?: string;
}

export class UpdateFollowUpDto {
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() items?: string;
  @IsOptional() @IsBoolean() recurring?: boolean;
  @IsOptional() @IsInt() intervalMonths?: number;
  @IsOptional() @IsString() status?: 'PENDING' | 'POSTPONED' | 'CANCELLED';
}

export class CreateFollowUpDto {
  @IsInt() patientId!: number;
  @IsString() dueDate!: string;
  @IsOptional() @IsString() items?: string;
  @IsOptional() @IsBoolean() recurring?: boolean;
  @IsOptional() @IsInt() intervalMonths?: number;
}
