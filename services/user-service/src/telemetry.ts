import { metrics } from '@opentelemetry/api';

// Business metrics, alongside the automatic request metrics. Without OpenTelemetry
// configured (tests, plain runs) these are no-ops and cost nothing.

const meter = metrics.getMeter('user-service');

export const loanMetrics = {
  borrowed: meter.createCounter('library.loans.borrowed', {
    description: 'Books borrowed',
    unit: '{loan}',
  }),
  returned: meter.createCounter('library.loans.returned', {
    description: 'Books returned',
    unit: '{loan}',
  }),
  // A borrow that failed after book-service had already taken a copy, so the copy was
  // handed back. A rise here means the two services are having trouble.
  compensations: meter.createCounter('library.loans.compensations', {
    description: 'Borrows undone because the loan could not be recorded',
    unit: '{loan}',
  }),
};
