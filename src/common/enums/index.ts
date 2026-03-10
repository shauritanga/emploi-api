export {
  UserRole,
  ApplicationStatus,
  JobStatus,
  JobType,
  ExperienceLevel,
  NotificationType,
} from '@prisma/client';

export enum QueueName {
  NOTIFICATIONS = 'notifications',
  CV_GENERATION = 'cv-generation',
  ANTI_GHOSTING = 'anti-ghosting',
  JOB_ALERTS = 'job-alerts',
  EMAIL = 'email',
}

export enum CacheKey {
  JOB_FEED = 'job_feed',
  JOB_DETAIL = 'job_detail',
  EMPLOYER_STATS = 'employer_stats',
  SEEKER_MATCH = 'seeker_match',
}

export enum CacheTTL {
  SHORT = 60, // 1 minute
  MEDIUM = 300, // 5 minutes
  LONG = 3600, // 1 hour
  DAY = 86400, // 24 hours
}
