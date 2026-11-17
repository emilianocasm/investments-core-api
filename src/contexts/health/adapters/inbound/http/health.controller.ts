import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetHealthUseCase } from '../../../application/get-health.use-case';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(GetHealthUseCase)
    private readonly getHealth: GetHealthUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar el estado de la API' })
  @ApiResponse({
    status: 200,
    description: 'La API está disponible.',
    schema: {
      example: {
        status: 'ok',
        uptime: 123.45,
        timestamp: '2026-11-17T14:00:00.000Z',
      },
    },
  })
  check() {
    return this.getHealth.execute();
  }
}
