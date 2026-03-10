import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  IsDateString,
  IsNotEmpty,
  Max,
} from 'class-validator';
import { JobType, JobStatus, ExperienceLevel } from '../../../common/enums';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsString() benefits?: string;
  @IsOptional() @IsString() locationCountry?: string;
  @IsOptional() @IsString() locationCity?: string;
  @IsBoolean() isRemote: boolean;
  @IsEnum(JobType) jobType: JobType;
  @IsEnum(ExperienceLevel) experienceLevel: ExperienceLevel;

  @IsInt() @Min(0) salaryMin: number;
  @IsInt() @Min(0) salaryMax: number;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() @IsBoolean() salaryIsNegotiable?: boolean;

  @IsArray() @IsString({ each: true }) requiredSkills: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preferredSkills?: string[];

  @IsBoolean() isStreamlinedHiring: boolean;
  @IsOptional() @IsDateString() applicationDeadline?: string;
  @IsOptional() @IsInt() @Min(1) maxApplicants?: number;
}

export class UpdateJobDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsString() benefits?: string;
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
  @IsOptional() @IsInt() @Min(0) salaryMin?: number;
  @IsOptional() @IsInt() @Min(0) salaryMax?: number;
  @IsOptional() @IsBoolean() isStreamlinedHiring?: boolean;
  @IsOptional() @IsDateString() applicationDeadline?: string;
}

export class JobQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
  @IsOptional() @Type(() => Number) @IsInt() salaryMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() salaryMax?: number;
  @IsOptional() @IsBoolean() isRemote?: boolean;
  @IsOptional() @IsBoolean() isStreamlinedHiring?: boolean;
  @IsOptional() @IsString() skills?: string; // comma-separated
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number =
    20;
}
