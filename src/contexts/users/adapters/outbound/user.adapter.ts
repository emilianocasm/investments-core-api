import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReader } from '../../application/ports/user-reader.port';
import { UserRecord } from '../../../shared-kernel/domain/investment-records';
import { UserEntity } from './user.entity';

@Injectable()
export class UserAdapter implements UserReader {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async findById(id: number): Promise<UserRecord | undefined> {
    const user = await this.users.findOneBy({ id });
    return user
      ? {
          id: user.id,
          email: user.email,
          accountNumber: user.accountNumber,
        }
      : undefined;
  }
}
