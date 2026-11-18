import {
  Body,
  Controller,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CancelOrderUseCase } from '../../../application/cancel-order.use-case';
import { CreateOrderUseCase } from '../../../application/create-order.use-case';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderSide, OrderStatus, OrderType } from '../../../domain/order';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar una orden de compra o venta',
    description:
      'Indicar exactamente uno de size o amount. MARKET toma el último close y se ejecuta inmediatamente; LIMIT requiere price y queda NEW. Órdenes sin fondos o acciones suficientes se persisten como REJECTED.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'KSUID único para esta operación; reutilizarlo solo al reintentar la misma solicitud.',
    example: '0ujsswThIGTUYm2K8FjOOfXtY1K',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({
    description:
      'Orden registrada. El estado puede ser FILLED, NEW o REJECTED.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            order: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 12 },
                instrumentId: { type: 'integer', example: 47 },
                userId: { type: 'integer', example: 1 },
                size: { type: 'integer', example: 10 },
                price: { type: 'string', example: '925.85' },
                side: {
                  type: 'string',
                  enum: [OrderSide.BUY, OrderSide.SELL],
                  example: OrderSide.BUY,
                },
                status: {
                  type: 'string',
                  enum: Object.values(OrderStatus),
                  example: OrderStatus.FILLED,
                },
                type: {
                  type: 'string',
                  enum: Object.values(OrderType),
                  example: OrderType.MARKET,
                },
                datetime: { type: 'string', format: 'date-time' },
              },
            },
            rejectionReason: { type: 'string' },
          },
        },
        examples: {
          marketFilled: {
            summary: 'Orden MARKET ejecutada',
            value: {
              order: {
                id: 12,
                instrumentId: 47,
                userId: 1,
                size: 10,
                price: '925.85',
                side: OrderSide.BUY,
                status: OrderStatus.FILLED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:00:00.000Z',
              },
            },
          },
          limitNew: {
            summary: 'Orden LIMIT pendiente',
            value: {
              order: {
                id: 13,
                instrumentId: 47,
                userId: 1,
                size: 10,
                price: '900.00',
                side: OrderSide.BUY,
                status: OrderStatus.NEW,
                type: OrderType.LIMIT,
                datetime: '2026-11-17T14:05:00.000Z',
              },
            },
          },
          rejectedInsufficientCash: {
            summary: 'Orden rechazada por efectivo insuficiente',
            value: {
              order: {
                id: 14,
                instrumentId: 47,
                userId: 1,
                size: 10,
                price: '925.85',
                side: OrderSide.BUY,
                status: OrderStatus.REJECTED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:10:00.000Z',
              },
              rejectionReason: 'Insufficient available cash',
            },
          },
          rejectedInsufficientShares: {
            summary: 'Orden rechazada por acciones insuficientes',
            value: {
              order: {
                id: 15,
                instrumentId: 47,
                userId: 1,
                size: 10,
                price: '925.85',
                side: OrderSide.SELL,
                status: OrderStatus.REJECTED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:15:00.000Z',
              },
              rejectionReason: 'Insufficient available shares',
            },
          },
          rejectedAmountBelowSharePrice: {
            summary: 'Monto insuficiente para comprar una acción',
            value: {
              order: {
                id: 16,
                instrumentId: 47,
                userId: 1,
                size: 0,
                price: '925.85',
                side: OrderSide.BUY,
                status: OrderStatus.REJECTED,
                type: OrderType.MARKET,
                datetime: '2026-11-17T14:20:00.000Z',
              },
              rejectionReason: 'The requested amount is not enough to buy one share',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos o combinación de parámetros incorrecta; Idempotency-Key ausente o inválida.',
  })
  @ApiNotFoundResponse({ description: 'Usuario o instrumento no encontrado.' })
  @ApiConflictResponse({
    description:
      'La clave ya se usó con otra solicitud o una solicitud con esa clave sigue en proceso.',
  })
  @ApiUnauthorizedResponse({ description: 'API key ausente o inválida.' })
  @ApiInternalServerErrorResponse({
    description: 'Error interno al registrar la orden.',
  })
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.createOrder.execute(dto, idempotencyKey);
  }

  @Post(':orderId/cancel')
  @ApiOperation({
    summary: 'Cancelar una orden pendiente',
    description: 'Solo permite cancelar órdenes NEW pertenecientes al usuario indicado.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'KSUID único para esta operación; reutilizarlo solo al reintentar la misma solicitud.',
    example: '0ujsswThIGTUYm2K8FjOOfXtY1K',
  })
  @ApiParam({
    name: 'orderId',
    type: Number,
    example: 5,
    description: 'ID de la orden a cancelar.',
  })
  @ApiBody({ type: CancelOrderDto })
  @ApiCreatedResponse({
    description: 'Orden cancelada.',
    schema: {
      type: 'object',
      example: {
        id: 5,
        instrumentId: 45,
        userId: 1,
        size: 50,
        price: '710.00',
        type: 'LIMIT',
        side: 'BUY',
        status: OrderStatus.CANCELLED,
        datetime: '2023-07-12T15:14:20.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'El ID, el cuerpo de la solicitud o la Idempotency-Key es inválida.',
  })
  @ApiNotFoundResponse({ description: 'La orden no existe o no pertenece al usuario.' })
  @ApiConflictResponse({
    description:
      'Solo se pueden cancelar órdenes NEW; también se devuelve si la clave idempotente se reutiliza incorrectamente o sigue en proceso.',
  })
  @ApiUnauthorizedResponse({ description: 'API key ausente o inválida.' })
  cancel(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CancelOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.cancelOrder.execute(orderId, dto.userId, idempotencyKey);
  }
}
