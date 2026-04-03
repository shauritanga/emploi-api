import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { AvailabilityStatus } from '@prisma/client';
import {
  UpdateSeekerProfileDto,
  UpsertExperienceDto,
  UpsertEducationDto,
  UpsertSkillDto,
  UpsertCertificationDto,
  SeekerSearchDto,
} from './dto';
import { PrismaService } from 'src/prisma/prisma.services';

@Injectable()
export class SeekerProfileService {
  constructor(private prisma: PrismaService) {}

  private readonly uploadRootDir = resolve(
    process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'),
  );

  async getProfile(seekerUserId: string) {
    const profile = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      include: {
        experiences: { orderBy: { displayOrder: 'asc' } },
        education: { orderBy: { displayOrder: 'asc' } },
        skills: true,
        certifications: true,
        cvs: {
          where: { isDefault: true },
          select: { id: true, title: true, pdfUrl: true },
        },
      },
    });
    if (!profile) throw new NotFoundException('Seeker profile not found');
    return profile;
  }

  async getPublicProfile(profileId: string) {
    const profile = await this.prisma.seekerProfile.findUnique({
      where: { id: profileId, isProfilePublic: true },
      include: {
        experiences: { orderBy: { displayOrder: 'asc' } },
        education: { orderBy: { displayOrder: 'asc' } },
        skills: { where: { isFeatured: true } },
        certifications: true,
        ratingsReceived: {
          where: { isPublic: true, isDisputed: false },
          select: { overallScore: true, reviewText: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!profile)
      throw new NotFoundException('Profile not found or not public');
    return profile;
  }

  async updateProfile(seekerUserId: string, dto: UpdateSeekerProfileDto) {
    const updated = await this.prisma.seekerProfile.update({
      where: { userId: seekerUserId },
      data: dto,
    });
    const score = this.computeCompletionScore(updated);
    return this.prisma.seekerProfile.update({
      where: { userId: seekerUserId },
      data: { profileCompletionScore: score },
    });
  }

  async upsertExperience(seekerUserId: string, dto: UpsertExperienceDto) {
    const seeker = await this.findSeeker(seekerUserId);

    if (dto.isCurrent) {
      await this.prisma.seekerExperience.updateMany({
        where: { seekerId: seeker.id },
        data: { isCurrent: false },
      });
    }

    const data = {
      companyName: dto.companyName,
      jobTitle: dto.jobTitle,
      location: dto.location,
      employmentType: dto.employmentType,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent ?? false,
      description: dto.description,
      achievements: dto.achievements ?? [],
      skillsUsed: dto.skillsUsed ?? [],
      displayOrder: dto.displayOrder ?? 0,
    };

    if (dto.id) {
      const exp = await this.prisma.seekerExperience.findUnique({
        where: { id: dto.id },
      });
      if (!exp || exp.seekerId !== seeker.id) throw new ForbiddenException();
      return this.prisma.seekerExperience.update({
        where: { id: dto.id },
        data,
      });
    }

    return this.prisma.seekerExperience.create({
      data: { ...data, seekerId: seeker.id },
    });
  }

  async deleteExperience(seekerUserId: string, experienceId: string) {
    const seeker = await this.findSeeker(seekerUserId);
    const exp = await this.prisma.seekerExperience.findUnique({
      where: { id: experienceId },
    });
    if (!exp || exp.seekerId !== seeker.id) throw new ForbiddenException();
    await this.prisma.seekerExperience.delete({ where: { id: experienceId } });
    return { message: 'Experience deleted' };
  }

  async upsertEducation(seekerUserId: string, dto: UpsertEducationDto) {
    const seeker = await this.findSeeker(seekerUserId);

    const data = {
      institutionName: dto.institutionName,
      degree: dto.degree,
      fieldOfStudy: dto.fieldOfStudy,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      grade: dto.grade,
      activities: dto.activities,
      displayOrder: dto.displayOrder ?? 0,
    };

    if (dto.id) {
      const edu = await this.prisma.seekerEducation.findUnique({
        where: { id: dto.id },
      });
      if (!edu || edu.seekerId !== seeker.id) throw new ForbiddenException();
      return this.prisma.seekerEducation.update({
        where: { id: dto.id },
        data,
      });
    }

    return this.prisma.seekerEducation.create({
      data: { ...data, seekerId: seeker.id },
    });
  }

  async deleteEducation(seekerUserId: string, educationId: string) {
    const seeker = await this.findSeeker(seekerUserId);
    const edu = await this.prisma.seekerEducation.findUnique({
      where: { id: educationId },
    });
    if (!edu || edu.seekerId !== seeker.id) throw new ForbiddenException();
    await this.prisma.seekerEducation.delete({ where: { id: educationId } });
    return { message: 'Education deleted' };
  }

  async syncSkills(seekerUserId: string, skills: UpsertSkillDto[]) {
    const seeker = await this.findSeeker(seekerUserId);
    await this.prisma.seekerSkill.deleteMany({
      where: { seekerId: seeker.id },
    });
    return this.prisma.seekerSkill.createMany({
      data: skills.map((s) => ({ ...s, seekerId: seeker.id })),
    });
  }

  async addCertification(seekerUserId: string, dto: UpsertCertificationDto) {
    const seeker = await this.findSeeker(seekerUserId);
    return this.prisma.seekerCertification.create({
      data: {
        seekerId: seeker.id,
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        credentialUrl: dto.credentialUrl,
      },
    });
  }

  async deleteCertification(seekerUserId: string, certificationId: string) {
    const seeker = await this.findSeeker(seekerUserId);
    const cert = await this.prisma.seekerCertification.findUnique({
      where: { id: certificationId },
    });
    if (!cert || cert.seekerId !== seeker.id) throw new ForbiddenException();
    await this.prisma.seekerCertification.delete({
      where: { id: certificationId },
    });
    return { message: 'Certification deleted' };
  }

  async updatePhoto(seekerUserId: string, file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Photo file is required');
    }

    const existingProfile = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      select: { profilePhotoUrl: true },
    });

    if (!existingProfile) {
      throw new NotFoundException('Seeker profile not found');
    }

    const profilePhotoUrl = `/uploads/photos/${file.filename}`;
    const updated = await this.prisma.seekerProfile.update({
      where: { userId: seekerUserId },
      data: { profilePhotoUrl },
    });

    this.removeLocalUpload(existingProfile.profilePhotoUrl);
    return updated;
  }

  async updateVideoIntro(seekerUserId: string, file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Video file is required');
    }

    const existingProfile = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      select: { videoIntroUrl: true },
    });

    if (!existingProfile) {
      throw new NotFoundException('Seeker profile not found');
    }

    const videoIntroUrl = `/uploads/videos/${file.filename}`;
    const updated = await this.prisma.seekerProfile.update({
      where: { userId: seekerUserId },
      data: { videoIntroUrl },
    });

    this.removeLocalUpload(existingProfile.videoIntroUrl);
    return updated;
  }

  async searchSeekers(query: SeekerSearchDto) {
    const where: any = {
      isProfilePublic: true,
      ...(query.availabilityStatus && {
        availabilityStatus: query.availabilityStatus,
      }),
      ...(query.location && {
        OR: [
          { locationCity: { contains: query.location, mode: 'insensitive' } },
          {
            locationCountry: { contains: query.location, mode: 'insensitive' },
          },
        ],
      }),
      ...(query.skills && {
        skills: {
          some: {
            skillName: { in: query.skills.split(',').map((s) => s.trim()) },
          },
        },
      }),
      ...(query.salaryMax && {
        salaryExpectationMin: { lte: query.salaryMax },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.seekerProfile.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          headline: true,
          locationCity: true,
          locationCountry: true,
          profilePhotoUrl: true,
          availabilityStatus: true,
          aggregateRating: true,
          totalRatings: true,
          skills: {
            where: { isFeatured: true },
            select: { skillName: true, proficiencyLevel: true },
          },
        },
        orderBy: [{ availabilityStatus: 'asc' }, { aggregateRating: 'desc' }],
        skip: ((query.page ?? 1) - 1) * 20,
        take: 20,
      }),
      this.prisma.seekerProfile.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: 20,
        totalPages: Math.ceil(total / 20),
      },
    };
  }

  private async findSeeker(userId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');
    return seeker;
  }

  private computeCompletionScore(profile: any): number {
    let score = 0;
    if (profile.fullName) score += 10;
    if (profile.headline) score += 10;
    if (profile.bio) score += 10;
    if (profile.profilePhotoUrl) score += 10;
    if (profile.phone) score += 5;
    if (profile.locationCity) score += 5;
    if (profile.salaryExpectationMin) score += 10;
    if (profile.preferredJobTypes?.length > 0) score += 10;
    if (profile.videoIntroUrl) score += 15;
    if (profile.availabilityStatus !== AvailabilityStatus.NOT_LOOKING)
      score += 15;
    return Math.min(score, 100);
  }

  private removeLocalUpload(fileUrl: string | null | undefined) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
      return;
    }

    const relativePath = fileUrl.replace('/uploads/', '');
    const absolutePath = resolve(this.uploadRootDir, relativePath);

    // Prevent path traversal when resolving persisted URLs.
    if (!absolutePath.startsWith(this.uploadRootDir)) {
      return;
    }

    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }
}
