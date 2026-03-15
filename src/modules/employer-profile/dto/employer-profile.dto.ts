import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { TeamMemberRole } from '@prisma/client';

export class UpdateEmployerProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsNumber()
  foundedYear?: number;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  cultureHighlights?: string[];

  @IsOptional()
  @IsString()
  locationCountry?: string;

  @IsOptional()
  @IsString()
  locationCity?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;
}

export class InviteTeamMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole;
}

export class UpdateTeamMemberRoleDto {
  @IsEnum(TeamMemberRole)
  role: TeamMemberRole;
}

export class VerifyEmployerDto {
  @IsOptional()
  @IsString()
  verificationDocumentUrl?: string;
}
