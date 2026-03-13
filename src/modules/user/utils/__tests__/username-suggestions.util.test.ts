import { UsernameSuggestionsUtil } from '../username-suggestions.util';
import { IUserRepository } from '../../../../domain/user/user.repository.port';

describe('UsernameSuggestionsUtil', () => {
  let util: UsernameSuggestionsUtil;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      isUsernameTaken: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    util = new UsernameSuggestionsUtil(mockRepository);
  });

  it('should generate available suggestions', async () => {
    mockRepository.isUsernameTaken.mockResolvedValueOnce(true); // username2 taken
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username3 available
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username4 available
    mockRepository.isUsernameTaken.mockResolvedValueOnce(false); // username5 available

    const suggestions = await util.generateSuggestions('username', 3);
    expect(suggestions).toEqual(['username3', 'username4', 'username5']);
  });

  it('should return true when username is available', async () => {
    mockRepository.isUsernameTaken.mockResolvedValue(false);
    const result = await util.isUsernameAvailable('newuser');
    expect(result).toBe(true);
  });
});
