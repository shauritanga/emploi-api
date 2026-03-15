import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.services';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async getRooms() {
    return this.prisma.communityRoom.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        industry: true,
        iconUrl: true,
        memberCount: true,
      },
      orderBy: { memberCount: 'desc' },
    });
  }

  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.communityRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Community room not found');

    const existing = await this.prisma.communityMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (existing) return existing;

    const [membership] = await this.prisma.$transaction([
      this.prisma.communityMembership.create({
        data: { roomId, userId },
      }),
      this.prisma.communityRoom.update({
        where: { id: roomId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return membership;
  }

  async leaveRoom(userId: string, roomId: string) {
    await this.prisma.communityMembership.delete({
      where: { roomId_userId: { roomId, userId } },
    });
    await this.prisma.communityRoom.update({
      where: { id: roomId },
      data: { memberCount: { decrement: 1 } },
    });
    return { message: 'Left community room' };
  }

  async createPost(
    userId: string,
    roomId: string,
    content: string,
    isAnonymous = false,
  ) {
    const membership = await this.prisma.communityMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('You must join the room before posting');

    return this.prisma.communityPost.create({
      data: { roomId, authorId: userId, content, isAnonymous },
      include: {
        author: isAnonymous
          ? false
          : {
              select: {
                seekerProfile: {
                  select: { fullName: true, profilePhotoUrl: true },
                },
              },
            },
        _count: { select: { replies: true } },
      },
    });
  }

  async getRoomPosts(roomId: string, userId: string, page = 1) {
    const membership = await this.prisma.communityMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('Join the room to view posts');

    return this.prisma.communityPost.findMany({
      where: { roomId },
      include: {
        author: {
          select: {
            seekerProfile: {
              select: { fullName: true, profilePhotoUrl: true },
            },
          },
        },
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
    });
  }

  async replyToPost(userId: string, postId: string, content: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: { room: true },
    });
    if (!post) throw new NotFoundException();

    const membership = await this.prisma.communityMembership.findUnique({
      where: { roomId_userId: { roomId: post.roomId, userId } },
    });
    if (!membership) throw new ForbiddenException('Join the room to reply');

    return this.prisma.communityReply.create({
      data: { postId, authorId: userId, content },
      include: {
        author: {
          select: {
            seekerProfile: {
              select: { fullName: true, profilePhotoUrl: true },
            },
          },
        },
      },
    });
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException();
    if (post.authorId !== userId) throw new ForbiddenException();

    return this.prisma.communityPost.delete({ where: { id: postId } });
  }

  async updatePost(userId: string, postId: string, content: string) {
    if (!content?.trim()) {
      throw new BadRequestException('Post content is required');
    }

    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException();
    if (post.authorId !== userId) throw new ForbiddenException();

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { content },
    });
  }

  async updateReply(userId: string, replyId: string, content: string) {
    if (!content?.trim()) {
      throw new BadRequestException('Reply content is required');
    }

    const reply = await this.prisma.communityReply.findUnique({
      where: { id: replyId },
    });
    if (!reply) throw new NotFoundException();
    if (reply.authorId !== userId) throw new ForbiddenException();

    return this.prisma.communityReply.update({
      where: { id: replyId },
      data: { content },
    });
  }

  async deleteReply(userId: string, replyId: string) {
    const reply = await this.prisma.communityReply.findUnique({
      where: { id: replyId },
    });
    if (!reply) throw new NotFoundException();
    if (reply.authorId !== userId) throw new ForbiddenException();

    return this.prisma.communityReply.delete({ where: { id: replyId } });
  }

  async likePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException();

    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
      select: { id: true, likesCount: true },
    });

    return { ...updated, likedBy: userId };
  }

  async unlikePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, likesCount: true },
    });
    if (!post) throw new NotFoundException();

    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        likesCount: {
          decrement: post.likesCount > 0 ? 1 : 0,
        },
      },
      select: { id: true, likesCount: true },
    });

    return { ...updated, unlikedBy: userId };
  }
}
