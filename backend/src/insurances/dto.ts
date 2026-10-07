import { IsEnum, IsOptional, IsString } from 'class-validator';

export class InsuranceDto {
  @IsEnum(['MEDICAL', 'COMMERCIAL']) kind!: 'MEDICAL' | 'COMMERCIAL';
  @IsOptional() @IsString() medicalType?: string;
  @IsOptional() @IsString() enrollRegion?: string;
  @IsOptional() @IsString() reimburseNote?: string;
  @IsOptional() @IsString() insurer?: string;
  @IsOptional() @IsString() productType?: string;
  @IsOptional() @IsString() policyNo?: string;
  @IsOptional() @IsString() coverageAmount?: string;
  @IsOptional() @IsString() coverageScope?: string;
  @IsOptional() @IsString() deductible?: string;
  @IsOptional() @IsString() effectiveDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() notes?: string;
}
