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
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';
import {
  CreatePostDto,
  CreateReplyDto,
  UpdatePostDto,
  UpdateReplyDto,
} from './dto/community.dto';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get all community rooms' })
  async getRooms() {
    return this.communityService.getRooms();
  }

  @Post('rooms/:roomId/join')
  @ApiOperation({ summary: 'Join a community room' })
  async joinRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.joinRoom(user.sub, roomId);
  }

  @Post('rooms/:roomId/leave')
  @ApiOperation({ summary: 'Leave a community room' })
  async leaveRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.leaveRoom(user.sub, roomId);
  }

  @Get('rooms/:roomId/posts')
  @ApiOperation({ summary: 'Get posts in a community room' })
  async getRoomPosts(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query('page') page: number = 1,
  ) {
    return this.communityService.getRoomPosts(roomId, user.sub, page);
  }

  @Post('rooms/:roomId/posts')
  @ApiOperation({ summary: 'Create a post in a community room' })
  async createPost(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(
      user.sub,
      roomId,
      dto.content,
      dto.isAnonymous,
    );
  }

  @Patch('posts/:postId')
  @ApiOperation({ summary: 'Update a community post' })
  async updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(
      user.sub,
      postId,
      dto.content ?? '',
    );
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete a community post' })
  async deletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.deletePost(user.sub, postId);
  }

  @Post('posts/:postId/replies')
  @ApiOperation({ summary: 'Create a reply to a post' })
  async createReply(
    @Param('postId', ParseUUIDPipe) postId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateReplyDto,
  ) {
    return this.communityService.replyToPost(user.sub, postId, dto.content);
  }

  @Patch('replies/:replyId')
  @ApiOperation({ summary: 'Update a reply' })
  async updateReply(
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateReplyDto,
  ) {
    return this.communityService.updateReply(
      user.sub,
      replyId,
      dto.content ?? '',
    );
  }

  @Delete('replies/:replyId')
  @ApiOperation({ summary: 'Delete a reply' })
  async deleteReply(
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.deleteReply(user.sub, replyId);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Like/unlike a post' })
  async toggleLike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.likePost(user.sub, postId);
  }

  @Delete('posts/:postId/like')
  @ApiOperation({ summary: 'Remove like from a post' })
  async removeLike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.communityService.unlikePost(user.sub, postId);
  }
}
