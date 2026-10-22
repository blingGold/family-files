import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class VaccineDto {
  @IsString() name!: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsInt() @Min(1) doses?: number;
  @IsOptional() @IsInt() @Min(1) doseIndex?: number;
  @IsOptional() @IsString() vaccinatedAt?: string;
  @IsOptional() @IsString() nextDueDate?: string;
  @IsOptional() @IsString() clinic?: string;
  @IsOptional() @IsString() note?: string;
}
