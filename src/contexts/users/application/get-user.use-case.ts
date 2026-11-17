import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { UserReader } from './ports/user-reader.port';

export class GetUserUseCase {
  constructor(private readonly users: UserReader) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        `User ${userId} was not found`,
      );
    }

    return user;
  }
}
