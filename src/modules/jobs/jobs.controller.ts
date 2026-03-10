import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateJobDto, UpdateJobDto, JobQueryDto } from './dto/job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { Public } from '../auth/auth.controller';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse all active jobs' })
  findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  @Get('feed')
  @ApiBearerAuth()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get personalized job feed for seeker' })
  getFeed(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query('page') page: number = 1,
  ) {
    return this.jobsService.getPersonalizedFeed(user.sub, page);
  }

  @Get('saved')
  @ApiBearerAuth()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  getSavedJobs(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.jobsService.getSavedJobs(user.sub);
  }

  @Get('employer/mine')
  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  getMyJobs(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.jobsService.getEmployerJobs(user.sub);
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.jobsService.findOne(id, user?.sub);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  create(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, user.sub, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.jobsService.publish(id, user.sub);
  }

  @Post(':id/save')
  @ApiBearerAuth()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  saveJob(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body('listName') listName: string = 'Saved',
  ) {
    return this.jobsService.saveJob(user.sub, id, listName);
  }
}
