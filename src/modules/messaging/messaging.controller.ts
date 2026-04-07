import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { MessagingService } from './messaging.service';
import {
  InitiateConversationDto,
  CreateSeekerConversationDto,
  SendMessageDto,
} from './dto/messaging.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.getUserConversations(user.sub);
  }

  @Get('requests/pending')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get pending employer message requests for seeker' })
  async getPendingRequests(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.getPendingRequests(user.sub);
  }

  @Post('conversations')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Initiate a conversation (employer to seeker)' })
  async initiateConversation(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: InitiateConversationDto,
  ) {
    return this.messagingService.initiateEmployerConversation(
      user.sub,
      dto.seekerUserId,
      dto.jobId,
    );
  }

  @Post('conversations/seeker')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Create a seeker-to-seeker conversation' })
  async createSeekerConversation(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateSeekerConversationDto,
  ) {
    return this.messagingService.createSeekerConversation(
      user.sub,
      dto.targetUserId,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.getConversation(id, user.sub);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getConversationMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const resolvedPage = Number(page) > 0 ? Number(page) : 1;
    const resolvedLimit = Number(limit) > 0 ? Number(limit) : 50;
    const messages = await this.messagingService.getMessages(
      id,
      user.sub,
      resolvedPage,
      resolvedLimit,
    );

    return {
      conversationId: id,
      page: resolvedPage,
      limit: resolvedLimit,
      data: messages,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message to a conversation (REST fallback)' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.sub, id, dto.content);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  async markConversationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.markConversationRead(user.sub, id);
  }

  @Patch('conversations/:id/accept')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Accept a conversation request' })
  async acceptConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.respondToRequest(id, user.sub, true);
  }

  @Patch('conversations/:id/decline')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @ApiOperation({ summary: 'Decline a conversation request' })
  async declineConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.respondToRequest(id, user.sub, false);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete/archive a conversation' })
  async archiveConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.messagingService.archiveConversation(id, user.sub);
  }
}
