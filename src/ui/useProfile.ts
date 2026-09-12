import { useEffect, useState } from 'react';
import { fetchProfile, loadCachedProfile, saveProfile, type SpotifyProfile } from '../api/profile';

/**
 * Profil zalogowanego konta: najpierw z cache'u, a gdy go nie ma, z API.
 * Nieudane pobranie zostawia `null`, bo nazwa w nagłówku to dodatek,
 * a nie warunek działania aplikacji.
 */
export function useProfile(): SpotifyProfile | null {
  const [profile, setProfile] = useState<SpotifyProfile | null>(loadCachedProfile);

  useEffect(() => {
    if (profile) return;
    let active = true;

    fetchProfile()
      .then((fresh) => {
        saveProfile(fresh);
        if (active) setProfile(fresh);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [profile]);

  return profile;
}
