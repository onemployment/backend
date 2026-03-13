import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../../domain/user/user.repository.port';

let __lastFallbackTs = 0;
let __fallbackCounter = 0;

@Injectable()
export class UsernameSuggestionsUtil {
  constructor(private readonly userRepository: IUserRepository) {}

  async generateSuggestions(baseUsername: string, count = 3): Promise<string[]> {
    const suggestions: string[] = [];
    let currentNumber = 2;

    while (suggestions.length < count) {
      const suggestion = `${baseUsername}${currentNumber}`;
      const isAvailable = await this.isUsernameAvailable(suggestion);
      if (isAvailable) suggestions.push(suggestion);
      currentNumber++;
      if (currentNumber > 100) break;
    }

    return suggestions;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const isTaken = await this.userRepository.isUsernameTaken(username);
      return !isTaken;
    } catch {
      return false;
    }
  }

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
          const suffix = __fallbackCounter ? `${now}${__fallbackCounter}` : `${now}`;
          return `${baseUsername}${suffix}`;
        })();
  }
}
