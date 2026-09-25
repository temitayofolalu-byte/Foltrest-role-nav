import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
@Controller('api/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
 constructor(private notifications:NotificationsService){}
 @Get() mine(@CurrentUser() user:any){return this.notifications.mine(user.id);}
 @Get('unread-count') unread(@CurrentUser() user:any){return this.notifications.unreadCount(user.id);}
 @Post(':id/read') read(@CurrentUser() user:any,@Param('id') id:string){return this.notifications.markRead(user.id,id);}
}
