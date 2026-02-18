import { Controller, Get, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.PROJECT_MANAGER)
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.usersService.findAll(orgId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.usersService.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.usersService.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.usersService.deactivate(id, orgId);
  }
}
