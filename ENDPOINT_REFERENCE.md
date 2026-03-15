# Complete Endpoint Reference & Code Templates

## Endpoint Status Overview

### ✅ FULLY IMPLEMENTED (45 endpoints)

#### Authentication (8)

```
POST   /auth/register               → Register new user
POST   /auth/login                  → Login with credentials
POST   /auth/refresh                → Refresh JWT token
POST   /auth/logout                 → Logout and blacklist token
POST   /auth/forgot-password        → Request password reset
POST   /auth/reset-password         → Reset password with token
GET    /auth/verify-email           → Verify email address
POST   /auth/change-password        → Change existing password
```

#### Users (5)

```
GET    /users/me                    → Get current user profile
DELETE /users/me                    → Deactivate account
POST   /users/me/device             → Register FCM device token
GET    /users/me/devices            → List registered devices
DELETE /users/me/device/:token      → Remove device token
```

#### Jobs (11)

```
GET    /jobs                        → List active jobs with filters
GET    /jobs/feed                   → Personalized job feed (seeker)
GET    /jobs/saved                  → Get saved/bookmarked jobs
GET    /jobs/employer/mine          → Get employer's posted jobs
GET    /jobs/:id                    → Get job details
POST   /jobs                        → Create new job (employer)
PATCH  /jobs/:id                    → Update job (employer)
POST   /jobs/:id/publish            → Publish job (employer)
POST   /jobs/:id/close              → Close job (employer)
POST   /jobs/:id/save               → Save job (seeker)
DELETE /jobs/:id/save               → Unsave job (seeker)
```

#### Applications (7)

```
POST   /applications/jobs/:jobId    → Submit application
GET    /applications/mine           → Get seeker's applications
GET    /applications/pipeline/:jobId → Get employer's pipeline
PATCH  /applications/:id/status     → Update application status
PATCH  /applications/:id/withdraw   → Withdraw application (seeker)
POST   /applications/:id/open       → Mark opened (employer)
POST   /applications/:id/notes      → Add internal notes
```

#### Seeker Profile (15+)

```
GET    /seeker-profile/me           → Get own profile
GET    /seeker-profile/public/:id   → Get public profile
PATCH  /seeker-profile/me           → Update profile info
POST   /seeker-profile/me/experience → Add work experience
PATCH  /seeker-profile/me/experience/:id → Update experience
DELETE /seeker-profile/me/experience/:id → Delete experience
POST   /seeker-profile/me/education → Add education
PATCH  /seeker-profile/me/education/:id → Update education
DELETE /seeker-profile/me/education/:id → Delete education
POST   /seeker-profile/me/skill     → Add skill
PATCH  /seeker-profile/me/skill/:id → Update skill
DELETE /seeker-profile/me/skill/:id → Delete skill
POST   /seeker-profile/me/certification → Add certification
PATCH  /seeker-profile/me/certification/:id → Update certification
DELETE /seeker-profile/me/certification/:id → Delete certification
```

#### Messaging - WebSocket (5)

```
WS     /ws/messaging
├── Connect with JWT
├── @SubscribeMessage('message') → Send message
├── @SubscribeMessage('typing')  → Typing indicator
├── @SubscribeMessage('read')    → Mark as read
└── Auto-join: user:userId, conversation:convId
```

---

### ⚠️ PARTIALLY IMPLEMENTED (3 modules - service exists, no controller)

#### Interviews (Service Only - 0/8 endpoints exposed)

```
❌ POST   /interviews
❌ GET    /interviews/:id
❌ GET    /interviews/application/:appId
❌ PATCH  /interviews/:id
❌ POST   /interviews/:id/confirm
❌ POST   /interviews/:id/cancel
❌ PATCH  /interviews/:id/reschedule
❌ PATCH  /interviews/:id/feedback
```

**Service Methods Available**: schedule(), confirm(), cancel(), reschedule(), updateFeedback()

#### CV (Service Only - 0/8 endpoints exposed)

```
❌ POST   /cv
❌ GET    /cv
❌ GET    /cv/:id
❌ PATCH  /cv/:id
❌ DELETE /cv/:id
❌ POST   /cv/:id/set-default
❌ GET    /cv/templates
❌ GET    /cv/:id/download
```

**Service Methods Available**: create(), getSeeekerCvs(), computeJobMatchScore()

#### Employer Profile (Service Only - 0/8 endpoints exposed)

```
❌ GET    /employer-profile/me
❌ GET    /employer-profile/:id
❌ PATCH  /employer-profile/me
❌ POST   /employer-profile/verify
❌ GET    /employer-profile/analytics
❌ GET    /employer-profile/team
❌ POST   /employer-profile/team/invite
❌ DELETE /employer-profile/team/:id
```

**Service Methods Available**: getProfile(), getPublicProfile(), update(), getHiringAnalytics()

---

