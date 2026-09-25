import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { StoreModule } from './store/store.module';
import { AuthModule } from './auth/auth.module';
import { ListingsModule } from './listings/listings.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MessagesModule } from './messages/messages.module';
import { TrustModule } from './trust/trust.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RoommatesModule } from './roommates/roommates.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]), // general safety net: 100 requests/minute/IP
    ServeStaticModule.forRoot(
      { rootPath: join(__dirname, '..', 'frontend') },
    ),
    StoreModule,
    AuthModule,
    TrustModule,
    ListingsModule,
    TransactionsModule,
    MessagesModule,
    AdminModule,
    UploadsModule,
    NotificationsModule,
    RoommatesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

