import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SearchInstrumentsUseCase } from '../../../application/search-instruments.use-case';
import { SearchInstrumentsDto } from './dto/search-instruments.dto';

@ApiTags('Instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly searchInstruments: SearchInstrumentsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Buscar instrumentos',
    description:
      'Filtra por coincidencia exacta de ticker y/o nombre (distingue mayúsculas y minúsculas). Si se informan ambos filtros deben coincidir ambos. La respuesta está paginada.',
  })
  @ApiQuery({ name: 'ticker', required: false, type: String, example: 'TECO2' })
  @ApiQuery({ name: 'name', required: false, type: String, example: 'Telecom' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Página de instrumentos que coinciden con los criterios.',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 7 },
              ticker: { type: 'string', nullable: true, example: 'TECO2' },
              name: { type: 'string', nullable: true, example: 'Telecom' },
              type: { type: 'string', nullable: true, example: 'ACCIONES' },
            },
          },
        },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 20 },
        total: { type: 'integer', example: 1 },
        totalPages: { type: 'integer', example: 1 },
        hasNext: { type: 'boolean', example: false },
      },
      example: {
        items: [{ id: 7, ticker: 'TECO2', name: 'Telecom', type: 'ACCIONES' }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Criterios de búsqueda o paginación inválidos.',
  })
  search(@Query() query: SearchInstrumentsDto) {
    return this.searchInstruments.execute(query);
  }
}
