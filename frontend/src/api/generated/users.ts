// Generated from the users service's OpenAPI document by scripts/generate-api-types.ts.
// Do not edit by hand: run `npm run api:generate -w @library/web`.

export interface paths {
  '/api/auth/register': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Sign up as a member
     * @description Creates a member account and logs it in.
     */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['Register'];
        };
      };
      responses: {
        /** @description The new member and an access token */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['AuthResult'];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description An account with this email already exists */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Too many attempts from this IP. Try again in a minute. */
        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/auth/login': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Log in */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['Login'];
        };
      };
      responses: {
        /** @description The member and an access token */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['AuthResult'];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Invalid email or password */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Too many attempts from this IP. Try again in a minute. */
        429: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/auth/me': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get the logged-in account */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The account */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['User'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/.well-known/jwks.json': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Public keys for verifying tokens
     * @description Other services use these to check that a token was issued by user-service.
     */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description JSON Web Key Set */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['JsonWebKeySet'];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/users': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List members */
    get: {
      parameters: {
        query?: {
          /** @description Matches name, email or membership ID, ignoring case */
          search?: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Members sorted by name */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['User'][];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: librarians only */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    put?: never;
    /** Create an account (as a librarian) */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['CreateUser'];
        };
      };
      responses: {
        /** @description The new member, with a generated membership ID */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['User'];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: librarians only */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description A member with this email already exists */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/users/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a member */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description User ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The member */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['User'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: the member themselves, or any librarian */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Member not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    put?: never;
    post?: never;
    /**
     * Delete a member
     * @description Loan history is kept. Members with books still on loan cannot be deleted.
     */
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description User ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Deleted */
        204: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: librarians only */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Member not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description The member still has books on loan */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    options?: never;
    head?: never;
    /** Update a member's name or email */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description User ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['UpdateUser'];
        };
      };
      responses: {
        /** @description The updated member */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['User'];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: the member themselves, or any librarian */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Member not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Another member has this email */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    trace?: never;
  };
  '/api/users/{id}/loans': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List a member's loans */
    get: {
      parameters: {
        query?: {
          /** @description overdue = active loans past their due date */
          status?: 'active' | 'returned' | 'overdue';
        };
        header?: never;
        path: {
          /** @description User ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Loans, most recent first */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Loan'][];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: the member themselves, or any librarian */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Member not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    put?: never;
    /**
     * Borrow a book
     * @description Takes a copy from book-service, then records the loan. If recording fails, the copy is handed back.
     */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description User ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['BorrowBook'];
        };
      };
      responses: {
        /** @description The new loan */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Loan'];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: the member themselves, or any librarian */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Member or book not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description The member already has this book on loan, or no copies are available */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description book-service sent an unexpected response */
        502: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description book-service could not be reached. Nothing was changed. */
        503: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/users/{id}/loans/{loanId}/return': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Return a loan
     * @description Closes the loan, then puts the copy back in book-service. If that fails, the loan is reopened so it can be retried.
     */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description User ID */
          id: string;
          /** @description Loan ID */
          loanId: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The returned loan */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Loan'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: the member themselves, or any librarian */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Loan not found for this member */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description The loan has already been returned */
        409: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description book-service sent an unexpected response */
        502: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description book-service could not be reached. Nothing was changed. */
        503: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/loans': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List loans across all members
     * @description Use ?status=overdue for the librarian view of late books.
     */
    get: {
      parameters: {
        query?: {
          /** @description overdue = active loans past their due date */
          status?: 'active' | 'returned' | 'overdue';
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Loans, most recent first */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Loan'][];
          };
        };
        /** @description Invalid input */
        400: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Missing, invalid or expired token */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Not allowed: librarians only */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Liveness check */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The process is running */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/health/ready': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Readiness check */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Ready: the database is reachable */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
        /** @description Not ready: the database is unreachable */
        503: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    Register: {
      /** @example Ada Lovelace */
      name: string;
      /**
       * @description Unique, stored in lowercase
       * @example ada@example.com
       */
      email: string;
      /** @example correct horse battery staple */
      password: string;
    };
    Login: {
      /**
       * @description Unique, stored in lowercase
       * @example ada@example.com
       */
      email: string;
      password: string;
    };
    /** @description The membership ID is generated by the service and cannot be chosen. */
    CreateUser: {
      /** @example Ada Lovelace */
      name: string;
      /**
       * @description Unique, stored in lowercase
       * @example ada@example.com
       */
      email: string;
      /** @example correct horse battery staple */
      password: string;
      /**
       * @default member
       * @enum {string}
       */
      role: 'member' | 'librarian';
    };
    /** @description Send only the fields to change (at least one). */
    UpdateUser: {
      /** @example Ada Lovelace */
      name?: string;
      /**
       * @description Unique, stored in lowercase
       * @example ada@example.com
       */
      email?: string;
    };
    /** @description The book title is fetched from book-service, not sent by the client. */
    BorrowBook: {
      /**
       * @description ID of a book in book-service
       * @example 6ab476e7fd279464c59b87b6
       */
      bookId: string;
    };
    AuthResult: {
      user: components['schemas']['User'];
      /** @description Send as "Authorization: Bearer <token>" */
      accessToken: string;
      /** @constant */
      tokenType: 'Bearer';
      /**
       * @description Seconds until the token expires
       * @example 900
       */
      expiresIn: number;
    };
    User: {
      /** @example 6ab476e7c288167098513c7b */
      id: string;
      /** @example Ada Lovelace */
      name: string;
      /** @example ada@example.com */
      email: string;
      /** @example MBR-64760B5F */
      membershipId: string;
      /** @enum {string} */
      role: 'member' | 'librarian';
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
    };
    Error: {
      error: {
        /** @example Validation failed */
        message: string;
        /**
         * @example [
         *       {
         *         "path": "email",
         *         "message": "Email must be a valid email address"
         *       }
         *     ]
         */
        details?: {
          path: string;
          message: string;
        }[];
      };
    };
    JsonWebKeySet: {
      keys: {
        [key: string]: string;
      }[];
    };
    Loan: {
      /** @example 6ab476e7c288167098513c7b */
      id: string;
      /** @example 6ab476e7c288167098513c7b */
      userId: string;
      /** @example 6ab476e7fd279464c59b87b6 */
      bookId: string;
      /**
       * @description Copied from book-service when the book was borrowed
       * @example The Pragmatic Programmer
       */
      bookTitle: string;
      /** @enum {string} */
      status: 'active' | 'returned';
      /** @description Active and past its due date */
      overdue: boolean;
      /** Format: date-time */
      borrowedAt: string;
      /** Format: date-time */
      dueAt: string;
      returnedAt: string | null;
      /** Format: date-time */
      createdAt: string;
      /** Format: date-time */
      updatedAt: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
