import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ConsentBanner } from './consent/ConsentBanner';
import { CallbackScreen } from './screens/CallbackScreen';
import { FilterScreen } from './screens/FilterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SyncScreen } from './screens/SyncScreen';
import { AppHeader } from './ui/AppHeader';

/** Ekrany po zalogowaniu dostają wspólny pasek z logo; logowanie ma własny nagłówek. */
function WithHeader() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}

/** Router musi znać podkatalog, w którym żyje strona projektu na GitHub Pages. */
const BASENAME =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/callback" element={<CallbackScreen />} />
        <Route element={<WithHeader />}>
          <Route path="/sync" element={<SyncScreen />} />
          <Route path="/filter" element={<FilterScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ConsentBanner />
    </BrowserRouter>
  );
}
