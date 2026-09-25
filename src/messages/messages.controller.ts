import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private messages: MessagesService) {}

  @Get()
  inbox(@CurrentUser() user: any) { return this.messages.inbox(user.id); }

  @Get('thread/:listingId')
  listingThread(@CurrentUser() user: any, @Param('listingId') listingId: string) { return this.messages.listingThread(user.id, listingId); }

  @Get('general/:otherUserId')
  generalThread(@CurrentUser() user: any, @Param('otherUserId') otherUserId: string) { return this.messages.generalThread(user.id, otherUserId); }

  @Post()
  send(@CurrentUser() user: any, @Body() body: any) { return this.messages.send(user.id, body); }
}
