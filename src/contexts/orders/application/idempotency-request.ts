import { createHash } from 'node:crypto';
import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';

const KSUID_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MAX_KSUID_VALUE = (1n << 160n) - 1n;

export interface IdempotencyRequest {
  id: string;
  requestHash: string;
}

export function createIdempotencyRequest(
  key: string | undefined,
  operation: string,
  request: unknown,
): IdempotencyRequest {
  if (!key || !isKsuid(key)) {
    throw new ApplicationError(
      ApplicationErrorCode.INVALID_INPUT,
      'A valid KSUID must be provided in the Idempotency-Key header',
    );
  }

  return {
    id: key,
    requestHash: createHash('sha256')
      .update(
        JSON.stringify({ operation, request: canonicalize(request) }),
      )
      .digest('hex'),
  };
}

function isKsuid(value: string): boolean {
  if (value.length !== 27) {
    return false;
  }

  let decoded = 0n;
  for (const character of value) {
    const digit = KSUID_ALPHABET.indexOf(character);
    if (digit < 0) {
      return false;
    }
    decoded = decoded * 62n + BigInt(digit);
    if (decoded > MAX_KSUID_VALUE) {
      return false;
    }
  }
  return true;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}
