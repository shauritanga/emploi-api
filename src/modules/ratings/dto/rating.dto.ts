import { IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRatingDto {
  @IsObject()
  scores: Record<string, number>;

  @IsOptional()
  @IsString()
  reviewText?: string;
}

export class UpdateRatingDto {
  @IsOptional()
  @IsObject()
  scores?: Record<string, number>;

  @IsOptional()
  @IsString()
  reviewText?: string;
}

export class DisputeRatingDto {
  @IsString()
  disputeNote: string;
}
