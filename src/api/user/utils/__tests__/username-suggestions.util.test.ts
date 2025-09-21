import { UsernameSuggestionsUtil } from '../username-suggestions.util';
import { IUserRepository } from '../../../user/contracts/user.repository.contract';

describe('UsernameSuggestionsUtil', () => {
  let usernameSuggestionsUtil: UsernameSuggestionsUtil;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      createUser: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      isEmailTaken: jest.fn(),
      isUsernameTaken: jest.fn(),
      findUsersByUsernamePrefix: jest.fn(),
    };

    usernameSuggestionsUtil = new UsernameSuggestionsUtil(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions when base username is taken', async () => {
      const baseUsername = 'testuser';
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(true) // testuser2 is taken
        .mockResolvedValueOnce(false) // testuser3 is available
        .mockResolvedValueOnce(false) // testuser4 is available
        .mockResolvedValueOnce(false); // testuser5 is available

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        3
      );

      expect(suggestions).toEqual(['testuser3', 'testuser4', 'testuser5']);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(4);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenNthCalledWith(
        1,
        'testuser2'
      );
      expect(mockUserRepository.isUsernameTaken).toHaveBeenNthCalledWith(
        2,
        'testuser3'
      );
      expect(mockUserRepository.isUsernameTaken).toHaveBeenNthCalledWith(
        3,
        'testuser4'
      );
      expect(mockUserRepository.isUsernameTaken).toHaveBeenNthCalledWith(
        4,
        'testuser5'
      );
    });

    it('should return available suggestions immediately when found', async () => {
      const baseUsername = 'newuser';
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(false) // newuser2 is available
        .mockResolvedValueOnce(false) // newuser3 is available
        .mockResolvedValueOnce(false); // newuser4 is available

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        3
      );

      expect(suggestions).toEqual(['newuser2', 'newuser3', 'newuser4']);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(3);
    });

    it('should skip taken usernames and find available ones', async () => {
      const baseUsername = 'popularuser';
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(true) // popularuser2 is taken
        .mockResolvedValueOnce(true) // popularuser3 is taken
        .mockResolvedValueOnce(true) // popularuser4 is taken
        .mockResolvedValueOnce(false) // popularuser5 is available
        .mockResolvedValueOnce(true) // popularuser6 is taken
        .mockResolvedValueOnce(false) // popularuser7 is available
        .mockResolvedValueOnce(false); // popularuser8 is available

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        3
      );

      expect(suggestions).toEqual([
        'popularuser5',
        'popularuser7',
        'popularuser8',
      ]);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(7);
    });

    it('should use default count of 3 when not specified', async () => {
      const baseUsername = 'defaultuser';
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      const suggestions =
        await usernameSuggestionsUtil.generateSuggestions(baseUsername);

      expect(suggestions).toHaveLength(3);
      expect(suggestions).toEqual([
        'defaultuser2',
        'defaultuser3',
        'defaultuser4',
      ]);
    });

    it('should handle custom count parameter', async () => {
      const baseUsername = 'customuser';
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        5
      );

      expect(suggestions).toHaveLength(5);
      expect(suggestions).toEqual([
        'customuser2',
        'customuser3',
        'customuser4',
        'customuser5',
        'customuser6',
      ]);
    });

    it('should stop at 100 attempts to prevent infinite loop', async () => {
      const baseUsername = 'allTaken';
      mockUserRepository.isUsernameTaken.mockResolvedValue(true); // all usernames are taken

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        10
      );

      expect(suggestions).toEqual([]);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(99); // 2 to 100
    });

    it('should handle repository errors gracefully', async () => {
      const baseUsername = 'erroruser';
      mockUserRepository.isUsernameTaken
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        2
      );

      // Should continue after error and find available usernames
      expect(suggestions).toEqual(['erroruser3', 'erroruser4']);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(3);
    });

    it('should return partial results when some checks fail', async () => {
      const baseUsername = 'partialuser';
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(false) // partialuser2 is available
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(false) // partialuser4 is available
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(false); // partialuser6 is available

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        3
      );

      expect(suggestions).toEqual([
        'partialuser2',
        'partialuser4',
        'partialuser6',
      ]);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(5);
    });

    it('should handle edge case with zero count', async () => {
      const baseUsername = 'zerouser';

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        0
      );

      expect(suggestions).toEqual([]);
      expect(mockUserRepository.isUsernameTaken).not.toHaveBeenCalled();
    });

    it('should handle negative count gracefully', async () => {
      const baseUsername = 'negativeuser';

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        -1
      );

      expect(suggestions).toEqual([]);
      expect(mockUserRepository.isUsernameTaken).not.toHaveBeenCalled();
    });

    it('should handle very long base username', async () => {
      const longBaseUsername = 'a'.repeat(35); // Near GitHub's 39 char limit
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        longBaseUsername,
        2
      );

      expect(suggestions).toEqual([
        `${longBaseUsername}2`,
        `${longBaseUsername}3`,
      ]);
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return true when username is available', async () => {
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      const result =
        await usernameSuggestionsUtil.isUsernameAvailable('available');

      expect(result).toBe(true);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'available'
      );
    });

    it('should return false when username is taken', async () => {
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);

      const result = await usernameSuggestionsUtil.isUsernameAvailable('taken');

      expect(result).toBe(false);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith('taken');
    });

    it('should return false when repository throws error for safety', async () => {
      mockUserRepository.isUsernameTaken.mockRejectedValue(
        new Error('Database error')
      );

      const result =
        await usernameSuggestionsUtil.isUsernameAvailable('erroruser');

      expect(result).toBe(false);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'erroruser'
      );
    });

    // Removed over-test: excessive enumeration of error types

    it('should handle case-sensitive usernames', async () => {
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      await usernameSuggestionsUtil.isUsernameAvailable('TestUser');

      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'TestUser'
      );
    });

    it('should handle special characters in usernames', async () => {
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);

      const result =
        await usernameSuggestionsUtil.isUsernameAvailable('user-name');

      expect(result).toBe(false);
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'user-name'
      );
    });
  });

  describe('getFirstAvailable', () => {
    it('should return first available suggestion', async () => {
      const baseUsername = 'firstuser';
      mockUserRepository.isUsernameTaken.mockResolvedValue(false);

      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result).toBe('firstuser2');
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledWith(
        'firstuser2'
      );
    });

    it('should return timestamp-based fallback when no suggestions available', async () => {
      const baseUsername = 'nosuggestionsuser';
      mockUserRepository.isUsernameTaken.mockResolvedValue(true); // all suggestions taken

      const beforeCall = Date.now();
      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);
      const afterCall = Date.now();

      expect(result).toMatch(new RegExp(`^${baseUsername}\\d+$`));

      // Extract timestamp from result
      const timestamp = parseInt(result.replace(baseUsername, ''), 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(timestamp).toBeLessThanOrEqual(afterCall);
    });

    it('should handle repository errors and return timestamp fallback', async () => {
      const baseUsername = 'erroruser';
      mockUserRepository.isUsernameTaken.mockRejectedValue(
        new Error('Database error')
      );

      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result).toMatch(new RegExp(`^${baseUsername}\\d+$`));
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(99); // tries all numbers 2-100
    });

    it('should find available suggestion after some taken ones', async () => {
      const baseUsername = 'someuser';
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(true) // someuser2 taken
        .mockResolvedValueOnce(true) // someuser3 taken
        .mockResolvedValueOnce(false); // someuser4 available

      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result).toBe('someuser4');
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed repository responses', async () => {
      const baseUsername = 'mixeduser';
      mockUserRepository.isUsernameTaken
        .mockRejectedValueOnce(new Error('First error')) // mixeduser2 error
        .mockResolvedValueOnce(true) // mixeduser3 taken
        .mockResolvedValueOnce(false); // mixeduser4 available

      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result).toBe('mixeduser4');
      expect(mockUserRepository.isUsernameTaken).toHaveBeenCalledTimes(3);
    });

    it('should ensure timestamp fallback is unique', async () => {
      const baseUsername = 'uniqueuser';
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);

      const result1 =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);
      await new Promise((resolve) => setTimeout(resolve, 1)); // Small delay
      const result2 =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result1).not.toBe(result2);
      expect(result1).toMatch(new RegExp(`^${baseUsername}\\d+$`));
      expect(result2).toMatch(new RegExp(`^${baseUsername}\\d+$`));
    });

    it('should handle empty base username', async () => {
      const baseUsername = '';
      mockUserRepository.isUsernameTaken.mockResolvedValue(true);

      const result =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(result).toMatch(/^\d+$/); // Should be just the timestamp
    });
  });

  describe('integration scenarios', () => {
    it('should work correctly in realistic scenario with some taken usernames', async () => {
      const baseUsername = 'johndoe';

      // Simulate realistic scenario: johndoe2, johndoe3 taken, johndoe4 available
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(true) // johndoe2 taken
        .mockResolvedValueOnce(true) // johndoe3 taken
        .mockResolvedValueOnce(false); // johndoe4 available

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        baseUsername,
        1
      );

      // Reset mocks for getFirstAvailable call
      mockUserRepository.isUsernameTaken.mockClear();
      mockUserRepository.isUsernameTaken
        .mockResolvedValueOnce(true) // johndoe2 taken
        .mockResolvedValueOnce(true) // johndoe3 taken
        .mockResolvedValueOnce(false); // johndoe4 available

      const firstAvailableCall =
        await usernameSuggestionsUtil.getFirstAvailable(baseUsername);

      expect(suggestions).toEqual(['johndoe4']);
      expect(firstAvailableCall).toBe('johndoe4');
    });

    it('should handle high-contention username scenario', async () => {
      const popularUsername = 'admin';

      // Simulate all numbered variants are taken up to a certain point
      const mockResponses = Array(50).fill(true).concat([false]); // 51st attempt succeeds
      mockUserRepository.isUsernameTaken.mockImplementation(() => {
        const response = mockResponses.shift();
        return Promise.resolve(response ?? false);
      });

      const suggestions = await usernameSuggestionsUtil.generateSuggestions(
        popularUsername,
        1
      );

      expect(suggestions).toEqual(['admin52']); // Should find admin52 as available
    });

    // Removed over-test: performance/concurrency belongs to benchmarks/integration
  });
});
