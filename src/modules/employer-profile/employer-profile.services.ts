import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TeamMemberRole, VerificationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.services';

export class UpdateEmployerProfileDto {
  companyName?: string;
  companyEmail?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  websiteUrl?: string;
  description?: string;
  cultureHighlights?: string[];
  locationCountry?: string;
  locationCity?: string;
  linkedinUrl?: string;
}

@Injectable()
export class EmployerProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(employerUserId: string) {
    const profile = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
      include: {
        teamMembers: {
          include: { user: { select: { email: true } } },
        },
        jobs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            applicationsCount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Employer profile not found');
    return profile;
  }

  async getPublicProfile(profileId: string) {
    return this.prisma.employerProfile.findUnique({
      where: { id: profileId, isProfilePublic: true },
      include: {
        jobs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            locationCity: true,
            jobType: true,
            salaryMin: true,
            salaryMax: true,
          },
        },
        ratingsReceived: {
          where: { isPublic: true, isDisputed: false },
          select: {
            scores: true,
            overallScore: true,
            reviewText: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async update(employerUserId: string, dto: UpdateEmployerProfileDto) {
    return this.prisma.employerProfile.update({
      where: { userId: employerUserId },
      data: dto,
    });
  }

  async getHiringAnalytics(employerUserId: string) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
    });
    if (!employer) throw new NotFoundException();

    const [jobs, applicationStats, ratingBreakdown] = await Promise.all([
      this.prisma.job.findMany({
        where: { employerId: employer.id },
        select: {
          id: true,
          title: true,
          status: true,
          applicationsCount: true,
          publishedAt: true,
          closedAt: true,
        },
      }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { job: { employerId: employer.id } },
        _count: { id: true },
      }),
      this.prisma.rating.aggregate({
        where: { employerProfileId: employer.id, isDisputed: false },
        _avg: { overallScore: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === 'ACTIVE').length,
      totalApplications: applicationStats.reduce((s, a) => s + a._count.id, 0),
      applicationsByStatus: applicationStats,
      avgRating: ratingBreakdown._avg.overallScore,
      totalRatings: ratingBreakdown._count.id,
      candidateFriendlyBadge: employer.candidateFriendlyBadge,
      lowResponsivenessFlag: employer.lowResponsivenessFlag,
    };
  }

  async inviteTeamMember(
    employerUserId: string,
    inviteeEmail: string,
    role: TeamMemberRole = TeamMemberRole.RECRUITER,
  ) {
    const [employer, invitee] = await Promise.all([
      this.prisma.employerProfile.findUnique({
        where: { userId: employerUserId },
      }),
      this.prisma.user.findUnique({ where: { email: inviteeEmail } }),
    ]);
    if (!employer) throw new NotFoundException('Employer profile not found');
    if (!invitee) throw new NotFoundException('User not found');
    if (invitee.id === employerUserId) {
      throw new BadRequestException('Cannot add yourself as a team member');
    }

    return this.prisma.employerTeamMember.upsert({
      where: {
        employerId_userId: { employerId: employer.id, userId: invitee.id },
      },
      create: {
        employerId: employer.id,
        userId: invitee.id,
        role,
      },
      update: { role },
    });
  }

  async verifyProfile(
    employerUserId: string,
    verificationDocumentUrl?: string,
  ) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
      select: { id: true },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    return this.prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        ...(verificationDocumentUrl !== undefined && {
          verificationDocumentUrl,
        }),
      },
      select: {
        id: true,
        verificationStatus: true,
        verificationDocumentUrl: true,
      },
    });
  }

  async getTeamMembers(employerUserId: string) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
      select: { id: true },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    return this.prisma.employerTeamMember.findMany({
      where: { employerId: employer.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async updateTeamMemberRole(
    employerUserId: string,
    teamMemberId: string,
    role: TeamMemberRole,
  ) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
      select: { id: true },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    const member = await this.prisma.employerTeamMember.findUnique({
      where: { id: teamMemberId },
      select: { id: true, employerId: true },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.employerId !== employer.id) throw new ForbiddenException();

    return this.prisma.employerTeamMember.update({
      where: { id: teamMemberId },
      data: { role },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async removeTeamMember(employerUserId: string, teamMemberId: string) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { userId: employerUserId },
      select: { id: true },
    });
    if (!employer) throw new NotFoundException('Employer profile not found');

    const member = await this.prisma.employerTeamMember.findUnique({
      where: { id: teamMemberId },
      select: { id: true, employerId: true },
    });
    if (!member) throw new NotFoundException('Team member not found');
    if (member.employerId !== employer.id) throw new ForbiddenException();

    await this.prisma.employerTeamMember.delete({ where: { id: teamMemberId } });
    return { removed: true, id: teamMemberId };
  }
}
