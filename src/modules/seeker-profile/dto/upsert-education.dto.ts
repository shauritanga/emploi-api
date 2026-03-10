import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class UpsertEducationDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() institutionName: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() fieldOfStudy?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsString() activities?: string;
  @IsOptional() displayOrder?: number;
}