import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:4000').split(',').map(v => v.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true, forbidUnknownValues: false }));
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  console.log(`Foltrest (NestJS) running at http://localhost:${port}`);
}
bootstrap();
