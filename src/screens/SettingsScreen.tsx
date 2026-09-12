import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { libraryStats } from '../db/queries';
import { resetDatabase } from '../db/schema';
import type { LibraryStats } from '../db/types';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Card, CardRow } from '../ui/Card';
import { tracksCount } from '../ui/plural';
import { usePageTitle } from '../ui/usePageTitle';
import './SettingsScreen.css';

export function SettingsScreen() {
  const t = useT();
  usePageTitle(t('settings.title'));
  const navigate = useNavigate();
  const [stats, setStats] = useState<LibraryStats | null>(null);

  const refresh = useCallback(() => {
    libraryStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  async function confirmReset() {
    if (!window.confirm(t('settings.resetConfirm'))) return;

    await resetDatabase();
    navigate('/sync?full=1', { replace: true });
  }

  return (
    <main className="page settings">
      <h1 className="page__title">{t('settings.title')}</h1>

      {stats ? (
        <Card title={t('settings.library')}>
          <CardRow label={t('settings.fetched')} value={tracksCount(stats.total)} />
          <CardRow label={t('settings.withBpm')} value={stats.withBpm} />
          <CardRow label={t('settings.withYear')} value={stats.withYear} />
          {stats.pending > 0 ? (
            <CardRow label={t('settings.pending')} value={stats.pending} />
          ) : null}
        </Card>
      ) : null}

      <Button
        label={t('settings.checkNew')}
        onClick={() => navigate('/sync', { replace: true })}
        variant="secondary"
      />
      <Button
        label={t('settings.fullSync')}
        onClick={() => navigate('/sync?full=1', { replace: true })}
        variant="secondary"
      />
      <Button label={t('settings.reset')} onClick={confirmReset} variant="secondary" />

      <p className="settings__footnote text-muted text-small">{t('settings.footnote')}</p>
      <p className="text-muted text-small">
        <Link to="/privacy">{t('privacy.link')}</Link>
      </p>
    </main>
  );
}
