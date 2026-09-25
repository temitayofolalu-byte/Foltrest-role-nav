import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @UseGuards(AuthGuard, RolesGuard) @Roles('renter','agent','admin')
  @Get('support-contact')
  supportContact() { return this.admin.supportContact(); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('pending-agents')
  pendingAgents() { return this.admin.pendingAgents(); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Post('agents/:id/verify')
  verifyAgent(@Param('id') id: string) { return this.admin.verifyAgent(id); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Post('agents/:id/reject')
  rejectAgent(@Param('id') id: string, @Body('reason') reason: string) { return this.admin.rejectAgentVerification(id, reason); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('pending-listings')
  pendingListings() { return this.admin.pendingListings(); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Post('listings/:id/approve')
  approveListing(@Param('id') id: string) { return this.admin.approveListing(id); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Post('listings/:id/reject')
  rejectListing(@Param('id') id: string, @Body('reason') reason: string) { return this.admin.rejectListing(id, reason); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Delete('listings/:id')
  removeListing(@Param('id') id: string) { return this.admin.removeListing(id); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('transactions')
  transactions(@Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.transactionsOverview(page, limit); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('messages')
  allMessages(@Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.allMessages(page, limit); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('reports')
  reports(@Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.reports(page, limit); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Get('roommate-posts')
  allRoommatePosts(@Query('page') page?: string, @Query('limit') limit?: string) { return this.admin.allRoommatePosts(page, limit); }

  @UseGuards(AuthGuard, RolesGuard) @Roles('admin')
  @Delete('roommate-posts/:id')
  removeRoommatePost(@Param('id') id: string) { return this.admin.removeRoommatePost(id); }
}
