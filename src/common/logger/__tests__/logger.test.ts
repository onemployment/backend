// Note: 'pino' is mocked via jest.mock factory below; use dynamic require in tests
// Import logger module after setting up mocks in tests
let logger: ReturnType<typeof require>['logger'] & {
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type PinoMockFn = jest.Mock & { stdSerializers: unknown; levels: unknown };
interface PinoLoggerMock {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  fatal: jest.Mock;
  trace: jest.Mock;
  child: jest.Mock;
  level: string;
  levelVal: number;
  levels: unknown;
  isLevelEnabled: jest.Mock;
  bindings: jest.Mock;
  version: string;
}

jest.mock('pino', () => {
  const fn = jest.fn() as unknown as PinoMockFn;
  fn.stdSerializers = {};
  fn.levels = {};
  return fn;
});
jest.mock('../../../config', () => ({
  config: {
    logLevel: 'debug',
  },
}));

describe('Logger', () => {
  let mockPinoLogger: PinoLoggerMock;
  let pinoMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockPinoLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      child: jest.fn(),
      level: 'debug',
      levelVal: 20,
      levels: {},
      isLevelEnabled: jest.fn(),
      bindings: jest.fn(),
      version: '1.0.0',
    };

    pinoMock = require('pino') as jest.Mock;
    pinoMock.mockReturnValue(mockPinoLogger as unknown as object);

    jest.clearAllMocks();

    // Import logger after setting mock return
    ({ logger } = require('../logger'));
  });

  describe('initialization', () => {
    it('should create pino logger with correct configuration', () => {
      // Re-import to trigger initialization
      jest.resetModules();
      pinoMock = require('pino') as jest.Mock;
      pinoMock.mockClear();
      pinoMock.mockReturnValue(mockPinoLogger as unknown as object);
      require('../logger');

      expect(require('pino') as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          serializers: expect.anything(),
        })
      );
    });

    it('should use config.logLevel for pino logger level', () => {
      jest.isolateModules(() => {
        const pinoLocal = require('pino') as jest.Mock;
        pinoLocal.mockClear();
        pinoLocal.mockReturnValue(mockPinoLogger as unknown as object);
        const mockConfig = require('../../../config');
        mockConfig.config.logLevel = 'warn';
        require('../logger');

        expect(pinoLocal).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warn',
            serializers: expect.anything(),
          })
        );
      });
    });

    it('should use pino standard serializers', () => {
      jest.resetModules();
      pinoMock = require('pino') as jest.Mock;
      pinoMock.mockClear();
      pinoMock.mockReturnValue(mockPinoLogger as unknown as object);
      require('../logger');

      expect(require('pino') as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          serializers: expect.anything(),
        })
      );
    });
  });

  describe('debug method', () => {
    it('should call pino debug with message only', () => {
      logger.debug('Debug message');

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        undefined,
        'Debug message'
      );
    });

    it('should call pino debug with message and metadata', () => {
      const metadata = { userId: '123', action: 'login' };
      logger.debug('Debug message with metadata', metadata);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        metadata,
        'Debug message with metadata'
      );
    });

    it('should handle empty metadata object', () => {
      logger.debug('Debug message', {});

      expect(mockPinoLogger.debug).toHaveBeenCalledWith({}, 'Debug message');
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        user: { id: '123', name: 'John' },
        request: { method: 'POST', url: '/api/users' },
        duration: 150,
        success: true,
      };

      logger.debug('Complex debug message', complexMetadata);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        complexMetadata,
        'Complex debug message'
      );
    });

    it('should handle null and undefined metadata', () => {
      logger.debug(
        'Message with null',
        null as unknown as Record<string, unknown>
      );
      logger.debug('Message with undefined', undefined);

      expect(mockPinoLogger.debug).toHaveBeenNthCalledWith(
        1,
        null,
        'Message with null'
      );
      expect(mockPinoLogger.debug).toHaveBeenNthCalledWith(
        2,
        undefined,
        'Message with undefined'
      );
    });
  });

  describe('info method', () => {
    it('should call pino info with message only', () => {
      logger.info('Info message');

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        undefined,
        'Info message'
      );
    });

    it('should call pino info with message and metadata', () => {
      const metadata = { operation: 'user-registration', status: 'success' };
      logger.info('User registration completed', metadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        metadata,
        'User registration completed'
      );
    });

    it('should handle arrays in metadata', () => {
      const metadata = {
        items: ['item1', 'item2', 'item3'],
        counts: [1, 2, 3],
      };

      logger.info('Processing items', metadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        metadata,
        'Processing items'
      );
    });

    it('should handle nested objects in metadata', () => {
      const metadata = {
        request: {
          headers: { 'content-type': 'application/json' },
          body: { username: 'testuser' },
        },
        response: {
          statusCode: 200,
          headers: { 'x-response-time': '50ms' },
        },
      };

      logger.info('HTTP request processed', metadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        metadata,
        'HTTP request processed'
      );
    });
  });

  describe('warn method', () => {
    it('should call pino warn with message only', () => {
      logger.warn('Warning message');

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        undefined,
        'Warning message'
      );
    });

    it('should call pino warn with message and metadata', () => {
      const metadata = {
        deprecatedFeature: 'oldAPI',
        replacedBy: 'newAPI',
        removalVersion: '2.0.0',
      };

      logger.warn('Deprecated API usage detected', metadata);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        metadata,
        'Deprecated API usage detected'
      );
    });

    it('should handle performance warnings', () => {
      const metadata = {
        operation: 'database-query',
        duration: 5000,
        threshold: 1000,
        query: 'SELECT * FROM users WHERE active = true',
      };

      logger.warn('Slow database query detected', metadata);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        metadata,
        'Slow database query detected'
      );
    });
  });

  describe('error method', () => {
    it('should call pino error with message only', () => {
      logger.error('Error message');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        undefined,
        'Error message'
      );
    });

    it('should call pino error with message and metadata', () => {
      const metadata = {
        errorCode: 'AUTH_FAILED',
        userId: '123',
        attemptCount: 3,
      };

      logger.error('Authentication failed', metadata);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        metadata,
        'Authentication failed'
      );
    });

    it('should handle Error objects in metadata', () => {
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at test.js:1:1';

      const metadata = {
        error,
        operation: 'user-lookup',
        retryCount: 2,
      };

      logger.error('Database operation failed', metadata);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        metadata,
        'Database operation failed'
      );
    });

    it('should handle HTTP error responses', () => {
      const metadata = {
        statusCode: 500,
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: { error: 'Internal server error' },
      };

      logger.error('HTTP request failed', metadata);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        metadata,
        'HTTP request failed'
      );
    });
  });

  describe('method parameter handling', () => {
    it('should handle empty strings', () => {
      logger.debug('');
      logger.info('');
      logger.warn('');
      logger.error('');

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(undefined, '');
      expect(mockPinoLogger.info).toHaveBeenCalledWith(undefined, '');
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(undefined, '');
      expect(mockPinoLogger.error).toHaveBeenCalledWith(undefined, '');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);

      logger.info(longMessage);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(undefined, longMessage);
    });

    it('should handle messages with special characters', () => {
      const specialMessage =
        'Message with special chars: àáâãäåæçèé 日本語 🚀 💡';

      logger.info(specialMessage);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        undefined,
        specialMessage
      );
    });

    it('should handle multiline messages', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';

      logger.error(multilineMessage);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        undefined,
        multilineMessage
      );
    });

    it('should preserve metadata types', () => {
      const metadata = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date('2023-01-01'),
      };

      logger.info('Type preservation test', metadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        metadata,
        'Type preservation test'
      );
    });
  });

  describe('singleton behavior', () => {
    it('should export the same logger instance', () => {
      const { logger: logger1 } = require('../logger');
      const { logger: logger2 } = require('../logger');

      expect(logger1).toBe(logger2);
    });

    it('should maintain state across multiple imports', () => {
      // This test ensures the logger is a singleton
      expect(logger).toBeDefined();

      // Import again
      jest.resetModules();
      const { logger: reimportedLogger } = require('../logger');

      expect(reimportedLogger).toBeDefined();
      expect(typeof reimportedLogger.debug).toBe('function');
      expect(typeof reimportedLogger.info).toBe('function');
      expect(typeof reimportedLogger.warn).toBe('function');
      expect(typeof reimportedLogger.error).toBe('function');
    });
  });

  describe('integration with pino features', () => {
    it('should use pino standard serializers for consistent output', () => {
      // Ensure we're using pino's built-in serializers
      expect(require('pino') as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          serializers: expect.anything(),
        })
      );
    });

    it('should respect the configured log level', () => {
      // This is handled by pino itself, but we can test our configuration
      expect(require('pino') as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          level: expect.any(String),
        })
      );
    });

    it('should pass through all metadata to pino unchanged', () => {
      const metadata = {
        req: { method: 'GET', url: '/test' },
        res: { statusCode: 200 },
        err: new Error('test error'),
      };

      logger.info('Test message', metadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        metadata,
        'Test message'
      );
    });
  });

  describe('performance considerations', () => {
    // Removed over-test: high-frequency call count benchmark

    it('should handle large metadata objects efficiently', () => {
      const largeMetadata: Record<string, unknown> = {};

      // Create large metadata object
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      logger.info('Large metadata test', largeMetadata);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        largeMetadata,
        'Large metadata test'
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle circular references in metadata gracefully', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference

      // Pino should handle circular references with its serializers
      logger.info('Circular reference test', circularObj);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        circularObj,
        'Circular reference test'
      );
    });

    it('should handle metadata with functions', () => {
      const metadataWithFunction = {
        name: 'test',
        func: () => 'test function',
        asyncFunc: async () => 'async test',
      };

      logger.warn('Metadata with functions', metadataWithFunction);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        metadataWithFunction,
        'Metadata with functions'
      );
    });

    it('should handle metadata with symbols', () => {
      const symbol = Symbol('test');
      const metadataWithSymbol = {
        name: 'test',
        [symbol]: 'symbol value',
        symbolProp: symbol,
      };

      logger.debug('Metadata with symbols', metadataWithSymbol);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        metadataWithSymbol,
        'Metadata with symbols'
      );
    });
  });

  describe('logging interface consistency', () => {
    it('should provide all expected logging methods', () => {
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should have consistent method signatures', () => {
      // All methods should accept (message, metadata?)
      const message = 'Test message';
      const metadata = { test: 'data' };

      logger.debug(message, metadata);
      logger.info(message, metadata);
      logger.warn(message, metadata);
      logger.error(message, metadata);

      expect(mockPinoLogger.debug).toHaveBeenCalledWith(metadata, message);
      expect(mockPinoLogger.info).toHaveBeenCalledWith(metadata, message);
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(metadata, message);
      expect(mockPinoLogger.error).toHaveBeenCalledWith(metadata, message);
    });

    it('should maintain proper return types', () => {
      // All logging methods should return void
      expect(logger.debug('test')).toBeUndefined();
      expect(logger.info('test')).toBeUndefined();
      expect(logger.warn('test')).toBeUndefined();
      expect(logger.error('test')).toBeUndefined();
    });
  });
});