### ❌ NOT IMPLEMENTED (6 modules - completely missing)

#### Community (0/12)

```
❌ GET    /community/rooms
❌ GET    /community/rooms/:id
❌ POST   /community/rooms/:id/join
❌ POST   /community/rooms/:id/leave
❌ GET    /community/rooms/:id/posts
❌ POST   /community/rooms/:id/posts
❌ PATCH  /community/posts/:id
❌ DELETE /community/posts/:id
❌ POST   /community/posts/:id/replies
❌ PATCH  /community/replies/:id
❌ DELETE /community/replies/:id
❌ POST   /community/posts/:id/like
```

#### Ratings (0/7)

```
❌ POST   /ratings/employer/:applicationId
❌ POST   /ratings/seeker/:applicationId
❌ GET    /ratings/employer/:profileId
❌ GET    /ratings/seeker/:profileId
❌ PATCH  /ratings/:id
❌ DELETE /ratings/:id
❌ POST   /ratings/:id/dispute
```

#### Offers (0/7)

```
❌ POST   /offers
❌ GET    /offers/me
❌ GET    /offers/employer/:jobId
❌ PATCH  /offers/:id/accept
❌ PATCH  /offers/:id/reject
❌ PATCH  /offers/:id/negotiate
❌ GET    /offers/:id
```

#### Notifications (0/7)

```
❌ GET    /notifications
❌ GET    /notifications?read=false
❌ PATCH  /notifications/:id/read
❌ PATCH  /notifications/read-all
❌ DELETE /notifications/:id
❌ DELETE /notifications
❌ GET    /notifications/preferences
```

#### Messaging REST (0/6 REST)

```
✅ WebSocket: /ws/messaging (5 endpoints)
❌ REST API:
├── GET    /messaging/conversations
├── POST   /messaging/conversations
├── GET    /messaging/conversations/:id
├── GET    /messaging/conversations/:id/messages
├── PATCH  /messaging/conversations/:id/accept
└── DELETE /messaging/conversations/:id
```

#### Search (0/3)

```
❌ GET    /search/jobs
❌ GET    /search/seekers
❌ GET    /search/saved
```

---

## Complete Controller Templates

### Template 1: Simple CRUD Controller (Copy & Use)

```typescript
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { EntityService } from './entity.service';
import { CreateEntityDto, UpdateEntityDto, EntityQueryDto } from './dto';

@ApiTags('Entity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entity')
export class EntityController {
  constructor(private entityService: EntityService) {}

  @Get()
  @ApiOperation({ summary: 'List all entities' })
  findAll(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Query() query?: EntityQueryDto,
  ) {
    return this.entityService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.entityService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create new entity' })
  create(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateEntityDto,
  ) {
    return this.entityService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update entity' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entityService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete entity' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.entityService.remove(id, user.sub);
  }
}
```

### Template 2: Role-Based CRUD Controller

```typescript
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { EntityService } from './entity.service';
import { CreateEntityDto, UpdateEntityDto } from './dto';

@ApiTags('Entity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entity')
export class EntityController {
  constructor(private entityService: EntityService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all entities (admin only)' })
  findAll() {
    return this.entityService.findAll();
  }

  @Get('me')
  @Roles(UserRole.SEEKER, UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Get own entity' })
  getOwn(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.entityService.findByUserId(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.entityService.findOne(id);
  }

  @Post()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Create entity (employer only)' })
  create(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateEntityDto,
  ) {
    return this.entityService.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Update entity (owner only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entityService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete entity (owner only)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.entityService.remove(id, user.sub);
  }
}
```

---

## Quick Implementation Guide: Add Interviews Controller

### Step 1: Create the Controller File

**File**: `src/modules/interviews/interviews.controller.ts`

```typescript
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import * as currentUserDecorator from '../../common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums';
import { InterviewsService, CreateInterviewDto } from './interviews.service';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Schedule interview' })
  schedule(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviewsService.schedule(
      dto.applicationId || '',
      user.sub,
      dto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.findOne?.(id);
  }

  @Patch(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Reschedule interview' })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() dto: Partial<CreateInterviewDto>,
  ) {
    return this.interviewsService.reschedule?.(id, user.sub, dto);
  }

  @Post(':id/confirm')
  @Roles(UserRole.SEEKER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm interview attendance' })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.confirm(id, user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel interview' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body?: { reason?: string },
  ) {
    return this.interviewsService.cancel?.(id, user.sub, body?.reason);
  }

  @Patch(':id/feedback')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @ApiOperation({ summary: 'Add post-interview feedback' })
  updateFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
    @Body() body: { feedback: string; rating?: number },
  ) {
    return this.interviewsService.updateFeedback?.(id, user.sub, body.feedback);
  }

  @Delete(':id')
  @Roles(UserRole.EMPLOYER, UserRole.BOTH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete interview' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.JwtPayload,
  ) {
    return this.interviewsService.remove?.(id, user.sub);
  }
}
```

