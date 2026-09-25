import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TrustService } from './trust.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/trust')
export class TrustController {
  constructor(private trust: TrustService) {}

  @Post('reviews')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('renter')
  addAgentReview(@CurrentUser() user: any, @Body() body: any) { return this.trust.addAgentReview(user.id, body); }

  @Get('reviews/agent/:agentId')
  getAgentRating(@Param('agentId') agentId: string) { return this.trust.getAgentRating(agentId); }

  @Post('site-reviews')
  @UseGuards(AuthGuard)
  addSiteReview(@CurrentUser() user: any, @Body() body: any) { return this.trust.addSiteReview(user.id, body); }

  @Get('top-agents')
  topAgents(){return this.trust.topAgents();}

  @Get('site-reviews')
  getSiteReviews() { return this.trust.getSiteReviews(); }

  @Post('reports')
  @UseGuards(AuthGuard)
  addReport(@CurrentUser() user: any, @Body() body: any) { return this.trust.addReport(user.id, body); }
}
