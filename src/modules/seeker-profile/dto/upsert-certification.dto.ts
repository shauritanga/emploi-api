import { IsString, IsOptional, IsDateString, IsUrl } from 'class-validator';

export class UpsertCertificationDto {
  @IsString() name: string;
  @IsOptional() @IsString() issuingOrganization?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsUrl() credentialUrl?: string;
}
