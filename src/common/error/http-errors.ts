export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Username already exists') {
    super(409, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Invalid credentials') {
    super(401, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

export class ResponseValidationError extends HttpError {
  constructor(message = 'Internal Server Error') {
    super(500, message);
    this.name = 'ResponseValidationError';
  }
}

export class RequestValidationError extends HttpError {
  constructor(message = 'Invalid request') {
    super(400, message);
    this.name = 'RequestValidationError';
  }
}
