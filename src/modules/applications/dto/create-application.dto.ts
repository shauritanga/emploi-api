import { IsOptional, IsString, IsObject, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsOptional()
  @IsUUID()
  cvId?: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  // Flutter sends a map {questionId: answer}; converted to array in the service
  @IsOptional()
  @IsObject()
  screeningAnswers?: Record<string, string>;
}
