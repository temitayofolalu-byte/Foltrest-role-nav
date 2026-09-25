import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/transactions')
export class TransactionsController {
  constructor(private txns: TransactionsService) {}

  @Post('initiate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('renter')
  initiate(@CurrentUser() user: any, @Body() body: any) { return this.txns.initiate(user.id, body); }

  @Post('webhook')
  webhook(@Req() req: any, @Headers('x-paystack-signature') signature?: string) {
    return this.txns.handleWebhook(req.rawBody, signature);
  }

  @Post('agent/bank-account')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('agent')
  setAgentBank(@CurrentUser() user:any,@Body() body:any){return this.txns.setAgentBank(user.id,body);}

  @Post(':id/payout')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  payout(@Param('id') id:string){return this.txns.payoutForTransaction(id);}

  @Post(':id/confirm')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('renter')
  confirm(@CurrentUser() user: any, @Param('id') id: string) { return this.txns.confirm(user.id, id); }

  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@CurrentUser() user: any) { return this.txns.mine(user); }
}
