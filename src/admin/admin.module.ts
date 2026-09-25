import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListingsModule } from '../listings/listings.module';
import { MessagesModule } from '../messages/messages.module';
import { TrustModule } from '../trust/trust.module';
import { RoommatesModule } from '../roommates/roommates.module';

@Module({imports: [ListingsModule, MessagesModule, TrustModule, NotificationsModule, RoommatesModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
