import { describe, expect, it } from 'vitest';
import { isOnline, waitForOnline } from '../src/bpm/online';

/** Uśpienie, które nie czeka naprawdę, tylko liczy wywołania i zmienia świat. */
function fakeClock(onSleep: (call: number) => void) {
  let calls = 0;
  const sleeps: number[] = [];
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    calls += 1;
    onSleep(calls);
  };
  return { sleep, sleeps };
}

describe('waitForOnline', () => {
  it('wraca od razu, gdy jest sieć', async () => {
    const clock = fakeClock(() => {});
    await waitForOnline(undefined, { isOnline: () => true, sleep: clock.sleep });
    expect(clock.sleeps).toEqual([]);
  });

  it('czeka, aż sieć wróci', async () => {
    let online = false;
    const clock = fakeClock((call) => {
      if (call === 3) online = true;
    });
    await waitForOnline(undefined, { isOnline: () => online, sleep: clock.sleep });
    expect(clock.sleeps).toHaveLength(3);
    expect(clock.sleeps[0]).toBeGreaterThan(0);
  });

  it('przestaje czekać po anulowaniu, nawet bez sieci', async () => {
    const signal = { cancelled: false };
    const clock = fakeClock((call) => {
      if (call === 2) signal.cancelled = true;
    });
    await waitForOnline(signal, { isOnline: () => false, sleep: clock.sleep });
    expect(clock.sleeps).toHaveLength(2);
  });
});

describe('isOnline', () => {
  it('poza przeglądarką, gdzie navigator.onLine nie istnieje, zakłada sieć', () => {
    expect(isOnline()).toBe(true);
  });
});
