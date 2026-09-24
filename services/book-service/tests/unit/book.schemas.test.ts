import { describe, expect, it } from 'vitest';
import {
  createBookSchema,
  listBooksQuerySchema,
  updateBookSchema,
} from '../../src/schemas/book.schemas.ts';

const validBook = {
  isbn: '978-0-13-595705-9',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  totalCopies: 3,
};

describe('createBookSchema', () => {
  it('accepts a valid book and normalises the ISBN to digits only', () => {
    const result = createBookSchema.parse(validBook);
    expect(result.isbn).toBe('9780135957059');
  });

  it.each([
    ['ISBN-13 without hyphens', '9780135957059', '9780135957059'],
    ['ISBN-13 with spaces', '978 0 13 595705 9', '9780135957059'],
    ['ISBN-10', '0-306-40615-2', '0306406152'],
    ['ISBN-10 ending in lowercase x', '0-8044-2957-x', '080442957X'],
  ])('accepts %s', (_label, isbn, expected) => {
    expect(createBookSchema.parse({ ...validBook, isbn }).isbn).toBe(expected);
  });

  it.each([
    ['too short', '12345'],
    ['too long', '97801359570591'],
    ['letters', 'ABCDEFGHIJ'],
    ['X in an ISBN-13', '978013595705X'],
  ])('rejects an ISBN that is %s', (_label, isbn) => {
    expect(createBookSchema.safeParse({ ...validBook, isbn }).success).toBe(false);
  });

  it('trims text fields', () => {
    const result = createBookSchema.parse({ ...validBook, title: '  Clean Code  ' });
    expect(result.title).toBe('Clean Code');
  });

  it('rejects a title that is only whitespace', () => {
    const result = createBookSchema.safeParse({ ...validBook, title: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Title is required');
  });

  it('treats genre as optional', () => {
    expect(createBookSchema.safeParse(validBook).success).toBe(true);
    expect(createBookSchema.parse({ ...validBook, genre: 'Software' }).genre).toBe('Software');
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['a decimal', 1.5],
    ['a string', '3'],
  ])('rejects totalCopies that is %s', (_label, totalCopies) => {
    expect(createBookSchema.safeParse({ ...validBook, totalCopies }).success).toBe(false);
  });

  it('rejects fields the client must not set', () => {
    const result = createBookSchema.safeParse({ ...validBook, availableCopies: 50 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });

  it('reports every missing required field', () => {
    const result = createBookSchema.safeParse({});
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['isbn', 'title', 'author', 'totalCopies']));
  });
});

describe('updateBookSchema', () => {
  it('accepts a single field', () => {
    expect(updateBookSchema.parse({ title: 'New title' })).toEqual({ title: 'New title' });
  });

  it('rejects an empty update', () => {
    const result = updateBookSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Provide at least one field to update');
  });

  it('applies the same rules as create', () => {
    expect(updateBookSchema.safeParse({ totalCopies: 0 }).success).toBe(false);
    expect(updateBookSchema.parse({ isbn: '978-0-13-595705-9' }).isbn).toBe('9780135957059');
  });
});

describe('listBooksQuerySchema', () => {
  it('converts available=true/false to a boolean', () => {
    expect(listBooksQuerySchema.parse({ available: 'true' }).available).toBe(true);
    expect(listBooksQuerySchema.parse({ available: 'false' }).available).toBe(false);
  });

  it('allows no filters', () => {
    expect(listBooksQuerySchema.parse({})).toEqual({});
  });

  it('rejects an unknown value for available', () => {
    expect(listBooksQuerySchema.safeParse({ available: 'maybe' }).success).toBe(false);
  });
});
