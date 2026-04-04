import { IsOptional, IsString, IsBoolean, IsObject } from 'class-validator';

export class CreateCvDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  contentJson?: Record<string, any>;
}

export class UpdateCvDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  contentJson?: Record<string, any>;
}
