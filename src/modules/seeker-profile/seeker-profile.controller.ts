import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { SeekerProfileService } from './seeker-profile.service';
import {
  UpdateSeekerProfileDto,
  UpsertExperienceDto,
  UpsertEducationDto,
  UpsertSkillDto,
  UpsertCertificationDto,
  SeekerSearchDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { Public } from 'src/common/decorators/puplic.decorator';

const uploadRootDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
const photosDir = join(uploadRootDir, 'photos');
const videosDir = join(uploadRootDir, 'videos');

const allowedPhotoMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const allowedVideoMimeTypes = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

function ensureDirectoryExists(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function buildSafeFilename(originalName: string) {
  const extension = extname(originalName || '').toLowerCase();
  return `${Date.now()}-${randomUUID()}${extension}`;
}

const photoUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureDirectoryExists(photosDir);
      callback(null, photosDir);
    },
    filename: (_req, file, callback) => {
      callback(null, buildSafeFilename(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (!allowedPhotoMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException('Only JPG, PNG, and WEBP images are allowed'),
      );
      return;
    }
    callback(null, true);
  },
};

const videoUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensureDirectoryExists(videosDir);
      callback(null, videosDir);
    },
    filename: (_req, file, callback) => {
      callback(null, buildSafeFilename(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (!allowedVideoMimeTypes.has(file.mimetype)) {
      callback(
        new BadRequestException('Only MP4, MOV, and WEBM videos are allowed'),
      );
      return;
    }
    callback(null, true);
  },
};

@ApiTags('Seeker Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seeker-profile')
export class SeekerProfileController {
  constructor(private seekerProfileService: SeekerProfileService) {}

  @Get('me')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  getMyProfile(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.seekerProfileService.getProfile(user.sub);
  }

  @Public()
  @Get('public/:id')
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.seekerProfileService.getPublicProfile(id);
  }

  @Patch('me')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  updateProfile(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateSeekerProfileDto,
  ) {
    return this.seekerProfileService.updateProfile(user.sub, dto);
  }

  // ── Experience ──────────────────────────────────────────

  @Post('me/experience')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  addExperience(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpsertExperienceDto,
  ) {
    return this.seekerProfileService.upsertExperience(user.sub, dto);
  }

  @Patch('me/experience/:id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  updateExperience(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertExperienceDto,
  ) {
    return this.seekerProfileService.upsertExperience(user.sub, { ...dto, id });
  }

  @Delete('me/experience/:id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  deleteExperience(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.seekerProfileService.deleteExperience(user.sub, id);
  }

  // ── Education ───────────────────────────────────────────

  @Post('me/education')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  addEducation(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpsertEducationDto,
  ) {
    return this.seekerProfileService.upsertEducation(user.sub, dto);
  }

  @Patch('me/education/:id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  updateEducation(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertEducationDto,
  ) {
    return this.seekerProfileService.upsertEducation(user.sub, { ...dto, id });
  }

  @Delete('me/education/:id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  deleteEducation(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.seekerProfileService.deleteEducation(user.sub, id);
  }

  // ── Skills ──────────────────────────────────────────────

  @Put('me/skills')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  syncSkills(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body: { skills: UpsertSkillDto[] },
  ) {
    return this.seekerProfileService.syncSkills(user.sub, body.skills);
  }

  // ── Certifications ──────────────────────────────────────

  @Post('me/certifications')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  addCertification(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpsertCertificationDto,
  ) {
    return this.seekerProfileService.addCertification(user.sub, dto);
  }

  @Delete('me/certifications/:id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  deleteCertification(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.seekerProfileService.deleteCertification(user.sub, id);
  }

  // ── Search (employer use) ────────────────────────────────

  @Get('search')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  search(@Query() query: SeekerSearchDto) {
    return this.seekerProfileService.searchSeekers(query);
  }

  // ── File Uploads ─────────────────────────────────────────

  @Patch('me/photo')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions))
  uploadPhoto(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.seekerProfileService.updatePhoto(user.sub, file);
  }

  @Patch('me/video-intro')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @UseInterceptors(FileInterceptor('video', videoUploadOptions))
  uploadVideoIntro(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.seekerProfileService.updateVideoIntro(user.sub, file);
  }
}
