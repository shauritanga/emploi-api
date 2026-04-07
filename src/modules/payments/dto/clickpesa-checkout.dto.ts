import {
  IsNumber,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class ClickPesaCheckoutDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  reference: string;

  @IsOptional()
  @IsString()
  orderReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
