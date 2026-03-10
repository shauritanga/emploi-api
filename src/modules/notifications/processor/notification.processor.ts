import { Process, Processor } from '@nestjs/bull';
import bull from 'bull';
import { Logger } from '@nestjs/common';

import { NotificationType } from '@prisma/enums';
import { QueueName } from '../../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';

@Processor(QueueName.NOTIFICATIONS)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('new-application')
  async handleNewApplication(job: bull.Job) {
    const { employerUserId, seekerName, jobTitle, applicationId } = job.data;
    await this.createNotification(employerUserId, {
      type: NotificationType.APPLICATION_STATUS,
      title: 'New Application Received',
      body: `${seekerName} applied for ${jobTitle}`,
      data: { applicationId },
    });
    this.logger.log(`New application notification sent to ${employerUserId}`);
  }

  @Process('status-changed')
  async handleStatusChanged(job: bull.Job) {
    const {
      seekerUserId,
      jobTitle,
      newStatus,
      applicationId,
      rejectionReason,
    } = job.data;

    const statusMessages: Record<string, string> = {
      SHORTLISTED: `Great news! You've been shortlisted for ${jobTitle}`,
      INTERVIEW: `You have an interview request for ${jobTitle}`,
      OFFER: `You have received a job offer for ${jobTitle}`,
      HIRED: `Congratulations! You've been hired for ${jobTitle}`,
      REJECTED: rejectionReason
        ? `Application update for ${jobTitle}: ${rejectionReason}`
        : `Your application for ${jobTitle} was not successful`,
      AUTO_CLOSED: `Your application for ${jobTitle} was auto-closed due to employer inactivity`,
    };

    await this.createNotification(seekerUserId, {
      type: NotificationType.APPLICATION_STATUS,
      title: 'Application Status Update',
      body:
        statusMessages[newStatus] ??
        `Your application status changed to ${newStatus}`,
      data: { applicationId, newStatus },
    });
  }

  @Process('application-auto-closed')
  async handleAutoClosed(job: bull.Job) {
    const { seekerUserId, jobTitle, companyName } = job.data;
    await this.createNotification(seekerUserId, {
      type: NotificationType.APPLICATION_STATUS,
      title: 'Application Closed',
      body: `Your application at ${companyName} for ${jobTitle} was closed due to no response`,
      data: {},
    });
  }

  @Process('new-message')
  async handleNewMessage(job: bull.Job) {
    const { recipientUserId, senderName, conversationId } = job.data;
    await this.createNotification(recipientUserId, {
      type: NotificationType.NEW_MESSAGE,
      title: `New message from ${senderName}`,
      body: 'You have a new message',
      data: { conversationId },
    });
  }

  @Process('interview-request')
  async handleInterviewRequest(job: bull.Job) {
    const { seekerUserId, jobTitle, scheduledAt, interviewType } = job.data;
    await this.createNotification(seekerUserId, {
      type: NotificationType.INTERVIEW_REQUEST,
      title: 'Interview Scheduled',
      body: `${interviewType} interview for ${jobTitle} on ${new Date(scheduledAt).toDateString()}`,
      data: job.data,
    });
  }

  @Process('job-alert-match')
  async handleJobAlertMatch(job: bull.Job) {
    const { seekerUserId, jobTitle, jobId, matchCount } = job.data;
    await this.createNotification(seekerUserId, {
      type: NotificationType.JOB_ALERT,
      title:
        matchCount > 1
          ? `${matchCount} new jobs match your alerts`
          : `New job match: ${jobTitle}`,
      body: 'Tap to view matching jobs',
      data: { jobId },
    });
  }

  private async createNotification(
    userId: string,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data: object;
    },
  ) {
    await this.prisma.notification.create({
      data: { userId, ...payload },
    });
    // TODO: FCM push via firebase-admin here
  }
}
