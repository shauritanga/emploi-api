import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { ApplicationStatus, InterviewType } from '@prisma/client';
import { QueueName } from '../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';

export class CreateInterviewDto {
  scheduledAt: string;
  durationMinutes?: number;
  interviewType: InterviewType;
  location?: string;
  meetingLink?: string;
  phoneNumber?: string;
  stageNumber?: number;
  notes?: string;
}

@Injectable()
export class InterviewsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QueueName.NOTIFICATIONS) private notificationQueue: bull.Queue,
  ) {}

  async schedule(
    applicationId: string,
    employerUserId: string,
    dto: CreateInterviewDto,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        seeker: { include: { user: true } },
      },
    });

    if (!application) throw new NotFoundException();
    if (application.job.employer.userId !== employerUserId)
      throw new ForbiddenException();
    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot schedule interview for rejected application',
      );
    }

    const interview = await this.prisma.$transaction(async (tx) => {
      const i = await tx.interview.create({
        data: {
          applicationId,
          scheduledAt: new Date(dto.scheduledAt),
          durationMinutes: dto.durationMinutes ?? 60,
          interviewType: dto.interviewType,
          location: dto.location,
          meetingLink: dto.meetingLink,
          phoneNumber: dto.phoneNumber,
          stageNumber: dto.stageNumber ?? 1,
          notes: dto.notes,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.INTERVIEW },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: ApplicationStatus.INTERVIEW,
          changedById: employerUserId,
          note: `${dto.interviewType} interview scheduled`,
        },
      });

      return i;
    });

    await this.notificationQueue.add('interview-request', {
      seekerUserId: application.seeker.user.id,
      jobTitle: application.job.title,
      scheduledAt: dto.scheduledAt,
      interviewType: dto.interviewType,
      meetingLink: dto.meetingLink,
    });

    return interview;
  }

  async confirm(interviewId: string, seekerUserId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: { include: { seeker: { include: { user: true } } } },
      },
    });
    if (!interview) throw new NotFoundException();
    if (interview.application.seeker.user.id !== seekerUserId)
      throw new ForbiddenException();

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: { isConfirmed: true, confirmedAt: new Date() },
    });
  }

  async cancel(interviewId: string, userId: string, reason: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
            seeker: { include: { user: true } },
          },
        },
      },
    });
    if (!interview) throw new NotFoundException();

    const isEmployer = interview.application.job.employer.userId === userId;
    const isSeeker = interview.application.seeker.user.id === userId;
    if (!isEmployer && !isSeeker) throw new ForbiddenException();

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: { cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async getInterviewForUser(interviewId: string, userId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
            seeker: { include: { user: true } },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException();

    const isEmployer = interview.application.job.employer.userId === userId;
    const isSeeker = interview.application.seeker.user.id === userId;
    if (!isEmployer && !isSeeker) throw new ForbiddenException();

    return interview;
  }

  async reschedule(
    interviewId: string,
    userId: string,
    dto: Partial<CreateInterviewDto>,
  ) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
            seeker: { include: { user: true } },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException();

    const isEmployer = interview.application.job.employer.userId === userId;
    const isSeeker = interview.application.seeker.user.id === userId;
    if (!isEmployer && !isSeeker) throw new ForbiddenException();

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.meetingLink !== undefined && { meetingLink: dto.meetingLink }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async getByApplicationForUser(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        seeker: { include: { user: true } },
      },
    });

    if (!application) throw new NotFoundException();

    const isEmployer = application.job.employer.userId === userId;
    const isSeeker = application.seeker.user.id === userId;
    if (!isEmployer && !isSeeker) throw new ForbiddenException();

    return this.prisma.interview.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateFeedback(interviewId: string, userId: string, notes: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException();
    const isEmployer = interview.application.job.employer.userId === userId;
    if (!isEmployer) throw new ForbiddenException();

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: { notes },
    });
  }

  async remove(interviewId: string, userId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException();
    const isEmployer = interview.application.job.employer.userId === userId;
    if (!isEmployer) throw new ForbiddenException();

    await this.prisma.interview.delete({ where: { id: interviewId } });
    return { removed: true, id: interviewId };
  }
}
