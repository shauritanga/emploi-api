import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums';

export class UpdateStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
