export const PASSWORD_STRATEGY = Symbol('IPasswordStrategy');

export interface IPasswordStrategy {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
