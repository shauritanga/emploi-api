import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.usersService.getMe(user.sub);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate account' })
  deactivate(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.usersService.deactivate(user.sub);
  }

  @Post('me/device')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  registerDevice(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body: { fcmToken: string; platform: string },
  ) {
    return this.usersService.registerDevice(
      user.sub,
      body.fcmToken,
      body.platform,
    );
  }

  @Delete('me/device/:token')
  @HttpCode(HttpStatus.OK)
  removeDevice(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Param('token') token: string,
  ) {
    return this.usersService.removeDevice(user.sub, token);
  }

  @Get('me/devices')
  getDevices(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.usersService.getUserDevices(user.sub);
  }
}
