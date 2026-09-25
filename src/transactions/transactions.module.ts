import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PaystackService } from './paystack.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports:[NotificationsModule], controllers: [TransactionsController], providers: [TransactionsService, PaystackService] })
export class TransactionsModule {}
