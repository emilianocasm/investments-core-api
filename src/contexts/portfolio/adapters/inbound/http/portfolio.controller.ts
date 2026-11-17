import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GetPortfolioUseCase } from '../../../application/get-portfolio.use-case';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly getPortfolio: GetPortfolioUseCase) {}

  @Get(':userId')
  @ApiOperation({
    summary: 'Consultar la cartera de un usuario',
    description:
      'Calcula el efectivo y las posiciones a partir de órdenes FILLED, y reserva efectivo/acciones por órdenes NEW.',
  })
  @ApiParam({
    name: 'userId',
    type: Number,
    example: 1,
    description: 'Identificador del usuario.',
  })
  @ApiOkResponse({
    description: 'Resumen de cartera y posiciones.',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'integer', example: 1 },
        totalAccountValue: { type: 'string', example: '904784.00' },
        cashBalance: { type: 'string', example: '753000.00' },
        availableCash: { type: 'string', example: '627500.00' },
        reservedCash: { type: 'string', example: '125500.00' },
        dailyReturnPercent: {
          type: 'number',
          nullable: true,
          example: -0.1202,
        },
        positions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              instrumentId: { type: 'integer', example: 47 },
              ticker: { type: 'string', nullable: true, example: 'PAMP' },
              name: {
                type: 'string',
                nullable: true,
                example: 'Pampa Holding S.A.',
              },
              quantity: { type: 'integer', example: 40 },
              averagePrice: { type: 'string', example: '930.00' },
              marketPrice: { type: 'string', example: '925.85' },
              marketValue: { type: 'string', example: '37034.00' },
              totalReturnPercent: {
                type: 'number',
                nullable: true,
                example: -0.4462,
              },
              dailyReturnPercent: {
                type: 'number',
                nullable: true,
                example: 0.4393,
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No existe un usuario con ese ID.' })
  get(@Param('userId', ParseIntPipe) userId: number) {
    return this.getPortfolio.execute(userId);
  }
}
