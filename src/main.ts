import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApplicationErrorFilter } from './infrastructure/http/application-error.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApplicationErrorFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Investments Core API')
    .setDescription(
      'API de búsqueda de instrumentos, cartera y gestión de órdenes. Todas las rutas de la API requieren una API key en el header x-api-key.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-api-key' },
      'api-key',
    )
    .addSecurityRequirements('api-key')
    .addTag('Health', 'Estado de la API')
    .addTag('Instruments', 'Búsqueda de activos')
    .addTag('Portfolio', 'Cartera y tenencias')
    .addTag('Orders', 'Envío y cancelación de órdenes')
    .addTag('Cash movements', 'Ingresos y retiros de efectivo')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'Investments Core API | Swagger',
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
