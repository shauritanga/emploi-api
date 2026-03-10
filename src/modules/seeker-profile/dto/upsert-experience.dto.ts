import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { JobType } from 'src/common/enums';

export class UpsertExperienceDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() companyName: string;
  @IsString() jobTitle: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(JobType) employmentType?: JobType;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) skillsUsed?: string[];
  @IsOptional() displayOrder?: number;
}
