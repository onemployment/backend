import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileStorage } from '../../domain/resume/file-storage.port';

@Injectable()
export class LocalFileStorageStrategy implements IFileStorage {
  constructor(private readonly uploadDir: string) {}

  async save(buffer: Buffer, filename: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const storagePath = path.join(this.uploadDir, filename);
    await fs.writeFile(storagePath, buffer);
    return storagePath;
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(storagePath);
  }

  async delete(storagePath: string): Promise<void> {
    await fs.unlink(storagePath);
  }
}
