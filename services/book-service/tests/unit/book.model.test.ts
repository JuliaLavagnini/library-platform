import { describe, expect, it } from 'vitest';
import { BookModel } from '../../src/models/book.model.ts';

describe('BookModel JSON output', () => {
  it('exposes id instead of _id and hides the version key', () => {
    const book = new BookModel({
      isbn: '9780135957059',
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      totalCopies: 3,
      availableCopies: 3,
    });

    const json = book.toJSON();

    expect(json).toHaveProperty('id', book.id);
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
  });
});
