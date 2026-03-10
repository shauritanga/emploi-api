import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { UserRole } from 'src/common/enums';
import { PrismaService } from 'src/prisma/prisma.services';
import { REDIS_CLIENT } from 'src/redis/redis.module';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered');

    if (
      (dto.role === UserRole.EMPLOYER || dto.role === UserRole.BOTH) &&
      !dto.companyName
    ) {
      throw new BadRequestException(
        'Company name required for employer accounts',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          emailVerificationToken: verificationToken,
        },
      });

      if (dto.role === UserRole.SEEKER || dto.role === UserRole.BOTH) {
        await tx.seekerProfile.create({
          data: { userId: newUser.id, fullName: dto.fullName },
        });
      }

      if (dto.role === UserRole.EMPLOYER || dto.role === UserRole.BOTH) {
        await tx.employerProfile.create({
          data: { userId: newUser.id, companyName: dto.companyName! },
        });
      }

      return newUser;
    });

    // Store verification token in Redis (24h TTL)
    try {
      await this.redis.set(`verify:${verificationToken}`, user.id, 'EX', 86400);
    } catch (err) {
      console.warn('Redis unavailable, skipping token storage');
    }

    return this.generateTokenPair(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive)
      throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokenPair(user.id, user.email, user.role);
  }

  async refresh(userId: string, incomingRefreshToken: string) {
    const stored = await this.redis.get(`refresh:${userId}`);
    if (!stored || stored !== incomingRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    return this.generateTokenPair(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.get(`verify:${token}`);
    if (!userId)
      throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });

    await this.redis.del(`verify:${token}`);
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user)
      return { message: 'If that email exists, a reset link has been sent' };

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    await this.redis.set(`reset:${token}`, user.id, 'EX', 3600);
    // TODO: emit email event here

    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redis.get(`reset:${dto.token}`);
    if (!userId)
      throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all sessions
    await this.redis.del(`reset:${dto.token}`, `refresh:${userId}`);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Force re-login
    await this.redis.del(`refresh:${userId}`);
    return { message: 'Password changed successfully' };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    await this.redis.set(`refresh:${userId}`, refreshToken, 'EX', 604800); // 7 days

    return { accessToken, refreshToken, role };
  }
}
