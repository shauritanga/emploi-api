import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../auth/auth.controller';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { SearchService } from './search.service';
import { SearchJobsQueryDto, SearchSeekersQueryDto } from './dto/search.dto';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get('jobs')
  @ApiOperation({ summary: 'Search for jobs with filters' })
  async searchJobs(@Query() query: SearchJobsQueryDto) {
    return this.searchService.searchJobs(query);
  }

  @Get('seekers')
  @ApiBearerAuth()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Search for seekers (employers only)' })
  async searchSeekers(@Query() query: SearchSeekersQueryDto) {
    return this.searchService.searchSeekers(query);
  }

  @Get('saved')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved jobs for current user' })
  async getSavedJobs(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.searchService.getSavedJobs(user.sub, page, limit);
  }

  @Post('saved')
  @ApiBearerAuth()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Save a job to saved list' })
  async saveJob(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body: { jobId: string; listName?: string },
  ) {
    return this.searchService.saveJob(user.sub, body.jobId, body.listName);
  }

  @Delete('saved/:jobId')
  @ApiBearerAuth()
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Remove job from saved list' })
  async unsaveJob(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.searchService.removeSavedJob(user.sub, jobId);
  }
}
