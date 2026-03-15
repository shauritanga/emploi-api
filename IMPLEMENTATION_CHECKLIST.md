# NestJS Job Platform API - Quick Reference Guide

## Module Status Matrix

```
MODULE              CONTROLLER  SERVICE  DTOS    STATUS      PRIORITY
────────────────────────────────────────────────────────────────────
Auth                ✅          ✅       ✅      Ready       N/A
Users               ✅          ✅       ⚠️      Ready       N/A
Jobs                ✅          ✅       ✅      Ready       N/A
Applications        ✅          ✅       ⚠️      Ready       N/A
Seeker-Profile      ✅          ✅       ✅      Ready       N/A
────────────────────────────────────────────────────────────────────
Interviews          ❌          ✅       ⚠️      2/3         HIGH
CV                  ❌          ✅       ⚠️      2/3         MEDIUM
Employer-Profile    ❌          ✅       ⚠️      2/3         MEDIUM
Messaging           ⚠️*         ✅       ⚠️      PARTIAL     MEDIUM
Community           ❌          ✅       ⚠️      1/3         MEDIUM
Notifications       ❌          ❌       ❌      0/3         HIGH
Ratings             ❌          ✅       ⚠️      1/3         MEDIUM
Offers              ❌          ❌       ❌      0/3         HIGH
Search              ❌          ❌       ❌      0/3         LOW
────────────────────────────────────────────────────────────────────
✅ = Complete  |  ⚠️ = Partial/Inline  |  ❌ = Missing
*Messaging has WebSocket Gateway instead of REST controller
```

---

## Implementation Checklist

### ✅ COMPLETE - Ready for API Testing

- [x] **Auth Module** (8 endpoints)
  - Register, Login, Refresh, Logout, Email Verify, Password Reset, Change Password

- [x] **Users Module** (5 endpoints)
  - Get Me, Deactivate, Register Device, Remove Device, List Devices

- [x] **Jobs Module** (11 endpoints)
  - Browse, Feed, Saved, Create, Update, Publish, Close, etc.

- [x] **Applications Module** (7 endpoints)
  - Apply, Get Pipeline, Update Status, Withdraw, Add Notes, Mark Opened

- [x] **Seeker Profile Module** (15+ endpoints)
  - Profile CRUD, Experience CRUD, Education CRUD, Skills CRUD, Certs CRUD

---

### 🚨 HIGH PRIORITY - Missing/Broken Features

#### 1. ❌ OFFERS Module (EMPTY)

**Impact**: Core business feature - employers can't make offers
**What's Missing**:

- [ ] `offers.controller.ts` - All REST endpoints
- [ ] `offers.service.ts` - All business logic
- [ ] `offers.module.ts` - Module configuration
- [ ] `dto/offer.dto.ts` - DTOs

**Endpoints to Implement**:

```
POST   /offers
GET    /offers/me
GET    /offers/employer/:jobId
PATCH  /offers/:id/accept
PATCH  /offers/:id/reject
PATCH  /offers/:id/negotiate
GET    /offers/:id
```

**Estimated Effort**: 6-8 hours

---

#### 2. ❌ NOTIFICATIONS Module (INCOMPLETE)

**Impact**: No notification management - users can't see/manage notifications
**What's Missing**:

- [ ] `notifications.service.ts` - Complete CRUD
- [ ] `notifications.controller.ts` - All REST endpoints
- [ ] Notification preferences/settings
- [ ] Queue to service integration

**Endpoints to Implement**:

```
GET    /notifications
GET    /notifications?read=false
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
DELETE /notifications/:id
DELETE /notifications
GET    /notifications/preferences
PATCH  /notifications/preferences
```

**Estimated Effort**: 6-8 hours

---

#### 3. ⚠️ INTERVIEWS Module (No Controller)

**Impact**: Can't schedule/manage interviews via REST (service logic exists)
**What's Missing**:

- [ ] `interviews.controller.ts` - HTTP endpoints
- [ ] `interviews.module.ts` - Controller export
- [ ] DTOs extraction from service

**Endpoints to Implement**:

```
POST   /interviews
GET    /interviews/:id
PATCH  /interviews/:id
DELETE /interviews/:id
POST   /interviews/:id/confirm
POST   /interviews/:id/cancel
POST   /interviews/:id/reschedule
GET    /interviews/application/:appId
PATCH  /interviews/:id/feedback
```

**Estimated Effort**: 2-3 hours
**Note**: Service already has all methods - just needs exposure

---

### ⚠️ MEDIUM PRIORITY - Partial Implementation

#### 4. ⚠️ MESSAGING Module (WebSocket Only - Missing REST)

