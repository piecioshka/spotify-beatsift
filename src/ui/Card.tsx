import type { ReactNode } from 'react';
import './Card.css';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2 className="card__title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function CardRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card__row">
      <span className="text-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
