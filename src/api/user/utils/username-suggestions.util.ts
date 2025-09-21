import { IUserRepository } from '../contracts/user.repository.contract';

// Ensure unique timestamp-based fallbacks even within the same millisecond
let __lastFallbackTs = 0;
let __fallbackCounter = 0;

export class UsernameSuggestionsUtil {
  constructor(private userRepository: IUserRepository) {}

  // Generate sequential numbered suggestions: username → username2, username3, username4
  async generateSuggestions(
    baseUsername: string,
    count: number = 3
  ): Promise<string[]> {
    const suggestions: string[] = [];
    let currentNumber = 2;

    while (suggestions.length < count) {
      const suggestion = `${baseUsername}${currentNumber}`;

      // Check if this suggestion is available
      const isAvailable = await this.isUsernameAvailable(suggestion);
      if (isAvailable) {
        suggestions.push(suggestion);
      }

      currentNumber++;

      // Prevent infinite loop - stop at 100 attempts
      if (currentNumber > 100) {
        break;
      }
    }

    return suggestions;
  }

  // Check availability of a single username (case-insensitive)
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const isTaken = await this.userRepository.isUsernameTaken(username);
      return !isTaken;
    } catch {
      // If there's an error checking availability, assume it's taken for safety
      return false;
    }
  }

  // Get first available suggestion from generated list
  async getFirstAvailable(baseUsername: string): Promise<string> {
    const suggestions = await this.generateSuggestions(baseUsername, 1);
    return suggestions.length > 0
      ? suggestions[0]
      : (() => {
          const now = Date.now();
          if (now === __lastFallbackTs) {
            __fallbackCounter += 1;
          } else {
            __lastFallbackTs = now;
            __fallbackCounter = 0;
          }
          // Append counter only when needed to keep output compact and numeric
          const suffix = __fallbackCounter
            ? `${now}${__fallbackCounter}`
            : `${now}`;
          return `${baseUsername}${suffix}`;
        })();
  }
}
