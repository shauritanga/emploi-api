import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityStatus } from '@prisma/client';

export class SeekerSearchDto {
  @IsOptional() @IsString() skills?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) salaryMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
}
