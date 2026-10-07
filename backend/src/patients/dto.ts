import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString() name!: string;
  @IsOptional() @IsEnum(['MALE', 'FEMALE', 'OTHER']) gender?: 'MALE' | 'FEMALE' | 'OTHER';
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsNumber() heightCm?: number;
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() familyHistory?: string;
  @IsOptional() @IsString() chronicTags?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePatientDto extends CreatePatientDto {}
