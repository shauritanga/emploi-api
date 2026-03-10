import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ProficiencyLevel } from 'generated/prisma';

export class UpsertSkillDto {
  @IsString() skillName: string;
  @IsOptional() @IsEnum(ProficiencyLevel) proficiencyLevel?: ProficiencyLevel;
  @IsOptional() @IsInt() @Min(0) yearsOfExperience?: number;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}
