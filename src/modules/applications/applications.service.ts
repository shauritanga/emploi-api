import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { ApplicationStatus, JobStatus } from '../../common/enums';
import { Prisma } from '@prisma/client';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { Redis } from 'ioredis';
import { QueueName } from '../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

export { CreateApplicationDto, UpdateStatusDto };

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private redis: Redis,
    @InjectQueue(QueueName.NOTIFICATIONS) private notificationQueue: bull.Queue,
    @InjectQueue(QueueName.ANTI_GHOSTING) private antiGhostingQueue: bull.Queue,
  ) {}

  async apply(seekerUserId: string, jobId: string, dto: CreateApplicationDto) {
    const [seeker, job] = await Promise.all([
      this.prisma.seekerProfile.findUnique({ where: { userId: seekerUserId } }),
      this.prisma.job.findUnique({
        where: { id: jobId },
        include: { employer: true, screeningQuestions: true },
      }),
    ]);

    if (!seeker) throw new NotFoundException('Seeker profile not found');
    if (!job || job.status !== JobStatus.ACTIVE) {
      throw new BadRequestException('Job is not accepting applications');
    }

    // Check max applicants
    if (job.maxApplicants && job.applicationsCount >= job.maxApplicants) {
      throw new BadRequestException(
        'This position has reached its application limit',
      );
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_seekerId: { jobId, seekerId: seeker.id } },
    });
    if (existing)
      throw new BadRequestException('You have already applied to this job');

    // Normalise screeningAnswers: accept both map {qId: answer} and array [{questionId, answer}]
    const screeningAnswersArray: { questionId: string; answer: string }[] =
      Array.isArray(dto.screeningAnswers)
        ? dto.screeningAnswers
        : Object.entries(dto.screeningAnswers ?? {}).map(([questionId, answer]) => ({
            questionId,
            answer: String(answer),
          }));

    // Validate required screening questions are answered
    const requiredQuestions = job.screeningQuestions.filter(
      (q) => q.isRequired,
    );
    const answeredIds = screeningAnswersArray.map((a) => a.questionId);
    const missing = requiredQuestions.filter(
      (q) => !answeredIds.includes(q.id),
    );
    if (missing.length > 0) {
      throw new BadRequestException(`Missing answers for required questions`);
    }

    // Compute screening score for knockout questions
    let screeningScore = 100;
    const answersWithValidity = screeningAnswersArray.map((a) => {
      const question = job.screeningQuestions.find(
        (q) => q.id === a.questionId,
      );
      let isCorrect: boolean | null = null;
      if (question?.isKnockout && question.correctOption) {
        isCorrect = a.answer === question.correctOption;
        if (!isCorrect) screeningScore -= 25;
      }
      return { ...a, isCorrect };
    });

    const application = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          jobId,
          seekerId: seeker.id,
          cvId: dto.cvId,
          coverLetter: dto.coverLetter,
          screeningScore,
          screeningAnswers: {
            create: answersWithValidity,
          },
          statusHistory: {
            create: { toStatus: ApplicationStatus.SUBMITTED },
          },
        },
        include: {
          job: { include: { employer: true } },
          seeker: true,
        },
      });

      await tx.job.update({
        where: { id: jobId },
        data: { applicationsCount: { increment: 1 } },
      });

      return app;
    });

    // Notify employer
    await this.notificationQueue.add('new-application', {
      employerUserId: application.job.employer.userId,
      seekerName: application.seeker.fullName,
      jobTitle: application.job.title,
      applicationId: application.id,
    });

    // Schedule anti-ghosting check — 14 days
    await this.antiGhostingQueue.add(
      'check-ghosting',
      { applicationId: application.id },
      { delay: 14 * 24 * 60 * 60 * 1000, jobId: `ghost-${application.id}` },
    );

    return application;
  }

  async updateStatus(
    applicationId: string,
    employerUserId: string,
    dto: UpdateStatusDto,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        seeker: { include: { user: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.employer.userId !== employerUserId) {
      throw new ForbiddenException('Not authorized to update this application');
    }

    const TERMINAL_STATUSES = [
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
      ApplicationStatus.AUTO_CLOSED,
    ];
    if (TERMINAL_STATUSES.some((status) => status === application.status)) {
      throw new BadRequestException('Cannot update a finalized application');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          rejectionReason: dto.rejectionReason,
          ...(dto.status === ApplicationStatus.HIRED && {
            hiredAt: new Date(),
          }),
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: dto.status,
          changedById: employerUserId,
          note: dto.note,
        },
      });

      return app;
    });

    // Notify seeker
    await this.notificationQueue.add('status-changed', {
      seekerUserId: application.seeker.user.id,
      jobTitle: application.job.title,
      newStatus: dto.status,
      applicationId,
      rejectionReason: dto.rejectionReason,
    });

    // If hired, emit event to unlock rating
    if (dto.status === ApplicationStatus.HIRED) {
      this.eventEmitter.emit('application.hired', {
        applicationId,
        seekerId: application.seekerId,
        employerId: application.job.employerId,
      });
    }

    return updated;
  }

  async markOpened(applicationId: string, employerUserId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { employer: true } } },
    });
    if (!application) throw new NotFoundException();
    if (application.job.employer.userId !== employerUserId)
      throw new ForbiddenException();

    if (!application.openedAt) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          openedAt: new Date(),
          status: ApplicationStatus.OPENED,
        },
      });
    }
  }

  async getEmployerPipeline(jobId: string, employerUserId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });
    if (!job) throw new NotFoundException();
    if (job.employer.userId !== employerUserId) throw new ForbiddenException();

    const applications = await this.prisma.application.findMany({
      where: { jobId },
      include: {
        seeker: {
          include: {
            skills: { where: { isFeatured: true } },
            ratingsReceived: {
              select: { overallScore: true },
              take: 5,
            },
          },
        },
        cv: { select: { id: true, title: true, pdfUrl: true } },
        screeningAnswers: { include: { question: true } },
        notes: { include: { author: { select: { email: true } } } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        offer: true,
      },
      orderBy: [
        { screeningScore: 'desc' },
        { matchScore: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by status for Kanban view
    const pipeline = applications.reduce(
      (acc, app) => {
        const key = app.status;
        if (!acc[key]) acc[key] = [];
        acc[key].push(app);
        return acc;
      },
      {} as Record<string, typeof applications>,
    );

    return { pipeline, total: applications.length };
  }

  async getSeekerApplications(seekerUserId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    if (!seeker) throw new NotFoundException();

    return this.prisma.application.findMany({
      where: { seekerId: seeker.id },
      include: {
        job: {
          include: {
            employer: {
              select: {
                companyName: true,
                logoUrl: true,
                aggregateRating: true,
                candidateFriendlyBadge: true,
              },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        offer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async withdraw(applicationId: string, seekerUserId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.seekerId !== seeker?.id) {
      throw new ForbiddenException();
    }
    if (application.status === ApplicationStatus.HIRED) {
      throw new BadRequestException('Cannot withdraw after being hired');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });
  }

  async processAntiGhosting(applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        seeker: { include: { user: true } },
      },
    });
    if (!app) return;

    const staleStatuses = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.RECEIVED,
      ApplicationStatus.OPENED,
    ];
    if (staleStatuses.some((status) => status === app.status)) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.AUTO_CLOSED,
          autoClosedAt: new Date(),
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: app.status,
          toStatus: ApplicationStatus.AUTO_CLOSED,
          note: 'Auto-closed: employer inactivity exceeded 14 days',
        },
      });

      // Increment ghosting counter for employer
      await tx.employerProfile.update({
        where: { id: app.job.employerId },
        data: { lowResponsivenessFlag: true },
      });
    });

    // Notify seeker
    await this.notificationQueue.add('application-auto-closed', {
      seekerUserId: app.seeker.user.id,
      jobTitle: app.job.title,
      companyName: app.job.employer.companyName,
    });
  }

  async addNote(
    applicationId: string,
    authorId: string,
    content: string,
    isInternal = true,
  ) {
    return this.prisma.applicationNote.create({
      data: { applicationId, authorId, content, isInternal },
      include: { author: { select: { email: true } } },
    });
  }

  async computeMatchScore(seekerId: string, jobId: string): Promise<number> {
    const [seeker, job] = await Promise.all([
      this.prisma.seekerProfile.findUnique({
        where: { id: seekerId },
        include: { skills: true, experiences: true },
      }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
    ]);
    if (!seeker || !job) return 0;

    let score = 0;
    const seekerSkills = seeker.skills.map((s) => s.skillName.toLowerCase());
    const requiredSkills = job.requiredSkills.map((s) => s.toLowerCase());

    // Skill match: up to 60 points
    const matchedSkills = requiredSkills.filter((s) =>
      seekerSkills.includes(s),
    );
    score += Math.round(
      (matchedSkills.length / Math.max(requiredSkills.length, 1)) * 60,
    );

    // Location match: 20 points
    if (job.isRemote || seeker.locationCity === job.locationCity) score += 20;

    // Job type preference: 10 points
    if (seeker.preferredJobTypes.includes(job.jobType)) score += 10;

    // Salary match: 10 points
    if (seeker.salaryExpectationMin && seeker.salaryExpectationMax) {
      const overlap =
        seeker.salaryExpectationMin <= job.salaryMax &&
        seeker.salaryExpectationMax >= job.salaryMin;
      if (overlap) score += 10;
    }

    return Math.min(score, 100);
  }
}
