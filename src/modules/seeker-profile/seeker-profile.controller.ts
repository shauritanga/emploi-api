import {
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
  @UseInterceptors(FileInterceptor('photo'))
  uploadPhoto(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.seekerProfileService.updatePhoto(user.sub, file);
  }

  @Patch('me/video-intro')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @UseInterceptors(FileInterceptor('video'))
  uploadVideoIntro(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.seekerProfileService.updateVideoIntro(user.sub, file);
  }
}