**Status**: WebSocket gateway ✅ | REST API ❌
**What's Missing**:

- [ ] REST endpoints for conversation management (+ WebSocket exists)
- [ ] Conversation listing/creation via HTTP
- [ ] Message history pagination via HTTP

**REST Endpoints to Add**:

```
GET    /messaging/conversations
POST   /messaging/conversations
GET    /messaging/conversations/:id
GET    /messaging/conversations/:id/messages
PATCH  /messaging/conversations/:id/accept
DELETE /messaging/conversations/:id
```

**Estimated Effort**: 3-4 hours
**Note**: Real-time messaging already works via WebSocket

---

#### 5. ❌ CV Module (No Controller)

**Status**: Service ✅ | Controller ❌
**What's Missing**:

- [ ] `cv.controller.ts` - HTTP endpoints
- [ ] DTOs extraction

**Endpoints to Implement**:

```
POST   /cv
GET    /cv
GET    /cv/:id
PATCH  /cv/:id
DELETE /cv/:id
POST   /cv/:id/set-default
GET    /cv/templates
GET    /cv/:id/download (PDF)
```

**Estimated Effort**: 3-4 hours

---

#### 6. ❌ EMPLOYER-PROFILE Module (No Controller)

**Status**: Service ✅ | Controller ❌
**What's Missing**:

- [ ] `employer-profile.controller.ts` - HTTP endpoints
- [ ] DTOs extraction

**Endpoints to Implement**:

```
GET    /employer-profile/me
GET    /employer-profile/:id
PATCH  /employer-profile/me
POST   /employer-profile/verify
GET    /employer-profile/analytics
GET    /employer-profile/team
POST   /employer-profile/team/invite
PATCH  /employer-profile/team/:id
DELETE /employer-profile/team/:id
```

**Estimated Effort**: 4-5 hours

---

#### 7. ❌ COMMUNITY Module (No Controller)

**Status**: Service ✅ | Controller ❌
**What's Missing**:

- [ ] `community.controller.ts` - HTTP endpoints
- [ ] DTOs extraction

**Endpoints to Implement**:

```
GET    /community/rooms
GET    /community/rooms/:id
POST   /community/rooms/:id/join
POST   /community/rooms/:id/leave
GET    /community/rooms/:id/posts
POST   /community/rooms/:id/posts
PATCH  /community/posts/:id
DELETE /community/posts/:id
POST   /community/posts/:id/replies
PATCH  /community/replies/:id
DELETE /community/replies/:id
POST   /community/posts/:id/like
DELETE /community/posts/:id/like
```

**Estimated Effort**: 4-5 hours

---

#### 8. ❌ RATINGS Module (No Controller)

**Status**: Service ✅ | Controller ❌
**What's Missing**:

- [ ] `ratings.controller.ts` - HTTP endpoints
- [ ] DTOs extraction

**Endpoints to Implement**:

```
POST   /ratings/employer/:applicationId
POST   /ratings/seeker/:applicationId
GET    /ratings/employer/:profileId
GET    /ratings/seeker/:profileId
PATCH  /ratings/:id
DELETE /ratings/:id
POST   /ratings/:id/dispute
GET    /ratings/:id/dispute
```

**Estimated Effort**: 3-4 hours

---

### 🔍 LOW PRIORITY - Search Enhancement

#### 9. ❌ SEARCH Module (EMPTY - OPTIONAL)

**Status**: No implementation
**Impact**: Current filtering in /jobs endpoint handles most needs; dedicated search module would enhance UX
**What's Missing**: Everything

**Endpoints to Consider**:

```
GET    /search/jobs (advanced filters)
GET    /search/seekers (employer-only)
GET    /search/saved
POST   /search/saved
DELETE /search/saved/:id
```

**Estimated Effort**: 6-8 hours
**Priority**: Can be done later - existing /jobs endpoint provides filtering

---

## DTO Organization Issues

### Current State

Some DTOs are inline in services/controllers instead of in `dto/` folders:

**Problematic Modules**:

- ❌ `applications` - DTOs inline in service
- ⚠️ `interviews` - DTOs inline in service
- ⚠️ `cv` - DTOs inline in service
- ⚠️ `messaging` - DTOs inline in gateway/service
- ⚠️ `community` - DTOs inline in service
- ⚠️ `ratings` - DTOs inline in service
- ⚠️ `employer-profile` - DTOs inline in service

### Recommended Fix

Create consistent DTO folder structure:

