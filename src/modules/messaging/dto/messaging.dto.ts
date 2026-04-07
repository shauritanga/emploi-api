import {
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class InitiateConversationDto {
  @IsString()
  @IsUUID()
  seekerUserId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  jobId?: string;
}

export class RespondToRequestDto {
  @IsBoolean()
  accept: boolean;
}

export class CreateSeekerConversationDto {
  @IsString()
  @IsUUID()
  targetUserId: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
