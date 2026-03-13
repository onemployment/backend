export class ValidationUtil {
  private static readonly RESERVED_USERNAMES = new Set([
    'admin',
    'api',
    'www',
    'mail',
    'ftp',
    'localhost',
    'root',
    'support',
    'help',
    'info',
    'contact',
    'about',
    'terms',
    'privacy',
    'legal',
    'blog',
    'news',
    'app',
    'mobile',
    'web',
    'test',
    'demo',
    'null',
    'undefined',
    'true',
    'false',
    'onemployment',
    'employment',
    'job',
    'jobs',
    'career',
    'careers',
    'hire',
    'hiring',
    'recruit',
    'recruiting',
  ]);

  // Email validation (toLowerCase transformation)
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Username validation (GitHub pattern: 1-39 chars, alphanumeric + hyphens)
  static validateUsername(username: string): boolean {
    if (!username || username.length < 1 || username.length > 39) {
      return false;
    }

    // GitHub pattern: starts/ends with alphanumeric, can contain hyphens in between
    const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
    return usernameRegex.test(username);
  }

  static isReservedUsername(username: string): boolean {
    return this.RESERVED_USERNAMES.has(username.toLowerCase());
  }

  // Password complexity validation
  static validatePassword(password: string): boolean {
    if (!password || password.length < 8 || password.length > 100) {
      return false;
    }

    // Must contain at least one lowercase, uppercase, and digit
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);

    return hasLowercase && hasUppercase && hasDigit;
  }

  static checkPasswordComplexity(password: string): string[] {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return errors;
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 100) {
      errors.push('Password must be no more than 100 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    return errors;
  }

  // Name validation (letters, spaces, hyphens, apostrophes, dots)
  static validateName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 100) {
      return false;
    }

    // Allow letters, spaces, hyphens, apostrophes, and dots
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    return nameRegex.test(name) && name.trim().length > 0;
  }

  static sanitizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }
}
