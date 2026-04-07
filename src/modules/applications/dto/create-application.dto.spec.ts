import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateApplicationDto } from './create-application.dto';

describe('CreateApplicationDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const metadata = {
    type: 'body' as const,
    metatype: CreateApplicationDto,
    data: '',
  };

  it('accepts the expected apply payload shape', async () => {
    const payload = {
      cvId: '7bf6dce9-cf8d-4bcb-8323-29476aac80d2',
      coverLetter: null,
      screeningAnswers: {
        '4d325cc6-4a53-41cf-b069-90912783c19c': 4,
        '88df6ff1-5a06-4fc7-b57f-70883f7467fa': 'Yes',
      },
    };

    const result = (await pipe.transform(
      payload,
      metadata,
    )) as CreateApplicationDto;
    expect(result.cvId).toBe(payload.cvId);
    expect(result.coverLetter).toBeNull();
    expect(result.screeningAnswers).toEqual(payload.screeningAnswers);
  });

  it('normalizes screening answers from array to map', async () => {
    const payload = {
      cvId: '7bf6dce9-cf8d-4bcb-8323-29476aac80d2',
      screeningAnswers: [
        {
          questionId: '4d325cc6-4a53-41cf-b069-90912783c19c',
          answer: 4,
        },
        {
          questionId: '88df6ff1-5a06-4fc7-b57f-70883f7467fa',
          answer: true,
        },
      ],
    };

    const result = (await pipe.transform(
      payload,
      metadata,
    )) as CreateApplicationDto;
    expect(result.screeningAnswers).toEqual({
      '4d325cc6-4a53-41cf-b069-90912783c19c': '4',
      '88df6ff1-5a06-4fc7-b57f-70883f7467fa': 'true',
    });
  });

  it('rejects unknown properties', async () => {
    try {
      await pipe.transform(
        {
          cvId: '7bf6dce9-cf8d-4bcb-8323-29476aac80d2',
          unexpected: 'value',
        },
        metadata,
      );
      fail('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message?: string[];
      };
      expect(response.message).toContain(
        'property unexpected should not exist',
      );
    }
  });
});
