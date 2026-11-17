import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../contexts/shared-kernel/application/application-error';

const errorResponses: Record<
  ApplicationErrorCode,
  { status: number; error: string }
> = {
  [ApplicationErrorCode.INVALID_INPUT]: { status: 400, error: 'Bad Request' },
  [ApplicationErrorCode.NOT_FOUND]: { status: 404, error: 'Not Found' },
  [ApplicationErrorCode.CONFLICT]: { status: 409, error: 'Conflict' },
  [ApplicationErrorCode.INVARIANT_VIOLATION]: {
    status: 500,
    error: 'Internal Server Error',
  },
};

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationErrorFilter.name);

  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, error } = errorResponses[exception.code];

    if (status === 500) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error,
    });
  }
}
