import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_READER } from './application/ports/user-reader.port';
import { UserReader } from './application/ports/user-reader.port';
import { GetUserUseCase } from './application/get-user.use-case';
import { UserAdapter } from './adapters/outbound/user.adapter';
import { UserEntity } from './adapters/outbound/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [
    UserAdapter,
    {
      provide: USER_READER,
      useExisting: UserAdapter,
    },
    {
      provide: GetUserUseCase,
      useFactory: (users: UserReader) => new GetUserUseCase(users),
      inject: [USER_READER],
    },
  ],
  exports: [USER_READER, GetUserUseCase],
})
export class UsersModule {}
