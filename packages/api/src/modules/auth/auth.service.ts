import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async register(dto: RegisterDto, organizationId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(user: { id: string; email: string; role: string; organizationId: string }) {
    const accessToken = this.generateAccessToken(user);
    const { refreshToken, family } = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken, user };
  }

  async refresh(userId: string, oldTokenValue: string) {
    // Find the token in the database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldTokenValue },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Replay detection: if token is already revoked, revoke the entire family
    if (storedToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revokedAt: new Date() },
      });
      throw new ForbiddenException('Refresh token reuse detected — all sessions revoked');
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens in the same family
    const user = storedToken.user;
    const accessToken = this.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    const { refreshToken: newRefreshToken } = await this.generateRefreshToken(
      user.id,
      storedToken.family,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async logout(refreshTokenValue: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
    });

    if (storedToken) {
      // Revoke all tokens in the family
      await this.prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revokedAt: new Date() },
      });
    }
  }

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  }) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as StringValue,
      },
    );
  }

  private async generateRefreshToken(userId: string, family?: string) {
    const tokenFamily = family || uuidv4();
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Sign a JWT as the refresh token (includes family for strategy validation)
    const refreshToken = this.jwtService.sign(
      { sub: userId, family: tokenFamily, jti: uuidv4() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: expiresIn as StringValue,
      },
    );

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        family: tokenFamily,
        expiresAt,
      },
    });

    return { refreshToken, family: tokenFamily };
  }
}
