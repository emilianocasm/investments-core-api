import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import {
  InstrumentRecord,
  MarketDataRecord,
} from '../../shared-kernel/domain/investment-records';
import { AccountStateRepository } from '../../shared-kernel/application/ports/account-state-repository.port';
import {
  divideRounded,
  formatCents,
  percentage,
  toCents,
} from '../../shared-kernel/domain/money';
import { InstrumentCatalog } from '../../instruments/application/ports/instrument-catalog.port';
import { MarketDataReader } from '../../market-data/application/ports/market-data-reader.port';
import { UserReader } from '../../users/application/ports/user-reader.port';

export class GetPortfolioUseCase {
  constructor(
    private readonly users: UserReader,
    private readonly instruments: InstrumentCatalog,
    private readonly marketData: MarketDataReader,
    private readonly accountState: AccountStateRepository,
  ) {}

  async execute(userId: number) {
    if (!(await this.users.findById(userId))) {
      throw new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        `User ${userId} was not found`,
      );
    }

    const ledger = await this.accountState.findByUser(userId);
    const positions = await Promise.all(
      [...ledger.positions.values()]
        .filter((position) => position.quantity > 0)
        .map(async (position) => {
          const [instrument, quote] = await Promise.all([
            this.instruments.findById(position.instrumentId),
            this.marketData.getLatest(position.instrumentId),
          ]);

          if (!instrument || instrument.type === 'MONEDA') {
            throw new ApplicationError(
              ApplicationErrorCode.INVARIANT_VIOLATION,
              `Missing tradable instrument ${position.instrumentId}`,
            );
          }
          if (!quote?.close) {
            throw new ApplicationError(
              ApplicationErrorCode.INVARIANT_VIOLATION,
              `Missing market price for instrument ${position.instrumentId}`,
            );
          }

          return this.mapPosition(
            position.instrumentId,
            position.quantity,
            position.costBasisCents,
            instrument,
            quote,
          );
        }),
    );
    const marketValueCents = positions.reduce(
      (total, position) => total + position.marketValueCents,
      0n,
    );
    const dailyChangeCents = positions.reduce(
      (total, position) => total + position.dailyChangeCents,
      0n,
    );
    const cashBalanceCents = ledger.cashBalanceCents;
    const reservedCashCents =
      ledger.reservedCashCents > cashBalanceCents
        ? cashBalanceCents > 0n
          ? cashBalanceCents
          : 0n
        : ledger.reservedCashCents;
    const availableCashCents =
      cashBalanceCents > reservedCashCents ? cashBalanceCents - reservedCashCents : 0n;

    return {
      userId,
      totalAccountValue: formatCents(cashBalanceCents + marketValueCents),
      cashBalance: formatCents(cashBalanceCents),
      availableCash: formatCents(availableCashCents),
      reservedCash: formatCents(reservedCashCents),
      dailyReturnPercent: percentage(
        dailyChangeCents,
        cashBalanceCents + marketValueCents,
      ),
      positions: positions.map(
        ({
          marketValueCents: _marketValue,
          dailyChangeCents: _dailyChange,
          ...position
        }) => position,
      ),
    };
  }

  private mapPosition(
    instrumentId: number,
    quantity: number,
    costBasisCents: bigint,
    instrument: InstrumentRecord,
    quote: MarketDataRecord,
  ) {
    const closeCents = toCents(quote.close!);
    const marketValueCents = BigInt(quantity) * closeCents;
    const previousCloseCents =
      quote.previousClose === null ? null : toCents(quote.previousClose);
    const dailyChangeCents =
      previousCloseCents === null
        ? 0n
        : BigInt(quantity) * (closeCents - previousCloseCents);

    return {
      instrumentId,
      ticker: instrument.ticker,
      name: instrument.name,
      quantity,
      averagePrice: formatCents(divideRounded(costBasisCents, BigInt(quantity))),
      marketPrice: formatCents(closeCents),
      marketValue: formatCents(marketValueCents),
      totalReturnPercent: percentage(
        marketValueCents - costBasisCents,
        costBasisCents,
      ),
      dailyReturnPercent:
        previousCloseCents === null
          ? null
          : percentage(closeCents - previousCloseCents, previousCloseCents),
      marketValueCents,
      dailyChangeCents,
    };
  }
}
