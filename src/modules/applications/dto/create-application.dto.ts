import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

type ScreeningAnswerArrayItem = {
  questionId: string;
  answer: unknown;
};

const hasValidArrayShape = (
  value: unknown,
): value is ScreeningAnswerArrayItem[] => {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    if (!('questionId' in item) || !('answer' in item)) return false;
    const questionId = (item as { questionId?: unknown }).questionId;
    return typeof questionId === 'string' && questionId.trim().length > 0;
  });
};

const normalizeScreeningAnswers = (value: unknown): unknown => {
  if (!hasValidArrayShape(value)) return value;
  return value.reduce<Record<string, string>>((acc, item) => {
    acc[item.questionId] = String(item.answer);
    return acc;
  }, {});
};

export class CreateApplicationDto {
  @IsOptional()
  @IsUUID()
  cvId?: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  // Flutter sends a map {questionId: answer}; converted to array in the service
  @IsOptional()
  @Transform(({ value }) => normalizeScreeningAnswers(value))
  @IsObject()
  screeningAnswers?: Record<string, string>;
}
