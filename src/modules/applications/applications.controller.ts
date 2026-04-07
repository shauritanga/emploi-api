import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}
  private static readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private toCreateApplicationDto(
    payload: Record<string, unknown>,
  ): CreateApplicationDto {
    const dto = new CreateApplicationDto();
    if (typeof payload.cvId === 'string') {
      if (!ApplicationsController.uuidRegex.test(payload.cvId)) {
        throw new BadRequestException('cvId must be a valid UUID');
      }
      dto.cvId = payload.cvId;
    }
    if (typeof payload.coverLetter === 'string' || payload.coverLetter === null) {
      dto.coverLetter = payload.coverLetter ?? undefined;
    }
    if (payload.screeningAnswers != null) {
      dto.screeningAnswers = payload.screeningAnswers as Record<string, string>;
    }
    return dto;
  }

  @Post('jobs/:jobId')
  @ApiBody({ type: CreateApplicationDto })
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  apply(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() payload: Record<string, unknown>,
  ) {
    const dto = this.toCreateApplicationDto(payload);
    return this.applicationsService.apply(user.sub, jobId, dto);
  }

  @Get('mine')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  getMyApplications(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.applicationsService.getSeekerApplications(user.sub);
  }

  @Get('pipeline/:jobId')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  getPipeline(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.applicationsService.getEmployerPipeline(jobId, user.sub);
  }

  @Patch(':id/status')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, user.sub, dto);
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.applicationsService.withdraw(id, user.sub);
  }

  @Post(':id/open')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  markOpened(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.applicationsService.markOpened(id, user.sub);
  }

  @Post(':id/notes')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body: { content: string; isInternal?: boolean },
  ) {
    return this.applicationsService.addNote(
      id,
      user.sub,
      body.content,
      body.isInternal,
    );
  }
}
