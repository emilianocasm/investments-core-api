import { UserRecord } from '../../../shared-kernel/domain/investment-records';

export interface UserReader {
  findById(id: number): Promise<UserRecord | undefined>;
}

export const USER_READER = Symbol('USER_READER');
