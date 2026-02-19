import { Controller, Get } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth/powersync')
export class PowerSyncController {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get('token')
  async getToken(
    @CurrentUser() user: { id: string; organizationId: string },
  ) {
    const powersyncUrl = this.configService.get<string>('POWERSYNC_URL');

    const token = this.jwtService.sign(
      {
        sub: user.id,
        user_id: user.id,
        org_id: user.organizationId,
      },
      {
        secret: this.configService.get<string>('POWERSYNC_PRIVATE_KEY') ||
          this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
        algorithm: 'HS256',
      },
    );

    return {
      token,
      powersync_url: powersyncUrl || null,
      expiresIn: 3600,
      user_id: user.id,
      org_id: user.organizationId,
    };
  }
}
