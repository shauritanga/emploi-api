import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreatePostDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateReplyDto {
  @IsString()
  content: string;
}

export class UpdateReplyDto {
  @IsOptional()
  @IsString()
  content?: string;
}
