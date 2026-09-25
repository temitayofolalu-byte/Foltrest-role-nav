import { Module } from '@nestjs/common';
import { RoommatesController } from './roommates.controller';
import { RoommatesService } from './roommates.service';

@Module({ controllers: [RoommatesController], providers: [RoommatesService], exports: [RoommatesService] })
export class RoommatesModule {}
