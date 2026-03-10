import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  IsUrl,
} from 'class-validator';
import { AvailabilityStatus } from '@prisma/client';
import { JobType } from 'src/common/enums';

export class UpdateSeekerProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() locationCountry?: string;
  @IsOptional() @IsString() locationCity?: string;
  @IsOptional() @IsBoolean() locationIsPublic?: boolean;
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;
  @IsOptional()
  @IsArray()
  @IsEnum(JobType, { each: true })
  preferredJobTypes?: JobType[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];
  @IsOptional() @IsBoolean() isOpenToRelocation?: boolean;
  @IsOptional() @IsInt() @Min(0) salaryExpectationMin?: number;
  @IsOptional() @IsInt() @Min(0) salaryExpectationMax?: number;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() @IsBoolean() isProfilePublic?: boolean;
}
