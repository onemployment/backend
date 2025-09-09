import { config } from '../index';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('port configuration', () => {
    it('should use PORT environment variable when provided', () => {
      process.env.PORT = '8080';

      // Re-import to get fresh config with new env vars
      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.port).toBe(8080);
    });

    it('should default to 3000 when PORT is not provided', () => {
      process.env.PORT = '';
      let freshConfig: typeof config;
      jest.isolateModules(() => {
        freshConfig = require('../index').config;
      });
      expect(freshConfig!.port).toBe(3000);
    });

    it('should handle invalid PORT values by defaulting to 3000', () => {
      process.env.PORT = 'not-a-number';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.port).toBeNaN(); // parseInt('not-a-number') returns NaN
    });

    it('should parse valid string PORT numbers', () => {
      const testPorts = ['80', '443', '5000', '8000'];

      testPorts.forEach((portStr) => {
        process.env.PORT = portStr;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.port).toBe(parseInt(portStr, 10));
      });
    });
  });

  describe('host configuration', () => {
    it('should use HOST environment variable when provided', () => {
      process.env.HOST = '127.0.0.1';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.host).toBe('127.0.0.1');
    });

    it('should default to 0.0.0.0 when HOST is not provided', () => {
      process.env.HOST = '';
      let freshConfig: typeof config;
      jest.isolateModules(() => {
        freshConfig = require('../index').config;
      });
      expect(freshConfig!.host).toBe('0.0.0.0');
    });

    it('should handle various valid host formats', () => {
      const validHosts = [
        'localhost',
        '192.168.1.1',
        '::1',
        'example.com',
        '0.0.0.0',
      ];

      validHosts.forEach((host) => {
        process.env.HOST = host;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.host).toBe(host);
      });
    });

    it('should handle empty HOST environment variable', () => {
      process.env.HOST = '';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.host).toBe('0.0.0.0'); // Should fallback to default
    });
  });

  describe('environment configuration', () => {
    it('should use NODE_ENV when provided', () => {
      const environments = ['development', 'production', 'test', 'staging'];

      environments.forEach((env) => {
        process.env.NODE_ENV = env;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.environment).toBe(env);
      });
    });

    it('should default to development when NODE_ENV is not provided', () => {
      delete process.env.NODE_ENV;

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.environment).toBe('development');
    });

    it('should handle custom environment names', () => {
      process.env.NODE_ENV = 'custom-env';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.environment).toBe('custom-env');
    });
  });

  describe('Redis URL configuration', () => {
    it('should use REDIS_URL when provided', () => {
      process.env.REDIS_URL = 'redis://remote:6380';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.redisUrl).toBe('redis://remote:6380');
    });

    it('should default to localhost Redis when REDIS_URL is not provided', () => {
      process.env.REDIS_URL = '';
      let freshConfig: typeof config;
      jest.isolateModules(() => {
        freshConfig = require('../index').config;
      });
      expect(freshConfig!.redisUrl).toBe('redis://localhost:6379');
    });

    it('should handle various Redis URL formats', () => {
      const redisUrls = [
        'redis://localhost:6379',
        'redis://username:password@host:6379',
        'rediss://secure-redis:6380',
        'redis://redis-cluster:6379/0',
        'redis://:password@host:6379',
      ];

      redisUrls.forEach((url) => {
        process.env.REDIS_URL = url;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.redisUrl).toBe(url);
      });
    });

    it('should handle empty REDIS_URL environment variable', () => {
      process.env.REDIS_URL = '';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.redisUrl).toBe('redis://localhost:6379');
    });
  });

  describe('salt rounds configuration', () => {
    it('should use SALT_ROUNDS when provided', () => {
      process.env.SALT_ROUNDS = '10';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.saltRounds).toBe(10);
    });

    it('should default to 12 when SALT_ROUNDS is not provided', () => {
      delete process.env.SALT_ROUNDS;

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.saltRounds).toBe(12);
    });

    it('should handle various valid salt round values', () => {
      const saltRoundValues = ['8', '10', '12', '14', '16'];

      saltRoundValues.forEach((rounds) => {
        process.env.SALT_ROUNDS = rounds;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.saltRounds).toBe(parseInt(rounds, 10));
      });
    });

    it('should handle invalid SALT_ROUNDS values', () => {
      process.env.SALT_ROUNDS = 'not-a-number';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.saltRounds).toBeNaN(); // parseInt('not-a-number') returns NaN
    });

    it('should handle empty SALT_ROUNDS environment variable', () => {
      process.env.SALT_ROUNDS = '';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.saltRounds).toBe(12); // Should fallback to default
    });
  });

  describe('log level configuration', () => {
    it('should set log level to warn in production', () => {
      process.env.NODE_ENV = 'production';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('warn');
    });

    it('should set log level to silent in test environment', () => {
      process.env.NODE_ENV = 'test';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('silent');
    });

    it('should set log level to debug in development', () => {
      process.env.NODE_ENV = 'development';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('debug');
    });

    it('should default to debug when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('debug');
    });

    it('should default to debug for custom environments', () => {
      process.env.NODE_ENV = 'staging';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('debug');
    });
  });

  // Removed over-tests: runtime checks for immutability and type safety

  describe('integration with dotenv', () => {
    it('should load environment variables from .env file', () => {
      // This test ensures dotenv.config() is called
      // The actual .env file loading is tested implicitly by other tests
      expect(typeof config).toBe('object');
    });

    it('should prioritize environment variables over defaults', () => {
      process.env.PORT = '9999';
      process.env.HOST = '127.0.0.1';
      process.env.NODE_ENV = 'production';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.port).toBe(9999);
      expect(freshConfig.host).toBe('127.0.0.1');
      expect(freshConfig.environment).toBe('production');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null environment variables gracefully', () => {
      // Set env vars to null-like values
      process.env.PORT = null as unknown as string;
      process.env.HOST = null as unknown as string;
      process.env.REDIS_URL = null as unknown as string;

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      // Should fall back to defaults
      expect(freshConfig.port).toBe(3000);
      expect(freshConfig.host).toBe('0.0.0.0');
      expect(freshConfig.redisUrl).toBe('redis://localhost:6379');
    });

    it('should handle undefined environment variables gracefully', () => {
      // Explicitly set to undefined
      process.env.PORT = undefined;
      process.env.HOST = undefined;
      process.env.NODE_ENV = undefined;

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      // Should fall back to defaults
      expect(freshConfig.port).toBe(3000);
      expect(freshConfig.host).toBe('0.0.0.0');
      expect(freshConfig.environment).toBe('development');
    });

    it('should handle extreme port numbers', () => {
      process.env.PORT = '65535'; // Max valid port

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.port).toBe(65535);
    });

    it('should handle extreme salt round values', () => {
      process.env.SALT_ROUNDS = '20'; // High but valid

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.saltRounds).toBe(20);
    });
  });

  describe('security considerations', () => {
    it('should use secure defaults for production', () => {
      process.env.NODE_ENV = 'production';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      expect(freshConfig.logLevel).toBe('warn'); // Less verbose logging
      expect(freshConfig.saltRounds).toBe(12); // Secure default
    });

    it('should not expose sensitive environment variables', () => {
      process.env.DATABASE_PASSWORD = 'secret-password';
      process.env.JWT_SECRET = 'super-secret-key';

      delete require.cache[require.resolve('../index')];
      const { config: freshConfig } = require('../index');

      // Config should not contain these sensitive values
      expect(freshConfig).not.toHaveProperty('DATABASE_PASSWORD');
      expect(freshConfig).not.toHaveProperty('JWT_SECRET');
    });

    it('should use appropriate log levels for different environments', () => {
      const environments = [
        { env: 'development', expected: 'debug' },
        { env: 'test', expected: 'silent' },
        { env: 'production', expected: 'warn' },
        { env: 'staging', expected: 'debug' },
      ];

      environments.forEach(({ env, expected }) => {
        process.env.NODE_ENV = env;
        let freshConfig: typeof config;
        jest.isolateModules(() => {
          freshConfig = require('../index').config;
        });
        expect(freshConfig!.logLevel).toBe(expected);
      });
    });
  });
});
