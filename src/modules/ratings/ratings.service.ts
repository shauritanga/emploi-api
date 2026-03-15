import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import {
  IsObject,
  IsOptional,
  IsString,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.services';

export class CreateRatingDto {
  scores: Record<string, number>; // { COMMUNICATION: 4, OVERALL: 5 }
  @IsOptional() @IsString() reviewText?: string;
}

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async rateEmployer(
    seekerUserId: string,
    applicationId: string,
    dto: CreateRatingDto,
  ) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { employer: { include: { user: true } } } } },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.seekerId !== seeker.id) throw new ForbiddenException();

    // Can only rate after application is finalized
    const RATABLE_STATUSES: ApplicationStatus[] = [
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.AUTO_CLOSED,
    ];
    if (!RATABLE_STATUSES.includes(application.status)) {
      throw new BadRequestException(
        'Can only rate after the application process is finalized',
      );
    }

    // Check for duplicate
    const existing = await this.prisma.rating.findUnique({
      where: {
        applicationId_raterId: { applicationId, raterId: seekerUserId },
      },
    });
    if (existing)
      throw new BadRequestException('You have already rated this employer');

    this.validateScores(dto.scores);
    const overallScore = this.computeOverall(dto.scores);

    const rating = await this.prisma.$transaction(async (tx) => {
      const r = await tx.rating.create({
        data: {
          applicationId,
          raterId: seekerUserId,
          rateeId: application.job.employer.userId,
          employerProfileId: application.job.employer.id,
          scores: dto.scores,
          overallScore,
          reviewText: dto.reviewText,
        },
      });

      await this.updateEmployerAggregateRating(tx, application.job.employer.id);
      return r;
    });

    return rating;
  }

  async rateSeeker(
    employerUserId: string,
    applicationId: string,
    dto: CreateRatingDto,
  ) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { seeker: { include: { user: true } }, job: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.employerId !== employer.id)
      throw new ForbiddenException();

    const RATABLE_STATUSES: ApplicationStatus[] = [
      ApplicationStatus.INTERVIEW,
      ApplicationStatus.OFFER,
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
    ];
    if (!RATABLE_STATUSES.includes(application.status)) {
      throw new BadRequestException(
        'Candidate must have reached interview stage to be rated',
      );
    }

    const existing = await this.prisma.rating.findUnique({
      where: {
        applicationId_raterId: { applicationId, raterId: employerUserId },
      },
    });
    if (existing)
      throw new BadRequestException('You have already rated this seeker');

    this.validateScores(dto.scores);
    const overallScore = this.computeOverall(dto.scores);

    const rating = await this.prisma.$transaction(async (tx) => {
      const r = await tx.rating.create({
        data: {
          applicationId,
          raterId: employerUserId,
          rateeId: application.seeker.user.id,
          seekerProfileId: application.seekerId,
          scores: dto.scores,
          overallScore,
          reviewText: dto.reviewText,
        },
      });

      await this.updateSeekerAggregateRating(tx, application.seekerId);
      return r;
    });

    return rating;
  }

  async getEmployerRatings(employerProfileId: string) {
    const ratings = await this.prisma.rating.findMany({
      where: { employerProfileId, isPublic: true, isDisputed: false },
      select: {
        id: true,
        scores: true,
        overallScore: true,
        reviewText: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const employer = await this.prisma.employerProfile.findUnique({
      where: { id: employerProfileId },
      select: { aggregateRating: true, totalRatings: true },
    });

    return { employer, ratings };
  }

  async getSeekerRatings(seekerProfileId: string, requestorUserId: string) {
    // Seekers can see their own ratings; employers can see ratings after interaction
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { id: seekerProfileId },
      select: { userId: true, aggregateRating: true, totalRatings: true },
    });
    if (!seeker) throw new NotFoundException();

    const isOwner = seeker.userId === requestorUserId;

    const ratings = await this.prisma.rating.findMany({
      where: {
        seekerProfileId,
        isPublic: true,
        isDisputed: false,
      },
      select: {
        scores: true,
        overallScore: true,
        reviewText: isOwner ? true : false, // only owner sees full review text
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { seeker, ratings };
  }

  async disputeRating(ratingId: string, userId: string, disputeNote: string) {
    const rating = await this.prisma.rating.findUnique({
      where: { id: ratingId },
    });
    if (!rating) throw new NotFoundException();
    if (rating.rateeId !== userId)
      throw new ForbiddenException('Can only dispute ratings about you');

    return this.prisma.rating.update({
      where: { id: ratingId },
      data: { isDisputed: true, disputeNote },
    });
  }

  async getDispute(ratingId: string, userId: string) {
    const rating = await this.prisma.rating.findUnique({
      where: { id: ratingId },
      select: {
        id: true,
        raterId: true,
        rateeId: true,
        isDisputed: true,
        disputeNote: true,
        createdAt: true,
      },
    });

    if (!rating) throw new NotFoundException('Rating not found');
    if (rating.raterId !== userId && rating.rateeId !== userId) {
      throw new ForbiddenException();
    }

    return rating;
  }

  async updateRating(
    ratingId: string,
    userId: string,
    dto: { scores?: Record<string, number>; reviewText?: string },
  ) {
    const rating = await this.prisma.rating.findUnique({ where: { id: ratingId } });
    if (!rating) throw new NotFoundException('Rating not found');
    if (rating.raterId !== userId) throw new ForbiddenException();

    if (dto.scores) this.validateScores(dto.scores);

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.rating.update({
        where: { id: ratingId },
        data: {
          ...(dto.scores && {
            scores: dto.scores,
            overallScore: this.computeOverall(dto.scores),
          }),
          ...(dto.reviewText !== undefined && { reviewText: dto.reviewText }),
        },
      });

      if (r.employerProfileId) {
        await this.updateEmployerAggregateRating(tx, r.employerProfileId);
      }
      if (r.seekerProfileId) {
        await this.updateSeekerAggregateRating(tx, r.seekerProfileId);
      }

      return r;
    });

    return updated;
  }

  async deleteRating(ratingId: string, userId: string) {
    const rating = await this.prisma.rating.findUnique({ where: { id: ratingId } });
    if (!rating) throw new NotFoundException('Rating not found');
    if (rating.raterId !== userId) throw new ForbiddenException();

    const deleted = await this.prisma.$transaction(async (tx) => {
      const r = await tx.rating.delete({ where: { id: ratingId } });

      if (r.employerProfileId) {
        await this.updateEmployerAggregateRating(tx, r.employerProfileId);
      }
      if (r.seekerProfileId) {
        await this.updateSeekerAggregateRating(tx, r.seekerProfileId);
      }

      return r;
    });

    return deleted;
  }

  private validateScores(scores: Record<string, number>) {
    Object.values(scores).forEach((v) => {
      if (v < 1 || v > 5)
        throw new BadRequestException('Scores must be between 1 and 5');
    });
  }

  private computeOverall(scores: Record<string, number>): number {
    const values = Object.values(scores);
    return (
      Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
      100
    );
  }

  private async updateEmployerAggregateRating(
    tx: any,
    employerProfileId: string,
  ) {
    const result = await tx.rating.aggregate({
      where: { employerProfileId, isDisputed: false },
      _avg: { overallScore: true },
      _count: { id: true },
    });

    await tx.employerProfile.update({
      where: { id: employerProfileId },
      data: {
        aggregateRating: result._avg.overallScore ?? 0,
        totalRatings: result._count.id,
        candidateFriendlyBadge:
          result._avg.overallScore >= 4.5 && result._count.id >= 10,
      },
    });
  }

  private async updateSeekerAggregateRating(tx: any, seekerProfileId: string) {
    const result = await tx.rating.aggregate({
      where: { seekerProfileId, isDisputed: false },
      _avg: { overallScore: true },
      _count: { id: true },
    });

    await tx.seekerProfile.update({
      where: { id: seekerProfileId },
      data: {
        aggregateRating: result._avg.overallScore ?? 0,
        totalRatings: result._count.id,
      },
    });
  }
}
