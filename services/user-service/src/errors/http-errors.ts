export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}

// A service this one depends on returned an unexpected response.
export class BadGatewayError extends HttpError {
  constructor(message: string) {
    super(502, message);
  }
}

// A service this one depends on could not be reached.
export class ServiceUnavailableError extends HttpError {
  constructor(message: string) {
    super(503, message);
  }
}
