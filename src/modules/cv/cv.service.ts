import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { QueueName } from '../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';
import { CreateCvDto, UpdateCvDto } from './dto/cv.dto';

@Injectable()
export class CvService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QueueName.CV_GENERATION) private cvQueue: bull.Queue,
  ) {}

  async create(seekerUserId: string, dto: CreateCvDto) {
    const needsProfileSnapshot =
      !dto.contentJson || Object.keys(dto.contentJson).length === 0;

    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      ...(needsProfileSnapshot && {
        include: {
          experiences: { orderBy: { displayOrder: 'asc' } },
          education: { orderBy: { displayOrder: 'asc' } },
          skills: true,
          certifications: true,
        },
      }),
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    const contentJson = needsProfileSnapshot
      ? {
          personalInfo: {
            fullName: seeker.fullName,
            headline: seeker.headline,
            phone: seeker.phone,
            bio: seeker.bio,
            location: seeker.locationIsPublic
              ? `${seeker.locationCity}, ${seeker.locationCountry}`
              : seeker.locationCountry,
          },
          experiences: (seeker as any).experiences ?? [],
          education: (seeker as any).education ?? [],
          skills: (seeker as any).skills ?? [],
          certifications: (seeker as any).certifications ?? [],
        }
      : dto.contentJson;

    if (dto.isDefault) {
      await this.prisma.cv.updateMany({
        where: { seekerId: seeker.id },
        data: { isDefault: false },
      });
    }

    const cv = await this.prisma.cv.create({
      data: {
        seekerId: seeker.id,
        templateId: dto.templateId,
        title: dto.title,
        contentJson,
        isDefault: dto.isDefault ?? false,
        isPublic: dto.isPublic ?? false,
      },
    });

    // Queue PDF generation
    await this.cvQueue.add('generate-pdf', { cvId: cv.id });

    return cv;
  }

  async getSeeekerCvs(seekerUserId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
    });
    if (!seeker) throw new NotFoundException();

    return this.prisma.cv.findMany({
      where: { seekerId: seeker.id },
      include: { template: { select: { name: true, previewImageUrl: true } } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getById(cvId: string, seekerUserId: string) {
    const cv = await this.prisma.cv.findUnique({
      where: { id: cvId },
      include: {
        seeker: { select: { userId: true } },
        template: { select: { name: true, previewImageUrl: true } },
      },
    });

    if (!cv) throw new NotFoundException('CV not found');
    if (cv.seeker.userId !== seekerUserId) throw new ForbiddenException();

    return cv;
  }

  async update(
    cvId: string,
    seekerUserId: string,
    dto: UpdateCvDto,
  ) {
    const cv = await this.prisma.cv.findUnique({
      where: { id: cvId },
      include: { seeker: { select: { userId: true, id: true } } },
    });
    if (!cv) throw new NotFoundException('CV not found');
    if (cv.seeker.userId !== seekerUserId) throw new ForbiddenException();

    if (dto.isDefault) {
      await this.prisma.cv.updateMany({
        where: { seekerId: cv.seeker.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.cv.update({
      where: { id: cvId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.contentJson !== undefined && { contentJson: dto.contentJson }),
      },
    });
  }

  async setDefault(cvId: string, seekerUserId: string) {
    const cv = await this.prisma.cv.findUnique({
      where: { id: cvId },
      include: { seeker: { select: { userId: true, id: true } } },
    });

    if (!cv) throw new NotFoundException('CV not found');
    if (cv.seeker.userId !== seekerUserId) throw new ForbiddenException();

    await this.prisma.$transaction([
      this.prisma.cv.updateMany({
        where: { seekerId: cv.seeker.id },
        data: { isDefault: false },
      }),
      this.prisma.cv.update({
        where: { id: cvId },
        data: { isDefault: true },
      }),
    ]);

    return { id: cvId, isDefault: true };
  }

  async getDownloadInfo(cvId: string, seekerUserId: string) {
    const cv = await this.getById(cvId, seekerUserId);
    return {
      id: cv.id,
      pdfUrl: cv.pdfUrl,
      pdfGeneratedAt: cv.pdfGeneratedAt,
      isReady: Boolean(cv.pdfUrl),
    };
  }

  async computeJobMatchScore(
    cvId: string,
    jobId: string,
    seekerUserId: string,
  ) {
    const cv = await this.prisma.cv.findUnique({
      where: { id: cvId },
      include: { seeker: true },
    });
    if (!cv) throw new NotFoundException('CV not found');
    if (cv.seeker.userId !== seekerUserId) throw new ForbiddenException();

    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const content = cv.contentJson as any;
    const cvSkills: string[] =
      content.skills?.map((s: any) => s.skillName.toLowerCase()) ?? [];
    const requiredSkills = job.requiredSkills.map((s) => s.toLowerCase());
    const preferredSkills = job.preferredSkills.map((s) => s.toLowerCase());

    const matchedRequired = requiredSkills.filter((s) => cvSkills.includes(s));
    const matchedPreferred = preferredSkills.filter((s) =>
      cvSkills.includes(s),
    );

    const requiredScore = Math.round(
      (matchedRequired.length / Math.max(requiredSkills.length, 1)) * 60,
    );
    const preferredScore = Math.round(
      (matchedPreferred.length / Math.max(preferredSkills.length, 1)) * 20,
    );

    const missingRequired = requiredSkills.filter((s) => !cvSkills.includes(s));
    const missingPreferred = preferredSkills.filter(
      (s) => !cvSkills.includes(s),
    );

    const totalScore = Math.min(requiredScore + preferredScore + 20, 100); // +20 base

    return {
      score: totalScore,
      matchedRequired,
      matchedPreferred,
      missingRequired,
      missingPreferred,
      recommendations: missingRequired.map(
        (s) => `Add "${s}" to your skills to improve your match`,
      ),
    };
  }

  async getTemplates() {
    return this.prisma.cvTemplate.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        previewImageUrl: true,
        category: true,
        isAtsOptimized: true,
      },
    });
  }

  async delete(cvId: string, seekerUserId: string) {
    const cv = await this.prisma.cv.findUnique({
      where: { id: cvId },
      include: { seeker: true },
    });
    if (!cv) throw new NotFoundException();
    if (cv.seeker.userId !== seekerUserId) throw new ForbiddenException();
    if (cv.isDefault) throw new ForbiddenException('Cannot delete default CV');

    return this.prisma.cv.delete({ where: { id: cvId } });
  }
}
