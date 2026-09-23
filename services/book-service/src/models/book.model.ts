import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const bookSchema = new Schema(
  {
    isbn: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    genre: { type: String, trim: true },
    totalCopies: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    // Rejects a save if the document changed since it was read (e.g. a concurrent borrow).
    optimisticConcurrency: true,
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

bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });

export type Book = InferSchemaType<typeof bookSchema>;
export type BookDocument = HydratedDocument<Book>;

export const BookModel = model('Book', bookSchema);
