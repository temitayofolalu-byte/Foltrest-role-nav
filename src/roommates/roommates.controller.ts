import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RoommatesService } from './roommates.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/roommates')
export class RoommatesController {
  constructor(private roommates: RoommatesService) {}

  @Get()
  browse(@Query() query: any) { return this.roommates.browse(query); }

  @Get('mine/all')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() user: any) { return this.roommates.mine(user.id); }

  @Get(':id')
  getById(@Param('id') id: string) { return this.roommates.getById(id); }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: any, @Body() body: any) { return this.roommates.create(user.id, body); }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.roommates.update(user.id, id, body); }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentUser() user: any, @Param('id') id: string) { return this.roommates.remove(user.id, id, user.role === 'admin'); }
}