### Step 2: Export Controller from Module

**File**: `src/modules/interviews/interviews.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller'; // ADD THIS
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueName } from 'src/common/enums';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATIONS }),
  ],
  controllers: [InterviewsController], // ADD THIS
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
```

### Step 3: Update Service with Missing Methods (Optional)

If the service is missing some methods like `findOne()`, `reschedule()`, add them:

```typescript
async findOne(interviewId: string) {
  return this.prisma.interview.findUnique({
    where: { id: interviewId },
    include: { application: { include: { job: true, seeker: true } } },
  });
}

async reschedule(interviewId: string, employerUserId: string, dto: Partial<CreateInterviewDto>) {
  // Verify ownership
  // Update interview
}
```

---

## DTOs Organization Reference

### Current Pattern in Project

```typescript
// DTOs are usually class-validator decorated classes

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsEnum(JobType)
  jobType: JobType;

  @IsNumber()
  @Min(0)
  salaryMin: number;

  @IsNumber()
  @Min(0)
  salaryMax: number;

  @IsOptional()
  @IsString()
  requirements?: string;
}
```

### Standard Folder Structure

```
src/modules/MODULE_NAME/
├── dto/
│   ├── create-MODULE.dto.ts
│   ├── update-MODULE.dto.ts
│   ├── query-MODULE.dto.ts (optional)
│   └── index.ts (barrel export)
├── MODULE_NAME.controller.ts
├── MODULE_NAME.service.ts
└── MODULE_NAME.module.ts
```

---

## Testing the Endpoints

### Example: Test Interviews Controller

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
TOKEN="your_jwt_token_here"

# Start interview
curl -X POST $BASE_URL/interviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-uuid",
    "scheduledAt": "2026-03-20T10:00:00Z",
    "durationMinutes": 60,
    "interviewType": "VIDEO",
    "meetingLink": "https://zoom.us/meeting/123456"
  }'

# Get interview details
curl -X GET $BASE_URL/interviews/interview-uuid \
  -H "Authorization: Bearer $TOKEN"

# Confirm attendance (as seeker)
curl -X POST $BASE_URL/interviews/interview-uuid/confirm \
  -H "Authorization: Bearer $TOKEN"

# Reschedule (as employer)
curl -X PATCH $BASE_URL/interviews/interview-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2026-03-21T14:00:00Z"
  }'

# Add feedback
curl -X PATCH $BASE_URL/interviews/interview-uuid/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Great technical knowledge!",
    "rating": 4
  }'
```

---

## Common Issues & Solutions

### Issue 1: Service Method Not Found

**Problem**: Controller calls service method but it doesn't exist

**Solution**: Use optional chaining with `?.` and check service file

```typescript
// Safe version
return this.service.method?.(params) ?? { error: 'Not implemented' };
```

### Issue 2: CORS Error on WebSocket

**Problem**: Messaging WebSocket client connection fails

**Solution**: Already configured in gateway:

```typescript
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws/messaging',
})
```

### Issue 3: Missing Authorization

**Problem**: 401 Unauthorized on protected endpoints

**Solution**:

1. Login first to get JWT token
2. Pass in Authorization header: `Authorization: Bearer {token}`
3. Check that endpoint doesn't have `@Public()` decorator

### Issue 4: Validation Errors

**Problem**: 400 Bad Request with validation error

**Solution**: Ensure DTOs are properly decorated with class-validator:

```typescript
@IsString()
@IsNotEmpty()
field: string;
```

---

## Summary Table: What's Ready vs. What's Missing

| Feature        | API Endpoint | WebSocket | Service | Status       |
| -------------- | ------------ | --------- | ------- | ------------ |
| Auth           | ✅           | -         | ✅      | Ready        |
| User           | ✅           | -         | ✅      | Ready        |
| Jobs           | ✅           | -         | ✅      | Ready        |
| Seeker Profile | ✅           | -         | ✅      | Ready        |
| Applications   | ✅           | -         | ✅      | Ready        |
| Interviews     | ❌           | -         | ✅      | Service only |
| CV             | ❌           | -         | ✅      | Service only |
| Emp. Profile   | ❌           | -         | ✅      | Service only |
| Messaging      | ❌           | ✅        | ✅      | Partial      |
| Community      | ❌           | -         | ✅      | Service only |
| Ratings        | ❌           | -         | ✅      | Service only |
| Notifications  | ❌           | -         | ❌      | Missing      |
| Offers         | ❌           | -         | ❌      | Missing      |
| Search         | ❌           | -         | ❌      | Missing      |

---

**Generated**: March 14, 2026  
**Last Updated**: Current Analysis  
**For Questions**: Refer to API_ANALYSIS_REPORT.md
