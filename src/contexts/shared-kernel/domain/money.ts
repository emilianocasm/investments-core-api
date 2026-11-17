export function toCents(amount: string | number): bigint {
  const value = typeof amount === 'number' ? amount.toFixed(2) : amount;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);

  if (!match) {
    throw new Error(`Invalid monetary amount: ${value}`);
  }

  const fraction = match[3] ?? '';
  let cents = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  if (fraction[2] && fraction[2] >= '5') {
    cents += 1n;
  }
  return match[1] === '-' ? -cents : cents;
}

export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

export function centsToNumber(cents: bigint): number {
  return Number(formatCents(cents));
}

export function percentage(numerator: bigint, denominator: bigint): number | null {
  if (denominator === 0n) {
    return null;
  }

  return Number(((numerator * 1_000_000n) / denominator)) / 10_000;
}

export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    return 0n;
  }

  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * ((absolute + denominator / 2n) / denominator);
}
