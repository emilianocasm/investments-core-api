import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchInstrumentsDto {
  @ApiPropertyOptional({
    example: 'TECO2',
    maxLength: 10,
    description: 'Coincidencia exacta, distingue mayúsculas y minúsculas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ticker?: string;

  @ApiPropertyOptional({
    example: 'Telecom',
    maxLength: 255,
    description: 'Coincidencia exacta, distingue mayúsculas y minúsculas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
    description: 'Número de página, base 1.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
