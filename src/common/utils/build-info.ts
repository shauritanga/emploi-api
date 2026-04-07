import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type BuildInfo = {
  appName: string;
  appVersion: string;
  commitSha: string;
  buildTimestamp: string;
};

let cachedAppVersion: string | null = null;

const readPackageVersion = (): string => {
  if (cachedAppVersion) return cachedAppVersion;
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) return 'unknown';
    const raw = readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    cachedAppVersion = parsed.version ?? 'unknown';
    return cachedAppVersion;
  } catch {
    return 'unknown';
  }
};

export const getBuildInfo = (): BuildInfo => {
  const appVersion = process.env.APP_VERSION?.trim() || readPackageVersion();
  return {
    appName: process.env.APP_NAME?.trim() || 'emploi-api',
    appVersion,
    commitSha: process.env.BUILD_COMMIT_SHA?.trim() || 'unknown',
    buildTimestamp: process.env.BUILD_TIMESTAMP?.trim() || 'unknown',
  };
};
