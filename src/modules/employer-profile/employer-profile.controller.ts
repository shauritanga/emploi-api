import {
  Controller,
  Get,
  Post,
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
import { EmployerProfileService } from './employer-profile.services';
import {
  InviteTeamMemberDto,
  UpdateEmployerProfileDto,
  UpdateTeamMemberRoleDto,
  VerifyEmployerDto,
} from './dto/employer-profile.dto';

@ApiTags('Employer Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employer-profile')
export class EmployerProfileController {
  constructor(private employerProfileService: EmployerProfileService) {}

  @Get('me')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get your employer profile' })
  async getMyProfile(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.employerProfileService.getProfile(user.sub);
  }

  @Get('analytics')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get hiring analytics for employer' })
  async getAnalytics(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.employerProfileService.getHiringAnalytics(user.sub);
  }

  @Post('verify')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Submit employer verification request' })
  async verifyProfile(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: VerifyEmployerDto,
  ) {
    return this.employerProfileService.verifyProfile(
      user.sub,
      dto.verificationDocumentUrl,
    );
  }

  @Get('team')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get employer team members' })
  async getTeam(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.employerProfileService.getTeamMembers(user.sub);
  }

  @Post('team/invite')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Invite or add a team member' })
  async inviteTeamMember(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.employerProfileService.inviteTeamMember(
      user.sub,
      dto.email,
      dto.role,
    );
  }

  @Patch('team/:id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Update a team member role' })
  async updateTeamMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return this.employerProfileService.updateTeamMemberRole(
      user.sub,
      id,
      dto.role,
    );
  }

  @Delete('team/:id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Remove a team member' })
  async removeTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.employerProfileService.removeTeamMember(user.sub, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public employer profile' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.employerProfileService.getPublicProfile(id);
  }

  @Patch('me')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Update your employer profile' })
  async updateProfile(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateEmployerProfileDto,
  ) {
    return this.employerProfileService.update(user.sub, dto);
  }
}
