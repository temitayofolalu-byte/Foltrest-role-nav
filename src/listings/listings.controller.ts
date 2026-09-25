import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Get('guidelines')
  guidelines() { return this.listings.guidelines(); }

  @Get('mine/all')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  mine(@CurrentUser() user: any) { return this.listings.mine(user.id); }

  @Get()
  browse(@Query() query: any) { return this.listings.browse(query); }

  @Get(':id')
  getById(@Param('id') id: string) { return this.listings.getById(id); }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  create(@CurrentUser() user: any, @Body() body: any) { return this.listings.create(user.id, body); }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) { return this.listings.update(user.id, id, body); }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body('status') status: any) { return this.listings.updateStatus(user.id, id, status); }
}
