import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.services';
import { QueueName } from '../../common/enums';
import {
  CreateOfferDto,
  UpdateOfferDto,
  NegotiateOfferDto,
} from './dto/offer.dto';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QueueName.NOTIFICATIONS) private notificationQueue: bull.Queue,
  ) {}

  async create(
    applicationId: string,
    employerUserId: string,
    dto: CreateOfferDto,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { employer: true } },
        seeker: { include: { user: true } },
        offer: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.job.employer.userId !== employerUserId) {
      throw new ForbiddenException('Only the job employer can make offers');
    }
    if (application.offer) {
      throw new BadRequestException(
        'Offer already exists for this application',
      );
    }

    const offer = await this.prisma.offer.create({
      data: {
        applicationId,
        salaryOffered: dto.salaryOffered,
        currency: dto.currency || 'USD',
        startDate: dto.startDate,
        notes: dto.notes,
        expiresAt: dto.expiresAt,
      },
    });

    // Update application status to OFFER
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.OFFER },
    });

    // Add to status history
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: application.status,
        toStatus: ApplicationStatus.OFFER,
        changedById: employerUserId,
        note: `Offer made: ${dto.salaryOffered} ${dto.currency || 'USD'}`,
      },
    });

    // Send notification
    await this.notificationQueue.add('offer-received', {
      seekerUserId: application.seeker.user.id,
      jobTitle: application.job.title,
      offer,
    });

    return offer;
  }

  async getSeekerOffers(seekerUserId: string) {
    const seeker = await this.prisma.seekerProfile.findUnique({
      where: { userId: seekerUserId },
      select: { id: true },
    });
    if (!seeker) throw new NotFoundException('Seeker profile not found');

    return this.prisma.offer.findMany({
      where: {
        application: {
          seekerId: seeker.id,
        },
      },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEmployerOffers(jobId: string, employerUserId: string) {
    // Verify job belongs to employer
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.employer.userId !== employerUserId) {
      throw new ForbiddenException('Job does not belong to this employer');
    }

    return this.prisma.offer.findMany({
      where: {
        application: { jobId },
      },
      include: {
        application: {
          include: {
            seeker: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: {
          include: {
            job: { include: { employer: true } },
            seeker: { include: { user: true } },
          },
        },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');

    // Check if user is either the seeker or employer
    const isSeeker = offer.application.seeker.user.id === userId;
    const isEmployer = offer.application.job.employer.userId === userId;

    if (!isSeeker && !isEmployer) {
      throw new ForbiddenException('You do not have access to this offer');
    }

    return offer;
  }

  async acceptOffer(offerId: string, seekerUserId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: { include: { seeker: { include: { user: true } } } },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.application.seeker.user.id !== seekerUserId) {
      throw new ForbiddenException('You cannot accept this offer');
    }
    if (offer.acceptedAt || offer.rejectedAt) {
      throw new BadRequestException('Offer has already been responded to');
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const o = await tx.offer.update({
        where: { id: offerId },
        data: { acceptedAt: new Date() },
      });

      // Update application status to HIRED
      await tx.application.update({
        where: { id: offer.applicationId },
        data: {
          status: ApplicationStatus.HIRED,
          hiredAt: new Date(),
        },
      });

      // Update status history
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: offer.applicationId,
          fromStatus: ApplicationStatus.OFFER,
          toStatus: ApplicationStatus.HIRED,
          note: 'Offer accepted',
        },
      });

      return o;
    });

    await this.notificationQueue.add('offer-accepted', {
      offerId: offerId,
    });

    return updatedOffer;
  }

  async rejectOffer(offerId: string, seekerUserId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: { include: { seeker: { include: { user: true } } } },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.application.seeker.user.id !== seekerUserId) {
      throw new ForbiddenException('You cannot reject this offer');
    }
    if (offer.acceptedAt || offer.rejectedAt) {
      throw new BadRequestException('Offer has already been responded to');
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const o = await tx.offer.update({
        where: { id: offerId },
        data: { rejectedAt: new Date() },
      });

      // Mark application as rejected
      await tx.application.update({
        where: { id: offer.applicationId },
        data: { status: ApplicationStatus.REJECTED },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: offer.applicationId,
          fromStatus: ApplicationStatus.OFFER,
          toStatus: ApplicationStatus.REJECTED,
          note: 'Offer rejected',
        },
      });

      return o;
    });

    await this.notificationQueue.add('offer-rejected', {
      offerId: offerId,
    });

    return updatedOffer;
  }

  async negotiateOffer(
    offerId: string,
    seekerUserId: string,
    dto: NegotiateOfferDto,
  ) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: { include: { seeker: { include: { user: true } } } },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.application.seeker.user.id !== seekerUserId) {
      throw new ForbiddenException('You cannot negotiate this offer');
    }
    if (offer.acceptedAt || offer.rejectedAt) {
      throw new BadRequestException('Offer has already been responded to');
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: {
        negotiationNote: dto.negotiationNote,
      },
    });
  }

  async updateOffer(
    offerId: string,
    employerUserId: string,
    dto: UpdateOfferDto,
  ) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        application: {
          include: { job: { include: { employer: true } } },
        },
      },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.application.job.employer.userId !== employerUserId) {
      throw new ForbiddenException('You cannot update this offer');
    }
    if (offer.acceptedAt || offer.rejectedAt) {
      throw new BadRequestException('Offer has already been responded to');
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: {
        salaryOffered: dto.salaryOffered,
        currency: dto.currency,
        startDate: dto.startDate,
        notes: dto.notes,
        expiresAt: dto.expiresAt,
        negotiationNote: dto.negotiationNote,
      },
    });
  }
}
