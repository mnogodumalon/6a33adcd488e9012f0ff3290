import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Trainer, Teilnehmer, RaeumeUndOrte, Kurstermine, Kurse, Anmeldungen } from '@/types/app';
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
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [raeumeUndOrte, setRaeumeUndOrte] = useState<RaeumeUndOrte[]>([]);
  const [kurstermine, setKurstermine] = useState<Kurstermine[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [trainerData, teilnehmerData, raeumeUndOrteData, kurstermineData, kurseData, anmeldungenData] = await Promise.all([
        LivingAppsService.getTrainer(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getRaeumeUndOrte(),
        LivingAppsService.getKurstermine(),
        LivingAppsService.getKurse(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setTrainer(trainerData);
      setTeilnehmer(teilnehmerData);
      setRaeumeUndOrte(raeumeUndOrteData);
      setKurstermine(kurstermineData);
      setKurse(kurseData);
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
        const [trainerData, teilnehmerData, raeumeUndOrteData, kurstermineData, kurseData, anmeldungenData] = await Promise.all([
          LivingAppsService.getTrainer(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeumeUndOrte(),
          LivingAppsService.getKurstermine(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setTrainer(trainerData);
        setTeilnehmer(teilnehmerData);
        setRaeumeUndOrte(raeumeUndOrteData);
        setKurstermine(kurstermineData);
        setKurse(kurseData);
        setAnmeldungen(anmeldungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

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

  const raeumeUndOrteMap = useMemo(() => {
    const m = new Map<string, RaeumeUndOrte>();
    raeumeUndOrte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeumeUndOrte]);

  const kurstermineMap = useMemo(() => {
    const m = new Map<string, Kurstermine>();
    kurstermine.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurstermine]);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

  return { trainer, setTrainer, teilnehmer, setTeilnehmer, raeumeUndOrte, setRaeumeUndOrte, kurstermine, setKurstermine, kurse, setKurse, anmeldungen, setAnmeldungen, loading, error, fetchAll, trainerMap, teilnehmerMap, raeumeUndOrteMap, kurstermineMap, kurseMap };
}