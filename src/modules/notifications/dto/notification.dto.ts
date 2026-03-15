import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  applicationStatus?: boolean = true;

  @IsOptional()
  @IsBoolean()
  newMessage?: boolean = true;

  @IsOptional()
  @IsBoolean()
  interviewRequest?: boolean = true;

  @IsOptional()
  @IsBoolean()
  offerReceived?: boolean = true;

  @IsOptional()
  @IsBoolean()
  jobAlert?: boolean = true;

  @IsOptional()
  @IsBoolean()
  newRating?: boolean = true;

  @IsOptional()
  @IsBoolean()
  profileView?: boolean = true;

  @IsOptional()
  @IsBoolean()
  employerMessageRequest?: boolean = true;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
