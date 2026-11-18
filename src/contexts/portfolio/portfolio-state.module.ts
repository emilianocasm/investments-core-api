import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionContext } from '../../infrastructure/database/transaction-context';
import { ACCOUNT_STATE_REPOSITORY } from '../shared-kernel/application/ports/account-state-repository.port';
import { AccountStateAdapter } from './adapters/outbound/account-state.adapter';
import { PortfolioAccountEntity } from './adapters/outbound/portfolio-account.entity';
import { PortfolioPositionEntity } from './adapters/outbound/portfolio-position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortfolioAccountEntity, PortfolioPositionEntity]),
  ],
  providers: [
    TransactionContext,
    AccountStateAdapter,
    {
      provide: ACCOUNT_STATE_REPOSITORY,
      useExisting: AccountStateAdapter,
    },
  ],
  exports: [ACCOUNT_STATE_REPOSITORY, TransactionContext],
})
export class PortfolioStateModule {}
