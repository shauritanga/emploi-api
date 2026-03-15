import { IsOptional, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @IsNumber()
  salaryOffered: number;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsNumber()
  salaryOffered?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  negotiationNote?: string;
}

export class NegotiateOfferDto {
  @IsString()
  negotiationNote: string;

  @IsOptional()
  @IsNumber()
  suggestedSalary?: number;
}
