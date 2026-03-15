import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.services';
import { SearchJobsQueryDto, SearchSeekersQueryDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchJobs(query: SearchJobsQueryDto) {
    const where: any = { status: 'ACTIVE' };

    if (query.keywords) {
      where.OR = [
        { title: { contains: query.keywords, mode: 'insensitive' } },
        { description: { contains: query.keywords, mode: 'insensitive' } },
      ];
    }

    if (query.location) {
      where.OR = [
        ...((where.OR as any[]) || []),
        { locationCity: { contains: query.location, mode: 'insensitive' } },
        { locationCountry: { contains: query.location, mode: 'insensitive' } },
      ];
    }

    if (query.jobTypes && query.jobTypes.length > 0) {
      where.jobType = { in: query.jobTypes };
    }

    if (query.experienceLevels && query.experienceLevels.length > 0) {
      where.experienceLevel = { in: query.experienceLevels };
    }

    if (query.isRemoteOnly) {
      where.isRemote = true;
    }

    if (query.salaryMin !== undefined) {
      where.salaryMax = { gte: query.salaryMin };
    }

    if (query.salaryMax !== undefined) {
      where.salaryMin = { lte: query.salaryMax };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          employer: { select: { companyName: true, logoUrl: true } },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async searchSeekers(query: SearchSeekersQueryDto) {
    const where: any = { isProfilePublic: true };

    if (query.keywords) {
      where.OR = [
        { fullName: { contains: query.keywords, mode: 'insensitive' } },
        { headline: { contains: query.keywords, mode: 'insensitive' } },
        { bio: { contains: query.keywords, mode: 'insensitive' } },
      ];
    }

    if (query.location) {
      where.OR = [
        ...((where.OR as any[]) || []),
        { locationCity: { contains: query.location, mode: 'insensitive' } },
        { locationCountry: { contains: query.location, mode: 'insensitive' } },
      ];
    }

    if (query.skills && query.skills.length > 0) {
      where.skills = {
        some: {
          skillName: { in: query.skills },
        },
      };
    }

    if (query.experienceLevels && query.experienceLevels.length > 0) {
      where.experiences = {
        some: {
          employmentType: { in: query.experienceLevels },
        },
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [seekers, total] = await Promise.all([
      this.prisma.seekerProfile.findMany({
        where,
        include: {
          skills: true,
          experiences: { take: 3, orderBy: { startDate: 'desc' } },
        },
        skip,
        take: limit,
        orderBy: { profileCompletionScore: 'desc' },
      }),
      this.prisma.seekerProfile.count({ where }),
    ]);

    return {
      data: seekers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSavedJobs(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      this.prisma.savedJob.findMany({
        where: {
          seeker: { userId },
        },
        include: {
          job: {
            include: {
              employer: { select: { companyName: true, logoUrl: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedJob.count({
        where: {
          seeker: { userId },
        },
      }),
    ]);

    return {
      data: savedJobs.map((s) => s.job),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async saveJob(userId: string, jobId: string, listName = 'Saved') {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    return this.prisma.savedJob.upsert({
      where: { seekerId_jobId: { seekerId: seeker.id, jobId } },
      create: { seekerId: seeker.id, jobId, listName },
      update: { listName },
    });
  }

  async removeSavedJob(userId: string, jobId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    await this.prisma.savedJob.deleteMany({
      where: { seekerId: seeker.id, jobId },
    });

    return { removed: true, jobId };
  }
}
