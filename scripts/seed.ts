// Fills the catalogue with sample books, through the API as the librarian, so a fresh
// install has something to browse. Safe to run more than once: books that already
// exist (same ISBN) are skipped.
//
//   npm run docker:up
//   npm run seed

const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:8000';
const email = process.env.BOOTSTRAP_LIBRARIAN_EMAIL;
const password = process.env.BOOTSTRAP_LIBRARIAN_PASSWORD;

if (!email || !password) {
  console.error(
    'Set BOOTSTRAP_LIBRARIAN_EMAIL and BOOTSTRAP_LIBRARIAN_PASSWORD (see .env.example).',
  );
  process.exit(1);
}

const books = [
  {
    isbn: '9780135957059',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    genre: 'Software',
    totalCopies: 3,
  },
  {
    isbn: '9780132350884',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    genre: 'Software',
    totalCopies: 2,
  },
  {
    isbn: '9781449373320',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    genre: 'Data',
    totalCopies: 2,
  },
  {
    isbn: '9780134757599',
    title: 'Refactoring',
    author: 'Martin Fowler',
    genre: 'Software',
    totalCopies: 1,
  },
  {
    isbn: '9781492040347',
    title: 'Accelerate',
    author: 'Nicole Forsgren, Jez Humble, Gene Kim',
    genre: 'DevOps',
    totalCopies: 2,
  },
  {
    isbn: '9781942788294',
    title: 'The Phoenix Project',
    author: 'Gene Kim, Kevin Behr, George Spafford',
    genre: 'DevOps',
    totalCopies: 3,
  },
  {
    isbn: '9781492034025',
    title: 'Site Reliability Engineering',
    author: 'Betsy Beyer et al.',
    genre: 'DevOps',
    totalCopies: 1,
  },
  {
    isbn: '9781098107963',
    title: 'Fundamentals of Data Engineering',
    author: 'Joe Reis, Matt Housley',
    genre: 'Data',
    totalCopies: 2,
  },
  {
    isbn: '9781098103835',
    title: 'Designing Machine Learning Systems',
    author: 'Chip Huyen',
    genre: 'Machine learning',
    totalCopies: 2,
  },
  {
    isbn: '9780262046305',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen et al.',
    genre: 'Computer science',
    totalCopies: 1,
  },
  {
    isbn: '9780141439518',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Fiction',
    totalCopies: 2,
  },
  {
    isbn: '9780451524935',
    title: '1984',
    author: 'George Orwell',
    genre: 'Fiction',
    totalCopies: 3,
  },
];

const login = await fetch(`${GATEWAY}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) {
  console.error(`Librarian login failed (${login.status}). Is the stack running? Check .env.`);
  process.exit(1);
}
const { accessToken } = (await login.json()) as { accessToken: string };

let added = 0;
for (const book of books) {
  const res = await fetch(`${GATEWAY}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(book),
  });
  if (res.status === 201) {
    added++;
    console.log(`added    ${book.title}`);
  } else if (res.status === 409) {
    console.log(`exists   ${book.title}`);
  } else {
    console.error(`failed   ${book.title}: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
  }
}

console.log(`\n${added} book(s) added, ${books.length - added} already there or failed.`);
