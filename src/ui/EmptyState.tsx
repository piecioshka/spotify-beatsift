import './EmptyState.css';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__body text-muted">{body}</p>
    </div>
  );
}
