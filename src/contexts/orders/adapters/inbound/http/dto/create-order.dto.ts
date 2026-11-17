import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSide, OrderType } from '../../../../domain/order';

export class CreateOrderDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID del usuario.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: 47, minimum: 1, description: 'ID del instrumento.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  instrumentId!: number;

  @ApiProperty({
    enum: OrderType,
    example: OrderType.MARKET,
    description:
      'MARKET se ejecuta al último close; LIMIT queda NEW hasta su ejecución.',
  })
  @IsEnum(OrderType)
  type!: OrderType;

  @ApiProperty({
    enum: [OrderSide.BUY, OrderSide.SELL],
    example: OrderSide.BUY,
  })
  @IsEnum({ BUY: OrderSide.BUY, SELL: OrderSide.SELL })
  side!: OrderSide.BUY | OrderSide.SELL;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    description: 'Cantidad entera de acciones. Usar exactamente uno entre size y amount.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  size?: number;

  @ApiPropertyOptional({
    example: 10000,
    minimum: 0.01,
    maximum: 99_999_999.99,
    description:
      'Monto en pesos; se calcula la cantidad máxima de acciones enteras. Usar exactamente uno entre amount y size.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999.99)
  amount?: number;

  @ApiPropertyOptional({
    example: 930,
    minimum: 0.01,
    maximum: 99_999_999.99,
    description: 'Obligatorio para LIMIT y no permitido para MARKET.',
  })
  @ValidateIf((order: CreateOrderDto) => order.type === OrderType.LIMIT)
  @Type(() => Number)
  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999.99)
  price?: number;
}
