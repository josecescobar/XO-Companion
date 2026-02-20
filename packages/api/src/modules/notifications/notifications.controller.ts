import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

class UnregisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('register')
  async registerToken(
    @Body() dto: RegisterTokenDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.notificationsService.registerToken(
      user.id,
      dto.token,
      dto.platform || 'ios',
    );
    return { success: true };
  }

  @Delete('unregister')
  async unregisterToken(@Body() dto: UnregisterTokenDto) {
    await this.notificationsService.unregisterToken(dto.token);
    return { success: true };
  }
}
