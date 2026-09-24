import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const LOAN_STATUSES = ['active', 'returned'] as const;

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The book lives in book-service, so only its id and a snapshot of its title are stored.
    bookId: { type: String, required: true },
    bookTitle: { type: String, required: true },
    status: { type: String, enum: LOAN_STATUSES, required: true, default: 'active' },
    borrowedAt: { type: Date, required: true, default: Date.now },
    dueAt: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    virtuals: {
      overdue: {
        get(this: { status: string; dueAt: Date }) {
          return this.status === 'active' && this.dueAt < new Date();
        },
      },
    },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
  },
);

// A member can have at most one active loan per book. Enforced by the database,
// so it also holds when two borrow requests arrive at the same time.
loanSchema.index(
  { userId: 1, bookId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
loanSchema.index({ status: 1, dueAt: 1 });

export type Loan = InferSchemaType<typeof loanSchema>;
export type LoanDocument = HydratedDocument<Loan>;

export const LoanModel = model('Loan', loanSchema);
