export abstract class IPasswordStrategy {
  abstract hash(password: string): Promise<string>;
  abstract verify(password: string, hash: string): Promise<boolean>;
}
