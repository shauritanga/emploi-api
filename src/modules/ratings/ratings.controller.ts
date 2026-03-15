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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { RatingsService } from './ratings.service';
import {
  CreateRatingDto,
  UpdateRatingDto,
  DisputeRatingDto,
} from './dto/rating.dto';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post('employer/:applicationId')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Rate an employer' })
  async rateEmployer(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.rateEmployer(user.sub, applicationId, dto);
  }

  @Post('seeker/:applicationId')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Rate a seeker' })
  async rateSeeker(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.rateSeeker(user.sub, applicationId, dto);
  }

  @Get('employer/:profileId')
  @ApiOperation({ summary: 'Get ratings for an employer' })
  async getEmployerRatings(
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.ratingsService.getEmployerRatings(profileId);
  }

  @Get('seeker/:profileId')
  @ApiOperation({ summary: 'Get ratings for a seeker' })
  async getSeekerRatings(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.ratingsService.getSeekerRatings(profileId, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rating' })
  async updateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.ratingsService.updateRating(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rating' })
  async deleteRating(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.ratingsService.deleteRating(id, user.sub);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'Dispute a rating' })
  async disputeRating(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: DisputeRatingDto,
  ) {
    return this.ratingsService.disputeRating(id, user.sub, dto.disputeNote);
  }

  @Get(':id/dispute')
  @ApiOperation({ summary: 'Get dispute details for a rating' })
  async getDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.ratingsService.getDispute(id, user.sub);
  }
}
