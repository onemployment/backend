export const PASSWORD_STRATEGY = Symbol('IPasswordHashStrategy');

export interface IPasswordHashStrategy {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
