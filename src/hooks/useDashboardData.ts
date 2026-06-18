import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kurse, Trainer, Teilnehmer, Kurstermine, Anmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [kurstermine, setKurstermine] = useState<Kurstermine[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kurseData, trainerData, teilnehmerData, kurstermineData, anmeldungenData] = await Promise.all([
        LivingAppsService.getKurse(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getKurstermine(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setKurse(kurseData);
      setTrainer(trainerData);
      setTeilnehmer(teilnehmerData);
      setKurstermine(kurstermineData);
      setAnmeldungen(anmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kurseData, trainerData, teilnehmerData, kurstermineData, anmeldungenData] = await Promise.all([
          LivingAppsService.getKurse(),
          LivingAppsService.getTrainer(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getKurstermine(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setKurse(kurseData);
        setTrainer(trainerData);
        setTeilnehmer(teilnehmerData);
        setKurstermine(kurstermineData);
        setAnmeldungen(anmeldungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

  const trainerMap = useMemo(() => {
    const m = new Map<string, Trainer>();
    trainer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [trainer]);

  const teilnehmerMap = useMemo(() => {
    const m = new Map<string, Teilnehmer>();
    teilnehmer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [teilnehmer]);

  const kurstermineMap = useMemo(() => {
    const m = new Map<string, Kurstermine>();
    kurstermine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurstermine]);

  return { kurse, setKurse, trainer, setTrainer, teilnehmer, setTeilnehmer, kurstermine, setKurstermine, anmeldungen, setAnmeldungen, loading, error, fetchAll, kurseMap, trainerMap, teilnehmerMap, kurstermineMap };
}