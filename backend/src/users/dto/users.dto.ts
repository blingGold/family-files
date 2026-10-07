import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() username!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsEnum(['ADMIN', 'USER']) role?: 'ADMIN' | 'USER';
}

export class UpdateUserDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(['ADMIN', 'USER']) role?: 'ADMIN' | 'USER';
}

export class SetAccessDto {
  @IsArray() @IsInt({ each: true }) patientIds!: number[];
}
