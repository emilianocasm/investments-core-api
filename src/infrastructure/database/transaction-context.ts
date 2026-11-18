import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class TransactionContext {
  private readonly managers = new AsyncLocalStorage<EntityManager>();

  run<T>(manager: EntityManager, operation: () => Promise<T>): Promise<T> {
    return this.managers.run(manager, operation);
  }

  getManager(): EntityManager | undefined {
    return this.managers.getStore();
  }
}
