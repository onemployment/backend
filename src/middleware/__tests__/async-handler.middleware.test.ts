import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../async-handler.middleware';

describe('asyncHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should wrap async function and call it successfully', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue(undefined);
    const wrappedHandler = asyncHandler(mockAsyncFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should catch async function errors and pass to next', async () => {
    const testError = new Error('Test async error');
    const mockAsyncFn = jest.fn().mockRejectedValue(testError);
    const wrappedHandler = asyncHandler(mockAsyncFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockAsyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it('should not catch synchronous function errors (current behavior)', () => {
    const testError = new Error('Test sync error');
    const mockSyncFn = jest.fn().mockImplementation(() => {
      throw testError;
    });
    const wrappedHandler = asyncHandler(mockSyncFn);

    const call = () =>
      wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
    expect(call).toThrow('Test sync error');

    expect(mockSyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle functions that call next directly', async () => {
    const mockFn = jest.fn().mockImplementation((req, res, next) => {
      next();
    });
    const wrappedHandler = asyncHandler(mockFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should handle functions that return promises that resolve to undefined', async () => {
    const mockFn = jest.fn().mockReturnValue(Promise.resolve(undefined));
    const wrappedHandler = asyncHandler(mockFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle functions that return non-promise values', async () => {
    const mockFn = jest.fn().mockReturnValue('some value');
    const wrappedHandler = asyncHandler(mockFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle undefined return values', async () => {
    const mockFn = jest.fn().mockReturnValue(undefined);
    const wrappedHandler = asyncHandler(mockFn);

    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should preserve the original function context', async () => {
    let receivedReq: Request;
    let receivedRes: Response;
    let receivedNext: NextFunction;

    const mockFn = jest.fn().mockImplementation((req, res, next) => {
      receivedReq = req;
      receivedRes = res;
      receivedNext = next;
    });

    const wrappedHandler = asyncHandler(mockFn);
    await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(receivedReq!).toBe(mockReq);
    expect(receivedRes!).toBe(mockRes);
    expect(receivedNext!).toBe(mockNext);
  });
});
