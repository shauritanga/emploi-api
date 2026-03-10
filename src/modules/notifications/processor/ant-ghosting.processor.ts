import { Process, Processor } from '@nestjs/bull';
import bull from 'bull';
import { Logger } from '@nestjs/common'
import { QueueName } from '../../../common/enums';
import { ApplicationsService } from 'src/modules/applications/applications.service';

@Processor(QueueName.ANTI_GHOSTING)
export class AntiGhostingProcessor {
  private readonly logger = new Logger(AntiGhostingProcessor.name);

  constructor(private applicationsService: ApplicationsService) {}

  @Process('check-ghosting')
  async handleGhostingCheck(job: bull.Job<{ applicationId: string }>) {
    this.logger.log(
      `Checking ghosting for application ${job.data.applicationId}`,
    );
    await this.applicationsService.processAntiGhosting(job.data.applicationId);
  }
}
