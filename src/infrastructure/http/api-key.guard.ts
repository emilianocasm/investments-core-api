import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey = process.env.API_KEY;

  constructor() {
    if (!this.apiKey?.trim()) {
      throw new Error('API_KEY must be configured');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-api-key'];

    if (
      typeof providedKey !== 'string' ||
      !this.hasMatchingKey(providedKey)
    ) {
      throw new UnauthorizedException('A valid API key is required');
    }

    return true;
  }

  private hasMatchingKey(providedKey: string): boolean {
    const expected = Buffer.from(this.apiKey!);
    const provided = Buffer.from(providedKey);

    return (
      expected.length === provided.length &&
      timingSafeEqual(expected, provided)
    );
  }
}
