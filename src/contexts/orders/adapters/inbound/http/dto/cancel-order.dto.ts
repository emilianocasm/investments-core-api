import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID del propietario.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;
}
