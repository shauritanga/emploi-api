import {
  Controller,
  Get,
  Post,
  Patch,
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
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
  NegotiateOfferDto,
} from './dto/offer.dto';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Post(':applicationId')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Create an offer for an application' })
  async create(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(applicationId, user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get all offers received by the seeker' })
  async getSeekerOffers(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    // Get seeker profile for current user
    const seeker = await this.offersService.getSeekerOffers(user.sub);
    return seeker;
  }

  @Get('employer/:jobId')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get all offers for a specific job' })
  async getEmployerOffers(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.offersService.getEmployerOffers(jobId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer details' })
  async getOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.offersService.getOffer(id, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Update an offer' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.updateOffer(id, user.sub, dto);
  }

  @Patch(':id/accept')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Accept an offer' })
  async acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.offersService.acceptOffer(id, user.sub);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Reject an offer' })
  async rejectOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.offersService.rejectOffer(id, user.sub);
  }

  @Patch(':id/negotiate')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Send negotiation note for an offer' })
  async negotiateOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: NegotiateOfferDto,
  ) {
    return this.offersService.negotiateOffer(id, user.sub, dto);
  }
}
