import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateConditionDto {
  @IsString() name!: string;
  @IsOptional() @IsString() aliases?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() discoveredDate?: string;
  @IsOptional() @IsEnum(['FOLLOWING', 'TREATING', 'CURED', 'CHRONIC'])
  status?: 'FOLLOWING' | 'TREATING' | 'CURED' | 'CHRONIC';
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() advice?: string;
  @IsOptional() @IsString() examSuggest?: string;
  @IsOptional() @IsString() examResult?: string;
  @IsOptional() @IsString() medication?: string;
}

export class UpdateConditionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() aliases?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() discoveredDate?: string;
  @IsOptional() @IsEnum(['FOLLOWING', 'TREATING', 'CURED', 'CHRONIC'])
  status?: 'FOLLOWING' | 'TREATING' | 'CURED' | 'CHRONIC';
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() advice?: string;
  @IsOptional() @IsString() examSuggest?: string;
  @IsOptional() @IsString() examResult?: string;
  @IsOptional() @IsString() medication?: string;
}
