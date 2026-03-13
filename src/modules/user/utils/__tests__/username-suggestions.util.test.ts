import { mock } from 'jest-mock-extended';
import { UsernameSuggestionsUtil } from '../username-suggestions.util';
import { IUserRepository } from '../../../../domain/user/user.repository.port';

describe('UsernameSuggestionsUtil', () => {
  let util: UsernameSuggestionsUtil;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = mock<IUserRepository>();

    util = new UsernameSuggestionsUtil(mockRepository);
  });

  it('should generate available suggestions', async () => {
    mockRepository.isUsernameTaken.mockResolvedValueOnce(true);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false);

    const suggestions = await util.generateSuggestions('username', 3);
    expect(suggestions).toEqual(['username3', 'username4', 'username5']);
  });

  it('should return true when username is available', async () => {
    mockRepository.isUsernameTaken.mockResolvedValue(false);
    const result = await util.isUsernameAvailable('newuser');
    expect(result).toBe(true);
  });
});
