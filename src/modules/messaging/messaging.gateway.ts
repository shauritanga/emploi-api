import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_PRESENCE } from 'src/redis/redis.module';
import { MessagingService } from './messaging.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws/messaging',
  transports: ['websocket', 'polling'],
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private messagingService: MessagingService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject(REDIS_PRESENCE) private presence: Redis,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Join personal room
      client.join(`user:${payload.sub}`);

      // Track presence
      await this.presence.set(payload.sub, 'online', 'EX', 300);

      // Rejoin all accepted conversations
      const conversations = await this.messagingService.getUserConversations(
        payload.sub,
      );
      conversations.forEach((c) => client.join(`conversation:${c.id}`));

      this.logger.log(`Client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      await this.presence.del(client.data.userId);
      this.logger.log(`Client disconnected: ${client.data.userId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string },
  ) {
    try {
      const message = await this.messagingService.sendMessage(
        client.data.userId,
        payload.conversationId,
        payload.content,
      );

      this.server
        .to(`conversation:${payload.conversationId}`)
        .emit('new_message', message);
      return { success: true, message };
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conversation:${payload.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      isTyping: payload.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await this.messagingService.markConversationRead(
      client.data.userId,
      payload.conversationId,
    );
    client.to(`conversation:${payload.conversationId}`).emit('messages_read', {
      userId: client.data.userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() client: Socket) {
    if (client.data?.userId) {
      await this.presence.set(client.data.userId, 'online', 'EX', 300);
    }
    return { event: 'pong' };
  }

  // Called by notification service to push real-time notification to a user
  async pushToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
