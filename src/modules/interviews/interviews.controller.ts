import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './interviews.service';
import { IsString } from 'class-validator';

class CancelInterviewDto {
  @IsString()
  reason: string;
}

class InterviewFeedbackDto {
  @IsString()
  notes: string;
}

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Schedule an interview for an application' })
  async scheduleInterview(
    @Body() dto: CreateInterviewDto & { applicationId: string },
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    const { applicationId, ...createDto } = dto;
    return this.interviewsService.schedule(applicationId, user.sub, createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  async getInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.getInterviewForUser(id, user.sub);
  }

  @Get('application/:appId')
  @ApiOperation({ summary: 'Get interviews by application id' })
  async getByApplication(
    @Param('appId', ParseUUIDPipe) appId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.getByApplicationForUser(appId, user.sub);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Confirm attendance for an interview' })
  async confirmInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.confirm(id, user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an interview' })
  async cancelInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CancelInterviewDto,
  ) {
    return this.interviewsService.cancel(id, user.sub, dto.reason);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule an interview' })
  async rescheduleInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: Partial<CreateInterviewDto>,
  ) {
    return this.interviewsService.reschedule(id, user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview schedule/details' })
  async updateInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: Partial<CreateInterviewDto>,
  ) {
    return this.interviewsService.reschedule(id, user.sub, dto);
  }

  @Patch(':id/feedback')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Add or update interview feedback notes' })
  async updateFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: InterviewFeedbackDto,
  ) {
    return this.interviewsService.updateFeedback(id, user.sub, dto.notes);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Delete an interview' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.remove(id, user.sub);
  }
}
