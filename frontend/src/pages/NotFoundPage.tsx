import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="card empty">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the books</Link>
      </p>
    </div>
  );
}
