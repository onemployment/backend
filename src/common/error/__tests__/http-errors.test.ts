import {
  HttpError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ResponseValidationError,
  RequestValidationError,
} from '../http-errors';

describe('HTTP Errors', () => {
  describe('HttpError (base class)', () => {
    it('should create error with status and message', () => {
      const error = new HttpError(500, 'Internal Server Error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
      expect(error.name).toBe('Error'); // Inherited from Error
    });

    it('should handle different status codes', () => {
      const errorCodes = [200, 201, 400, 401, 403, 404, 409, 500, 502, 503];

      errorCodes.forEach((status) => {
        const error = new HttpError(status, `Error ${status}`);

        expect(error.status).toBe(status);
        expect(error.message).toBe(`Error ${status}`);
      });
    });

    it('should handle various message formats', () => {
      const messages = [
        'Simple message',
        'Message with numbers 123',
        'Message with special chars !@#$%',
        '',
        'Very long message that contains a lot of information about what went wrong in the application',
      ];

      messages.forEach((message) => {
        const error = new HttpError(500, message);

        expect(error.message).toBe(message);
        expect(error.status).toBe(500);
      });
    });

    it('should maintain Error prototype chain', () => {
      const error = new HttpError(400, 'Test error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error.constructor.name).toBe('HttpError');
    });

    it('should have enumerable status property', () => {
      const error = new HttpError(404, 'Not found');
      const properties = Object.getOwnPropertyDescriptors(error);

      expect(properties.status).toBeDefined();
      expect(properties.status.enumerable).toBe(true);
      expect(properties.status.configurable).toBe(true);
      expect(properties.status.writable).toBe(true);
    });

    it('should work with JSON.stringify', () => {
      const error = new HttpError(500, 'Server error');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.status).toBe(500);
      // Default Error.message is non-enumerable; message is omitted
      expect(parsed.message).toBeUndefined();
    });

    it('should handle edge case status codes', () => {
      const edgeCases = [0, -1, 999, 1000, NaN];

      edgeCases.forEach((status) => {
        const error = new HttpError(status, 'Edge case test');

        expect(error.status).toBe(status);
        expect(error.message).toBe('Edge case test');
      });
    });
  });

  describe('ConflictError', () => {
    it('should create error with default message and 409 status', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.status).toBe(409);
      expect(error.message).toBe('Username already exists');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Email already registered';
      const error = new ConflictError(customMessage);

      expect(error.status).toBe(409);
      expect(error.message).toBe(customMessage);
    });

    it('should handle various conflict scenarios', () => {
      const conflictMessages = [
        'Username already taken',
        'Email already in use',
        'Resource already exists',
        'Duplicate entry detected',
        'Conflict detected',
      ];

      conflictMessages.forEach((message) => {
        const error = new ConflictError(message);

        expect(error.status).toBe(409);
        expect(error.message).toBe(message);
      });
    });

    it('should maintain inheritance hierarchy', () => {
      const error = new ConflictError('Test conflict');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
      expect(error.constructor.name).toBe('ConflictError');
    });

    it('should handle empty string message', () => {
      const error = new ConflictError('');

      expect(error.status).toBe(409);
      expect(error.message).toBe('');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create error with default message and 401 status', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid credentials');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Token expired';
      const error = new UnauthorizedError(customMessage);

      expect(error.status).toBe(401);
      expect(error.message).toBe(customMessage);
    });

    it('should handle various authentication scenarios', () => {
      const authMessages = [
        'Access denied',
        'Invalid token',
        'Session expired',
        'Authentication failed',
        'Insufficient permissions',
        'Login required',
      ];

      authMessages.forEach((message) => {
        const error = new UnauthorizedError(message);

        expect(error.status).toBe(401);
        expect(error.message).toBe(message);
      });
    });

    it('should maintain inheritance hierarchy', () => {
      const error = new UnauthorizedError('Access denied');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof UnauthorizedError).toBe(true);
      expect(error.constructor.name).toBe('UnauthorizedError');
    });
  });

  describe('NotFoundError', () => {
    it('should create error with default message and 404 status', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.status).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create error with custom message', () => {
      const customMessage = 'User not found';
      const error = new NotFoundError(customMessage);

      expect(error.status).toBe(404);
      expect(error.message).toBe(customMessage);
    });

    it('should handle various not found scenarios', () => {
      const notFoundMessages = [
        'Page not found',
        'User not found',
        'File not found',
        'Endpoint not found',
        'Data not found',
        'Record does not exist',
      ];

      notFoundMessages.forEach((message) => {
        const error = new NotFoundError(message);

        expect(error.status).toBe(404);
        expect(error.message).toBe(message);
      });
    });

    it('should maintain inheritance hierarchy', () => {
      const error = new NotFoundError('User not found');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
      expect(error.constructor.name).toBe('NotFoundError');
    });
  });

  describe('BadRequestError', () => {
    it('should create error with default message and 400 status', () => {
      const error = new BadRequestError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Invalid input data';
      const error = new BadRequestError(customMessage);

      expect(error.status).toBe(400);
      expect(error.message).toBe(customMessage);
    });

    it('should handle various bad request scenarios', () => {
      const badRequestMessages = [
        'Invalid input format',
        'Missing required fields',
        'Invalid parameter values',
        'Malformed request body',
        'Invalid query parameters',
        'Request validation failed',
      ];

      badRequestMessages.forEach((message) => {
        const error = new BadRequestError(message);

        expect(error.status).toBe(400);
        expect(error.message).toBe(message);
      });
    });

    it('should maintain inheritance hierarchy', () => {
      const error = new BadRequestError('Invalid data');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof BadRequestError).toBe(true);
      expect(error.constructor.name).toBe('BadRequestError');
    });
  });

  describe('ResponseValidationError', () => {
    it('should create error with default message, 500 status, and custom name', () => {
      const error = new ResponseValidationError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(ResponseValidationError);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Internal Server Error');
      expect(error.name).toBe('ResponseValidationError');
    });

    it('should create error with custom message while keeping custom name', () => {
      const customMessage = 'Response schema validation failed';
      const error = new ResponseValidationError(customMessage);

      expect(error.status).toBe(500);
      expect(error.message).toBe(customMessage);
      expect(error.name).toBe('ResponseValidationError');
    });

    it('should handle various response validation scenarios', () => {
      const validationMessages = [
        'Response does not match schema',
        'Invalid response format',
        'Missing required response fields',
        'Response type mismatch',
        'Serialization failed',
      ];

      validationMessages.forEach((message) => {
        const error = new ResponseValidationError(message);

        expect(error.status).toBe(500);
        expect(error.message).toBe(message);
        expect(error.name).toBe('ResponseValidationError');
      });
    });

    it('should maintain inheritance hierarchy with custom name', () => {
      const error = new ResponseValidationError('Schema error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof ResponseValidationError).toBe(true);
      expect(error.constructor.name).toBe('ResponseValidationError');
      expect(error.name).toBe('ResponseValidationError');
    });

    it('should preserve custom name in error handling', () => {
      const error = new ResponseValidationError('Test error');

      // The name property should be accessible for error handling
      expect(error.name).toBe('ResponseValidationError');
      expect(error.toString()).toContain('ResponseValidationError');
    });
  });

  describe('RequestValidationError', () => {
    it('should create error with default message, 400 status, and custom name', () => {
      const error = new RequestValidationError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(RequestValidationError);
      expect(error.status).toBe(400);
      expect(error.message).toBe('Invalid request');
      expect(error.name).toBe('RequestValidationError');
    });

    it('should create error with custom message while keeping custom name', () => {
      const customMessage = 'Request schema validation failed';
      const error = new RequestValidationError(customMessage);

      expect(error.status).toBe(400);
      expect(error.message).toBe(customMessage);
      expect(error.name).toBe('RequestValidationError');
    });

    it('should handle various request validation scenarios', () => {
      const validationMessages = [
        'Request body validation failed',
        'Invalid JSON format',
        'Missing required fields',
        'Field type mismatch',
        'Validation constraints not met',
        'Schema validation error',
      ];

      validationMessages.forEach((message) => {
        const error = new RequestValidationError(message);

        expect(error.status).toBe(400);
        expect(error.message).toBe(message);
        expect(error.name).toBe('RequestValidationError');
      });
    });

    it('should maintain inheritance hierarchy with custom name', () => {
      const error = new RequestValidationError('Validation failed');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof HttpError).toBe(true);
      expect(error instanceof RequestValidationError).toBe(true);
      expect(error.constructor.name).toBe('RequestValidationError');
      expect(error.name).toBe('RequestValidationError');
    });

    it('should preserve custom name in error handling', () => {
      const error = new RequestValidationError('Test error');

      // The name property should be accessible for error handling
      expect(error.name).toBe('RequestValidationError');
      expect(error.toString()).toContain('RequestValidationError');
    });
  });

  describe('error differentiation and usage patterns', () => {
    it('should allow differentiation between error types using instanceof', () => {
      const conflicts = new ConflictError();
      const unauthorized = new UnauthorizedError();
      const notFound = new NotFoundError();
      const responseValidation = new ResponseValidationError();
      const requestValidation = new RequestValidationError();

      expect(conflicts instanceof ConflictError).toBe(true);
      expect(conflicts instanceof UnauthorizedError).toBe(false);

      expect(unauthorized instanceof UnauthorizedError).toBe(true);
      expect(unauthorized instanceof NotFoundError).toBe(false);

      expect(notFound instanceof NotFoundError).toBe(true);
      expect(notFound instanceof BadRequestError).toBe(false);

      expect(responseValidation instanceof ResponseValidationError).toBe(true);
      expect(responseValidation instanceof RequestValidationError).toBe(false);

      expect(requestValidation instanceof RequestValidationError).toBe(true);
      expect(requestValidation instanceof ResponseValidationError).toBe(false);
    });

    it('should all be instances of HttpError for generic error handling', () => {
      const errors = [
        new ConflictError(),
        new UnauthorizedError(),
        new NotFoundError(),
        new BadRequestError(),
        new ResponseValidationError(),
        new RequestValidationError(),
      ];

      errors.forEach((error) => {
        expect(error instanceof HttpError).toBe(true);
        expect(error).toHaveProperty('status');
        expect(typeof error.status).toBe('number');
      });
    });

    it('should have consistent status codes for HTTP semantics', () => {
      expect(new ConflictError().status).toBe(409);
      expect(new UnauthorizedError().status).toBe(401);
      expect(new NotFoundError().status).toBe(404);
      expect(new BadRequestError().status).toBe(400);
      expect(new ResponseValidationError().status).toBe(500);
      expect(new RequestValidationError().status).toBe(400);
    });

    it('should support error matching by status code', () => {
      const errorsByStatus = {
        400: [new BadRequestError(), new RequestValidationError()],
        401: [new UnauthorizedError()],
        404: [new NotFoundError()],
        409: [new ConflictError()],
        500: [new ResponseValidationError()],
      };

      Object.entries(errorsByStatus).forEach(([status, errors]) => {
        errors.forEach((error) => {
          expect(error.status).toBe(parseInt(status, 10));
        });
      });
    });

    it('should support error matching by name property', () => {
      const responseValidationError = new ResponseValidationError();
      const requestValidationError = new RequestValidationError();
      const genericError = new ConflictError();

      expect(responseValidationError.name).toBe('ResponseValidationError');
      expect(requestValidationError.name).toBe('RequestValidationError');
      expect(genericError.name).toBe('Error'); // Inherits default Error name
    });
  });

  describe('error serialization and debugging', () => {
    it('should serialize properly for logging', () => {
      const error = new ConflictError('Username taken');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.status).toBe(409);
      // message is non-enumerable on Error; not included by default
      expect(parsed.message).toBeUndefined();
    });

    it('should maintain stack traces', () => {
      const error = new UnauthorizedError('Access denied');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      // Default name is 'Error' without custom class name set
      expect(error.stack).toContain('Error');
      expect(error.stack).toContain('Access denied');
    });

    it('should provide useful toString output', () => {
      const error = new NotFoundError('User not found');
      const stringOutput = error.toString();

      expect(stringOutput).toContain('User not found');
      expect(typeof stringOutput).toBe('string');
    });

    it('should handle error comparison', () => {
      const error1 = new ConflictError('Test message');
      const error2 = new ConflictError('Test message');
      const error3 = new ConflictError('Different message');

      expect(error1).not.toBe(error2); // Different instances
      expect(error1.message).toBe(error2.message);
      expect(error1.status).toBe(error2.status);
      expect(error1.message).not.toBe(error3.message);
    });

    it('should work with Error.prototype methods', () => {
      const error = new BadRequestError('Invalid data');

      // Should work with standard Error methods
      expect(error.toString()).toBeDefined();
      expect(error.valueOf()).toBe(error);
      expect(Object.prototype.toString.call(error)).toBe('[object Error]');
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle null and undefined messages gracefully', () => {
      const nullError = new ConflictError(null as unknown as string);
      const undefinedError = new ConflictError(undefined as unknown as string);

      // Error coerces null to string, undefined triggers default constructor message
      expect(nullError.message).toBe('null');
      expect(nullError.status).toBe(409);

      expect(undefinedError.message).toBe('Username already exists');
      expect(undefinedError.status).toBe(409);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error: ' + 'A'.repeat(10000);
      const error = new HttpError(500, longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10007);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Error with 日本語, émojis 🚀, and symbols ♪♫♬';
      const error = new UnauthorizedError(specialMessage);

      expect(error.message).toBe(specialMessage);
    });

    it('should handle numeric message inputs', () => {
      const numericMessage = 12345;
      const error = new BadRequestError(numericMessage as unknown as string);

      // Error coerces message to string
      expect(error.message).toBe(String(numericMessage));
    });

    it('should maintain prototype integrity after instantiation', () => {
      const error = new ResponseValidationError('Test');

      expect(error.constructor).toBe(ResponseValidationError);
      expect(Object.getPrototypeOf(error)).toBe(
        ResponseValidationError.prototype
      );
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
        HttpError.prototype
      );
    });
  });
});
