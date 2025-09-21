import { createClient, RedisClientType } from 'redis';
import { logger } from '../../common/logger/logger';

export interface RedisClient {
  multi(): RedisMulti;
  hGetAll(key: string): Promise<Record<string, string>>;
  get(key: string): Promise<string | null>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
}

export interface RedisMulti {
  hSet(key: string, mapping: Record<string, string>): RedisMulti;
  set(key: string, value: string): RedisMulti;
  exec(): Promise<unknown[]>;
}

export class RedisClientService implements RedisClient {
  private client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({
      url,
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to Redis successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Failed to connect to Redis:', {
        error: errorMessage,
      });
      throw new Error(`Redis connection failed: ${errorMessage}`);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Disconnected from Redis successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async quit(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client quit successfully');
    } catch (error) {
      logger.error('Failed to quit Redis client:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public multi(): RedisMulti {
    return this.client.multi() as RedisMulti;
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async ping(): Promise<string> {
    return this.client.ping();
  }
}
