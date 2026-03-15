import {
  Controller,
  Get,
  Patch,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  NotificationPreferencesDto,
  NotificationQueryDto,
} from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications with optional filters' })
  async getNotifications(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query() query?: NotificationQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.sub, query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get notification count (total and unread)' })
  async getNotificationCount(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.getNotificationCount(user.sub);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single notification' })
  async getNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.getNotification(id, user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.deleteNotification(id, user.sub);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  async deleteAllNotifications(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.notificationsService.deleteAllNotifications(user.sub);
  }
}
