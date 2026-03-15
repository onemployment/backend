import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LocalFileStorageStrategy } from '../local-file-storage.strategy';

describe('LocalFileStorageStrategy', () => {
  let strategy: LocalFileStorageStrategy;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    strategy = new LocalFileStorageStrategy(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('saves buffer to disk and returns storagePath', async () => {
      const buffer = Buffer.from('pdf content');
      const storagePath = await strategy.save(buffer, 'test.pdf');

      expect(storagePath).toBeTruthy();
      const exists = await fs
        .access(storagePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('creates upload directory if it does not exist', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'dir');
      const nestedStrategy = new LocalFileStorageStrategy(nestedDir);
      const buffer = Buffer.from('content');

      const storagePath = await nestedStrategy.save(buffer, 'file.pdf');

      const exists = await fs
        .access(storagePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('read', () => {
    it('reads file and returns buffer', async () => {
      const buffer = Buffer.from('hello pdf');
      const storagePath = await strategy.save(buffer, 'read-test.pdf');

      const result = await strategy.read(storagePath);
      expect(result.toString()).toBe('hello pdf');
    });
  });

  describe('delete', () => {
    it('deletes the file from disk', async () => {
      const buffer = Buffer.from('to be deleted');
      const storagePath = await strategy.save(buffer, 'delete-test.pdf');

      await strategy.delete(storagePath);

      const exists = await fs
        .access(storagePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });
});