```
src/modules/MODULE/
  ├── dto/
  │   ├── create-entity.dto.ts
  │   ├── update-entity.dto.ts
  │   ├── query-entity.dto.ts
  │   └── index.ts
  ├── MODULE.controller.ts
  ├── MODULE.service.ts
  └── MODULE.module.ts
```

---

## Implementation Priority Timeline

### Week 1 (Must Have)

1. **Offers Module** (6-8h) - Core business feature
2. **Notifications Service & Controller** (6-8h) - User-facing feature
3. **Interviews Controller** (2-3h) - Quick win

**Total**: ~16-19 hours

### Week 2-3 (Should Have)

4. **CV Controller** (3-4h)
5. **Employer-Profile Controller** (4-5h)
6. **Community Controller** (4-5h)
7. **Ratings Controller** (3-4h)
8. **Messaging REST API** (4-5h)

**Total**: ~23-27 hours

### Week 4+ (Nice to Have)

9. **Search Module** (6-8h) - Enhancement
10. **DTO Refactoring** (8-10h) - Code quality

---

## Completed Features - Available for Use

### User Authentication & Account

- ✅ Email/password registration
- ✅ Login with JWT
- ✅ Email verification
- ✅ Password reset
- ✅ OAuth integration (Google, LinkedIn)
- ✅ Device push token management
- ✅ Account deactivation

### Seeker Features

- ✅ Complete profile management
- ✅ Experience history
- ✅ Education records
- ✅ Skills with proficiency levels
- ✅ Certifications
- ✅ Job applications
- ✅ Application status tracking
- ✅ Saved jobs
- ✅ Job alerts
- ✅ CV creation and management
- ✅ Public profile view

### Employer Features

- ✅ Employer profile (needs controller!)
- ✅ Job creation and management
- ✅ Screening questions
- ✅ Application pipeline
- ✅ Application notes
- ✅ Interview scheduling (needs controller!)
- ✅ Team member management

### Job Features

- ✅ Job search and filtering
- ✅ Personalized job feed
- ✅ Job status tracking
- ✅ Streamlined hiring option
- ✅ Application deadline management

### Application Features

- ✅ Job application submission
- ✅ Application status workflow
- ✅ Screening answer submission
- ✅ Internal notes system
- ✅ Interview scheduling integration
- ✅ Offer creation (needs controller!)

### Communication

- ✅ Real-time messaging (WebSocket)
- ❌ Conversation REST management (needs REST API)
- ✅ Typing indicators
- ✅ Message read status

### Community

- ✅ Community rooms
- ✅ Forum posts
- ✅ Post replies
- ❌ All REST endpoints (needs controller!)

### Other Features

- ✅ Employer ratings
- ✅ Seeker ratings
- ✅ Notifications (queue-based, needs REST API)
- ✅ Redis caching
- ✅ Bull queues for async jobs

---

## Database Relationships Map

```
USER (root)
├── SeekerProfile
│   ├── SeekerExperience
│   ├── SeekerEducation
│   ├── SeekerSkill
│   ├── SeekerCertification
│   ├── Cv (CV Documents)
│   ├── Application (Job Applications)
│   │   ├── ApplicationScreeningAnswer
│   │   ├── ApplicationStatusHistory
│   │   ├── ApplicationNote
│   │   ├── Interview
│   │   └── Offer
│   ├── JobAlert
│   └── SavedJob
├── EmployerProfile
│   ├── Job
│   │   ├── JobScreeningQuestion
│   │   └── Application
│   └── EmployerTeamMember
├── Conversation
│   ├── ConversationParticipant
│   └── Message
├── Notification
├── Rating
├── OauthAccount
└── UserDevice

CommunityRoom
├── CommunityMembership
├── CommunityPost
│   └── CommunityReply

CvTemplate
└── Cv

Rating
├── relates to Application
├── relates to SeekerProfile
└── relates to EmployerProfile
```

---

## Testing Commands (Once Controllers Are Added)

```bash
# Auth
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","role":"SEEKER"}'

# Jobs
curl http://localhost:3000/jobs

# [After implementing] Interviews
curl http://localhost:3000/interviews

# [After implementing] Offers
curl http://localhost:3000/offers/me

# [After implementing] Notifications
curl http://localhost:3000/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Key Metrics

| Metric                        | Value                 |
| ----------------------------- | --------------------- |
| Total Endpoints Implemented   | ~45                   |
| Total Endpoints Possible      | ~85                   |
| Implementation Completion     | ~53%                  |
| Modules Completely Ready      | 3/14 (21%)            |
| Modules Ready with Controller | 6/14 (43%)            |
| Most Critical Missing         | Offers, Notifications |
| Estimated Time to Complete    | 40-50 hours           |

---

**Last Updated**: March 14, 2026
