import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CreateCashMovementUseCase } from '../../../application/create-cash-movement.use-case';
import { OrderSide, OrderStatus, OrderType } from '../../../domain/order';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';

@ApiTags('Cash movements')
@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly createCashMovement: CreateCashMovementUseCase) {}

  @Post()
  @ApiOperation({
    summary: 'Ingresar o retirar efectivo',
    description:
      'Registra CASH_IN o CASH_OUT como un movimiento FILLED en orders, asociado al instrumento de moneda ARS. Los retiros que exceden el efectivo disponible, descontando reservas, se guardan como REJECTED.',
  })
  @ApiBody({ type: CreateCashMovementDto })
  @ApiCreatedResponse({
    description: 'Movimiento registrado como FILLED o REJECTED.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            order: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 12 },
                instrumentId: { type: 'integer', example: 66 },
                userId: { type: 'integer', example: 1 },
                size: { type: 'integer', example: 10000 },
                price: { type: 'string', example: '1.00' },
                side: {
                  type: 'string',
                  enum: [OrderSide.CASH_IN, OrderSide.CASH_OUT],
                },
                status: {
                  type: 'string',
                  enum: [OrderStatus.FILLED, OrderStatus.REJECTED],
                },
                type: { type: 'string', enum: [OrderType.MARKET] },
                datetime: { type: 'string', format: 'date-time' },
              },
            },
            rejectionReason: { type: 'string' },
          },
        },
        examples: {
          cashInFilled: {
            summary: 'Ingreso de efectivo registrado',
            value: {
              order: {
                id: 12,
                instrumentId: 66,
                userId: 1,
                size: 10000,
                price: '1.00',
                side: OrderSide.CASH_IN,
                status: OrderStatus.FILLED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:00:00.000Z',
              },
            },
          },
          cashOutFilled: {
            summary: 'Retiro de efectivo registrado',
            value: {
              order: {
                id: 13,
                instrumentId: 66,
                userId: 1,
                size: 1000,
                price: '1.00',
                side: OrderSide.CASH_OUT,
                status: OrderStatus.FILLED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:05:00.000Z',
              },
            },
          },
          cashOutRejected: {
            summary: 'Retiro rechazado por efectivo insuficiente',
            value: {
              order: {
                id: 14,
                instrumentId: 66,
                userId: 1,
                size: 20000,
                price: '1.00',
                side: OrderSide.CASH_OUT,
                status: OrderStatus.REJECTED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:10:00.000Z',
              },
              rejectionReason: 'Insufficient available cash',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiNotFoundResponse({ description: 'El usuario no existe.' })
  @ApiUnauthorizedResponse({ description: 'API key ausente o inválida.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno al registrar el movimiento.',
  })
  create(@Body() dto: CreateCashMovementDto) {
    return this.createCashMovement.execute(dto);
  }
}
