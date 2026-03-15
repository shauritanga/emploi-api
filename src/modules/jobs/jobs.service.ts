import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';

import { REDIS_CLIENT } from 'src/redis/redis.module';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobStatus, QuestionType } from '../../common/enums';
import { Prisma } from '@prisma/client';
import { CreateJobDto, UpdateJobDto, JobQueryDto } from './dto/job.dto';
import { CacheTTL } from '../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async create(employerId: string, dto: CreateJobDto) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerId },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    // Destructure screening questions from dto
    const { screeningQuestions, ...jobData } = dto;

    const job = await this.prisma.$transaction(async (tx) => {
      // Create job
      const createdJob = await tx.job.create({
        data: {
          ...jobData,
          employerId: employer.id,
          applicationDeadline: dto.applicationDeadline
            ? new Date(dto.applicationDeadline)
            : null,
        },
      });

      // Create screening questions
      if (screeningQuestions && screeningQuestions.length > 0) {
        await tx.jobScreeningQuestion.createMany({
          data: screeningQuestions.map((q, index) => {
            const questionData: any = {
              jobId: createdJob.id,
              question: q.question,
              questionType: q.questionType || QuestionType.TEXT,
              isRequired: q.isRequired !== undefined ? q.isRequired : true,
              isKnockout: q.isKnockout !== undefined ? q.isKnockout : false,
              displayOrder:
                q.displayOrder !== undefined ? q.displayOrder : index,
            };

            if (q.options) {
              questionData.options = JSON.stringify(q.options);
            }
            if (q.correctOption) {
              questionData.correctOption = q.correctOption;
            }

            return questionData;
          }),
        });
      }

      return await tx.job.findUnique({
        where: { id: createdJob.id },
        include: {
          employer: { select: { companyName: true, logoUrl: true } },
          screeningQuestions: true,
        },
      });
    });

    return job;
  }

  async publish(jobId: string, employerUserId: string) {
    const job = await this.findJobAndVerifyOwner(jobId, employerUserId);
    if (job.status === JobStatus.ACTIVE)
      throw new BadRequestException('Job is already published');

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.ACTIVE, publishedAt: new Date() },
    });

    // Trigger job alert matching in background
    this.eventEmitter.emit('job.published', { jobId, job: updated });

    // Invalidate feed cache
    await this.invalidateFeedCache();

    return updated;
  }

  async findAll(query: JobQueryDto) {
    const cacheKey = `jobs:list:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: Prisma.JobWhereInput = {
      status: JobStatus.ACTIVE,
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.location && {
        OR: [
          { locationCity: { contains: query.location, mode: 'insensitive' } },
          {
            locationCountry: { contains: query.location, mode: 'insensitive' },
          },
        ],
      }),
      ...(query.jobType && { jobType: query.jobType }),
      ...(query.experienceLevel && { experienceLevel: query.experienceLevel }),
      ...(query.isRemote !== undefined && { isRemote: query.isRemote }),
      ...(query.isStreamlinedHiring !== undefined && {
        isStreamlinedHiring: query.isStreamlinedHiring,
      }),
      ...(query.salaryMin && { salaryMax: { gte: query.salaryMin } }),
      ...(query.salaryMax && { salaryMin: { lte: query.salaryMax } }),
      ...(query.skills && {
        requiredSkills: {
          hasSome: query.skills.split(',').map((s) => s.trim()),
        },
      }),
      AND: [
        {
          OR: [
            { applicationDeadline: null },
            { applicationDeadline: { gt: new Date() } },
          ],
        },
      ],
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          employer: {
            select: {
              companyName: true,
              logoUrl: true,
              locationCity: true,
              aggregateRating: true,
              candidateFriendlyBadge: true,
              avgResponseTimeHours: true,
              verificationStatus: true,
            },
          },
          _count: { select: { applications: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
        take: query.limit ?? 20,
      }),
      this.prisma.job.count({ where }),
    ]);

    const result = {
      data: jobs,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      CacheTTL.MEDIUM,
    );
    return result;
  }

  async getPersonalizedFeed(seekerUserId: string, page: number) {
    const cacheKey = `feed:seeker:${seekerUserId}:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      include: { skills: true },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    const jobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.ACTIVE,
        applicationDeadline: { gt: new Date() },
        OR: [
          {
            requiredSkills: { hasSome: seeker.skills.map((s) => s.skillName) },
          },
          { jobType: { in: seeker.preferredJobTypes } },
          { locationCity: seeker.locationCity },
          { isRemote: seeker.isOpenToRelocation },
        ],
      },
      include: {
        employer: {
          select: {
            companyName: true,
            logoUrl: true,
            aggregateRating: true,
            candidateFriendlyBadge: true,
            avgResponseTimeHours: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }],
      skip: (page - 1) * 20,
      take: 20,
    });

    await this.redis.set(cacheKey, JSON.stringify(jobs), 'EX', CacheTTL.MEDIUM);
    return jobs;
  }

  async findOne(jobId: string, userId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            description: true,
            locationCity: true,
            locationCountry: true,
            websiteUrl: true,
            aggregateRating: true,
            totalRatings: true,
            candidateFriendlyBadge: true,
            avgResponseTimeHours: true,
            verificationStatus: true,
          },
        },
        screeningQuestions: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    // Increment view count
    await this.prisma.job.update({
      where: { id: jobId },
      data: { viewsCount: { increment: 1 } },
    });

    return job;
  }

  async update(jobId: string, employerUserId: string, dto: UpdateJobDto) {
    await this.findJobAndVerifyOwner(jobId, employerUserId);

    // Destructure screening questions from dto
    const { screeningQuestions, ...updateData } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update job details
      const job = await tx.job.update({
        where: { id: jobId },
        data: {
          ...updateData,
          applicationDeadline: dto.applicationDeadline
            ? new Date(dto.applicationDeadline)
            : undefined,
        },
      });

      // If screening questions are provided, update them
      if (screeningQuestions && screeningQuestions.length > 0) {
        // Delete old screening questions
        await tx.jobScreeningQuestion.deleteMany({
          where: { jobId },
        });

        // Create new screening questions
        await tx.jobScreeningQuestion.createMany({
          data: screeningQuestions.map((q, index) => {
            const questionData: any = {
              jobId,
              question: q.question,
              questionType: q.questionType || QuestionType.TEXT,
              isRequired: q.isRequired !== undefined ? q.isRequired : true,
              isKnockout: q.isKnockout !== undefined ? q.isKnockout : false,
              displayOrder:
                q.displayOrder !== undefined ? q.displayOrder : index,
            };

            if (q.options) {
              questionData.options = JSON.stringify(q.options);
            }
            if (q.correctOption) {
              questionData.correctOption = q.correctOption;
            }

            return questionData;
          }),
        });
      }

      return await tx.job.findUnique({
        where: { id: jobId },
        include: { screeningQuestions: true },
      });
    });

    await this.invalidateFeedCache();
    return updated;
  }

  async getEmployerJobs(employerUserId: string) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    return this.prisma.job.findMany({
      where: { employerId: employer.id },
      include: {
        _count: { select: { applications: true } },
        screeningQuestions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveJob(seekerUserId: string, jobId: string, listName: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    return this.prisma.savedJob.upsert({
      where: { seekerId_jobId: { seekerId: seeker.id, jobId } },
      create: { seekerId: seeker.id, jobId, listName },
      update: { listName },
    });
  }

  async getSavedJobs(seekerUserId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    if (!seeker) throw new NotFoundException();

    return this.prisma.savedJob.findMany({
      where: { seekerId: seeker.id },
      include: {
        job: {
          include: {
            employer: {
              select: {
                companyName: true,
                logoUrl: true,
                aggregateRating: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findJobAndVerifyOwner(jobId: string, employerUserId: string) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.employerId !== employer.id)
      throw new ForbiddenException('Not your job');

    return job;
  }

  private async invalidateFeedCache() {
    const keys = await this.redis.keys('emploi:feed:*');
    const jobKeys = await this.redis.keys('emploi:jobs:*');
    const allKeys = [...keys, ...jobKeys];
    if (allKeys.length > 0) await this.redis.del(...allKeys);
  }
}
