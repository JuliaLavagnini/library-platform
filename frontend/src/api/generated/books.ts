// Generated from the books service's OpenAPI document by scripts/generate-api-types.ts.
// Do not edit by hand: run `npm run api:generate -w @library/web`.

export interface paths {
  '/api/books': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List books */
    get: {
      parameters: {
        query?: {
          /** @description Matches title or author, ignoring case */
          search?: string;
          /** @description Only books with at least one copy on the shelf */
          available?: 'true' | 'false';
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Books sorted by title */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'][];
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
      };
    };
    put?: never;
    /** Add a book */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['CreateBook'];
        };
      };
      responses: {
        /** @description The new book, with every copy available */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'];
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
        /** @description A book with this ISBN already exists */
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
  '/api/books/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a book */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description Book ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The book */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'];
          };
        };
        /** @description Book not found */
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
    /** Delete a book */
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description Book ID */
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
        /** @description Book not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Copies are on loan */
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
    /** Update some fields of a book */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description Book ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: {
        content: {
          'application/json': components['schemas']['UpdateBook'];
        };
      };
      responses: {
        /** @description The updated book */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'];
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
        /** @description Book not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Duplicate ISBN, total copies below the number on loan, or the book was changed by another request */
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
  '/api/books/{id}/borrow': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Take one copy off the shelf
     * @description Atomic: two requests can never take the same last copy. Normally called by user-service when a member borrows a book.
     */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description Book ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The book with one fewer copy available */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'];
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
        /** @description Not allowed: user-service only (as part of a loan) */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Book not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description No copies are available */
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
  '/api/books/{id}/return': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Put one copy back on the shelf */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description Book ID */
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description The book with one more copy available */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Book'];
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
        /** @description Not allowed: user-service only (as part of a loan) */
        403: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Book not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': components['schemas']['Error'];
          };
        };
        /** @description Every copy is already on the shelf */
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
    CreateBook: {
      /**
       * @description ISBN-10 or ISBN-13. Hyphens and spaces are allowed and removed.
       * @example 978-0-13-595705-9
       */
      isbn: string;
      /** @example The Pragmatic Programmer */
      title: string;
      /** @example David Thomas */
      author: string;
      /** @example Software */
      genre?: string;
      /**
       * @description Copies the library owns. All start on the shelf.
       * @example 3
       */
      totalCopies: number;
    };
    /** @description Send only the fields to change (at least one). Changing totalCopies keeps copies on loan unchanged. */
    UpdateBook: {
      /**
       * @description ISBN-10 or ISBN-13. Hyphens and spaces are allowed and removed.
       * @example 978-0-13-595705-9
       */
      isbn?: string;
      /** @example The Pragmatic Programmer */
      title?: string;
      /** @example David Thomas */
      author?: string;
      /** @example Software */
      genre?: string;
      /**
       * @description Copies the library owns. All start on the shelf.
       * @example 3
       */
      totalCopies?: number;
    };
    Book: {
      /** @example 6ab476e7fd279464c59b87b6 */
      id: string;
      /** @example 9780135957059 */
      isbn: string;
      /** @example The Pragmatic Programmer */
      title: string;
      /** @example David Thomas */
      author: string;
      /** @example Software */
      genre?: string;
      /** @example 3 */
      totalCopies: number;
      /**
       * @description Copies on the shelf
       * @example 2
       */
      availableCopies: number;
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
         *         "path": "title",
         *         "message": "Title is required"
         *       }
         *     ]
         */
        details?: {
          path: string;
          message: string;
        }[];
      };
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
