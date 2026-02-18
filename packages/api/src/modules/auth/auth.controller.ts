import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('auth')
@Throttle({ short: { ttl: 1000, limit: 3 }, medium: { ttl: 60000, limit: 10 } })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Roles(Role.SUPER_ADMIN)
  async register(
    @Body() dto: RegisterDto,
    @CurrentUser() currentUser: { organizationId: string },
  ) {
    return this.authService.register(dto, currentUser.organizationId);
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() _dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      req.user as any,
    );

    this.setRefreshCookie(res, refreshToken);

    return { accessToken, user };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sub, refreshToken: oldToken } = req.user as any;
    const { accessToken, refreshToken, user } = await this.authService.refresh(
      sub,
      oldToken,
    );

    this.setRefreshCookie(res, refreshToken);

    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['xo_refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('xo_refresh_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('xo_refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
