import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { TrustModule } from '../trust/trust.module';

@Module({ imports: [TrustModule], controllers: [ListingsController], providers: [ListingsService], exports: [ListingsService] })
export class ListingsModule {}
