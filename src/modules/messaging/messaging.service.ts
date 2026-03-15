import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConversationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.services';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  // Employer initiates conversation with seeker (talent pool)
  async initiateEmployerConversation(
    employerUserId: string,
    seekerUserId: string,
    jobId?: string,
  ) {
    const [employer, seekerUser] = await Promise.all([
      this.prisma.employerProfile.findUnique({
        where: { userId: employerUserId },
      }),
      this.prisma.user.findUnique({
        where: { id: seekerUserId },
        include: { seekerProfile: true },
      }),
    ]);

    if (!employer) throw new NotFoundException('Employer not found');
    if (!seekerUser?.seekerProfile)
      throw new NotFoundException('Seeker not found');

    // Check if conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.SEEKER_EMPLOYER,
        jobId: jobId ?? null,
        initiatedById: employerUserId,
        participants: {
          some: { userId: seekerUserId },
        },
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.SEEKER_EMPLOYER,
        jobId,
        initiatedById: employerUserId,
        isAccepted: false,
        participants: {
          create: [
            { userId: employerUserId },
            { userId: seekerUserId, seekerId: seekerUser.seekerProfile.id },
          ],
        },
      },
      include: { participants: true },
    });
  }

  // Seeker accepts or declines employer message request
  async respondToRequest(
    conversationId: string,
    seekerUserId: string,
    accept: boolean,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) throw new NotFoundException();
    const isParticipant = conversation.participants.some(
      (p) => p.userId === seekerUserId,
    );
    if (!isParticipant) throw new ForbiddenException();

    if (!accept) {
      await this.prisma.conversation.delete({ where: { id: conversationId } });
      return { message: 'Request declined' };
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isAccepted: true },
    });
  }

  // Seeker-to-seeker conversation
  async createSeekerConversation(seekerUserId: string, targetUserId: string) {
    const [seeker1, seeker2] = await Promise.all([
      this.prisma.seekerProfile.findUnique({ where: { userId: seekerUserId } }),
      this.prisma.seekerProfile.findUnique({ where: { userId: targetUserId } }),
    ]);

    if (!seeker1 || !seeker2)
      throw new NotFoundException('One or both users not found');
    if (seekerUserId === targetUserId)
      throw new BadRequestException('Cannot message yourself');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.SEEKER_SEEKER,
        AND: [
          { participants: { some: { userId: seekerUserId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.SEEKER_SEEKER,
        initiatedById: seekerUserId,
        isAccepted: true,
        participants: {
          create: [
            { userId: seekerUserId, seekerId: seeker1.id },
            { userId: targetUserId, seekerId: seeker2.id },
          ],
        },
      },
    });
  }

  async sendMessage(senderId: string, conversationId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!conversation.isAccepted)
      throw new ForbiddenException('Conversation not yet accepted');

    const isParticipant = conversation.participants.some(
      (p) => p.userId === senderId,
    );
    if (!isParticipant)
      throw new ForbiddenException('Not a participant in this conversation');

    // Enforce: seeker cannot send first message to employer
    if (
      conversation.type === ConversationType.SEEKER_EMPLOYER &&
      conversation.initiatedById !== senderId
    ) {
      const messageCount = await this.prisma.message.count({
        where: { conversationId },
      });
      if (messageCount === 0)
        throw new ForbiddenException('Employer must send the first message');
    }

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
        isAccepted: true,
      },
      include: {
        participants: {
          include: {
            seeker: { select: { fullName: true, profilePhotoUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) throw new NotFoundException();
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException();

    return this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            seeker: { select: { fullName: true, profilePhotoUrl: true } },
          },
        },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException();

    return conversation;
  }

  async archiveConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException();

    await this.prisma.conversation.delete({ where: { id: conversationId } });
    return { id: conversationId, archived: true };
  }

  async markConversationRead(userId: string, conversationId: string) {
    return this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async getPendingRequests(seekerUserId: string) {
    return this.prisma.conversation.findMany({
      where: {
        type: ConversationType.SEEKER_EMPLOYER,
        isAccepted: false,
        participants: { some: { userId: seekerUserId } },
      },
      include: {
        participants: {
          include: {
            seeker: { select: { fullName: true, profilePhotoUrl: true } },
          },
        },
      },
    });
  }
}
