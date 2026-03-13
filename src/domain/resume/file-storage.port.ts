export const FILE_STORAGE = Symbol('IFileStorage');

export interface IFileStorage {
  save(buffer: Buffer, filename: string): Promise<string>; // returns storagePath
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
}
