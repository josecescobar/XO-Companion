import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS — supports comma-separated origins, or '*' to allow all
  const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
  const corsOrigin =
    rawOrigin === '*'
      ? true // reflect request origin (allows any)
      : rawOrigin.split(',').map((o) => o.trim());
  app.enableCors({
    origin: Array.isArray(corsOrigin) && corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
    credentials: true,
  });

  // Global prefix
  const prefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(prefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger / OpenAPI — disabled in production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('XO Companion API')
      .setDescription('Voice-first AI construction field operations assistant')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('xo_refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs will be available at http://localhost:${process.env.PORT || 3000}/api/docs`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`XO Companion API running on port ${port}`);
}
bootstrap();
