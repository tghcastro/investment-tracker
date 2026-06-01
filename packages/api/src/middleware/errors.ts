import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { RepoError } from '../repo.js';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class FieldValidationError extends Error {
  constructor(
    public readonly fields: Record<string, string[]>,
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'FieldValidationError';
  }
}

export function zodToFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  return fields;
}

export function validationErrorBody(error: ZodError): {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string[]>;
} {
  const fields = zodToFields(error);
  const message =
    error.issues[0]?.message ?? 'Validation failed';
  return {
    code: 'VALIDATION_ERROR',
    message,
    fields,
  };
}

export function mapRepoError(
  error: RepoError
): { statusCode: number; body: { code: string; message: string } } {
  switch (error.code) {
    case 'FOREIGN_KEY':
    case 'INVALID_ID':
    case 'ARCHIVED_ACCOUNT':
      return { statusCode: 400, body: { code: error.code, message: error.message } };
    case 'HAS_COUPON_PAYMENTS':
    case 'DUPLICATE_QUOTE':
    case 'CURRENCY_IN_USE':
      return {
        statusCode: 409,
        body: { code: 'CONFLICT', message: error.message },
      };
    case 'INVALID_CURRENCY':
    case 'CURRENCY_NOT_ALLOWED':
      return { statusCode: 400, body: { code: error.code, message: error.message } };
    default:
      return { statusCode: 500, body: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(validationErrorBody(error));
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send({
        code: 'CONFLICT',
        message: error.message,
      });
    }

    if (error instanceof FieldValidationError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: error.message,
        fields: error.fields,
      });
    }

    if (error instanceof RepoError) {
      const mapped = mapRepoError(error);
      return reply.status(mapped.statusCode).send(mapped.body);
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 413
    ) {
      return reply.status(413).send({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Uploaded backup file is too large',
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
}
