import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { CvService } from './cv.service';
import { CreateCvDto, UpdateCvDto } from './dto/cv.dto';

@ApiTags('CV')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cv')
export class CvController {
  constructor(private cvService: CvService) {}

  @Get()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get all CVs for the seeker' })
  async getMyCvs(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.getSeeekerCvs(user.sub);
  }

  @Post()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Create a new CV' })
  async createCv(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateCvDto,
  ) {
    return this.cvService.create(user.sub, dto);
  }

  @Get('templates')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get available CV templates' })
  async getTemplates() {
    return this.cvService.getTemplates();
  }

  @Get(':id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get CV details' })
  async getCv(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.getById(id, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Update CV' })
  async updateCv(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateCvDto,
  ) {
    return this.cvService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Delete CV' })
  async deleteCv(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.delete(id, user.sub);
  }

  @Post(':id/set-default')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Set CV as default' })
  async setDefault(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.setDefault(id, user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get CV download info (PDF URL + status)' })
  async downloadCv(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.getDownloadInfo(id, user.sub);
  }

  @Get(':cvId/match/:jobId')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Compute job match score for a CV' })
  async getMatchScore(
    @Param('cvId', ParseUUIDPipe) cvId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.cvService.computeJobMatchScore(cvId, jobId, user.sub);
  }
}
