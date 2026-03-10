import { Process, Processor } from '@nestjs/bull';
import bull_1 from 'bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import bull from 'bull';
import { QueueName } from '../../../common/enums';
import { PrismaService } from 'src/prisma/prisma.services';

@Processor(QueueName.JOB_ALERTS)
export class JobAlertsProcessor {
  private readonly logger = new Logger(JobAlertsProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QueueName.NOTIFICATIONS) private notificationQueue: bull.Queue,
  ) {}

  @Process('match-alerts')
  async handleJobAlerts(job: bull_1.Job<{ jobId: string }>) {
    const newJob = await this.prisma.job.findUnique({
      where: { id: job.data.jobId },
    });
    if (!newJob) return;

    const alerts = await this.prisma.jobAlert.findMany({
      where: {
        isActive: true,
        ...(newJob.isRemote ? {} : { isRemoteOnly: false }),
      },
    });

    const matchedAlerts = alerts.filter((alert) => {
      const keywordMatch =
        alert.keywords.length === 0 ||
        alert.keywords.some(
          (k) =>
            newJob.title.toLowerCase().includes(k.toLowerCase()) ||
            newJob.description.toLowerCase().includes(k.toLowerCase()),
        );

      const locationMatch =
        !alert.location ||
        newJob.locationCity
          ?.toLowerCase()
          .includes(alert.location.toLowerCase()) ||
        newJob.isRemote;

      const jobTypeMatch =
        alert.jobTypes.length === 0 || alert.jobTypes.includes(newJob.jobType);

      const experienceMatch =
        alert.experienceLevels.length === 0 ||
        alert.experienceLevels.includes(newJob.experienceLevel);

      const salaryMatch =
        !alert.salaryMin || newJob.salaryMax >= alert.salaryMin;

      return (
        keywordMatch &&
        locationMatch &&
        jobTypeMatch &&
        experienceMatch &&
        salaryMatch
      );
    });

    for (const alert of matchedAlerts) {
      await this.notificationQueue.add('job-alert-match', {
        seekerUserId: alert.seekerId,
        jobTitle: newJob.title,
        jobId: newJob.id,
        matchCount: 1,
      });

      await this.prisma.jobAlert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: new Date() },
      });
    }

    this.logger.log(
      `Matched ${matchedAlerts.length} alerts for job ${job.data.jobId}`,
    );
  }
}
