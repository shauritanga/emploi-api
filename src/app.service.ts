import { Injectable } from '@nestjs/common';
import { getBuildInfo } from './common/utils/build-info';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getVersion() {
    return getBuildInfo();
  }
}
