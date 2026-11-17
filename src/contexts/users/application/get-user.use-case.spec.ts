import {
  ApplicationError,
  ApplicationErrorCode,
} from '../../shared-kernel/application/application-error';
import { UserReader } from './ports/user-reader.port';
import { GetUserUseCase } from './get-user.use-case';

describe('GetUserUseCase', () => {
  it('returns the user provided by its output port', async () => {
    const user = { id: 1, email: 'emiliano@test.com', accountNumber: '10001' };
    const users: UserReader = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const useCase = new GetUserUseCase(users);

    await expect(useCase.execute(1)).resolves.toEqual(user);
    expect(users.findById).toHaveBeenCalledWith(1);
  });

  it('fails explicitly when the user does not exist', async () => {
    const users: UserReader = {
      findById: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new GetUserUseCase(users);

    await expect(useCase.execute(99)).rejects.toEqual(
      new ApplicationError(
        ApplicationErrorCode.NOT_FOUND,
        'User 99 was not found',
      ),
    );
  });
});
