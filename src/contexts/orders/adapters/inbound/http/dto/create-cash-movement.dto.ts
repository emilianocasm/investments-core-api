import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsPositive, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderSide } from '../../../../domain/order';

export class CreateCashMovementDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID del usuario.' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId!: number;

  @ApiProperty({
    enum: [OrderSide.CASH_IN, OrderSide.CASH_OUT],
    example: OrderSide.CASH_IN,
  })
  @IsEnum({ CASH_IN: OrderSide.CASH_IN, CASH_OUT: OrderSide.CASH_OUT })
  side!: OrderSide.CASH_IN | OrderSide.CASH_OUT;

  @ApiProperty({
    example: 10000,
    minimum: 1,
    maximum: 2_147_483_647,
    description:
      'Monto entero en pesos. El modelo orders almacena este importe en size.',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(2_147_483_647)
  amount!: number;
}
