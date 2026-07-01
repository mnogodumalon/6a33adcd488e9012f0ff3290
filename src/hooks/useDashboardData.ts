import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RaeumeUndOrte, Trainer, Kurse, Anmeldungen, Teilnehmer, Kurstermine } from '@/types/app';
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
  const [raeumeUndOrte, setRaeumeUndOrte] = useState<RaeumeUndOrte[]>([]);
  const [trainer, setTrainer] = useState<Trainer[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [kurstermine, setKurstermine] = useState<Kurstermine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [raeumeUndOrteData, trainerData, kurseData, anmeldungenData, teilnehmerData, kurstermineData] = await Promise.all([
        LivingAppsService.getRaeumeUndOrte(),
        LivingAppsService.getTrainer(),
        LivingAppsService.getKurse(),
        LivingAppsService.getAnmeldungen(),
        LivingAppsService.getTeilnehmer(),
        LivingAppsService.getKurstermine(),
      ]);
      setRaeumeUndOrte(raeumeUndOrteData);
      setTrainer(trainerData);
      setKurse(kurseData);
      setAnmeldungen(anmeldungenData);
      setTeilnehmer(teilnehmerData);
      setKurstermine(kurstermineData);
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
        const [raeumeUndOrteData, trainerData, kurseData, anmeldungenData, teilnehmerData, kurstermineData] = await Promise.all([
          LivingAppsService.getRaeumeUndOrte(),
          LivingAppsService.getTrainer(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getKurstermine(),
        ]);
        setRaeumeUndOrte(raeumeUndOrteData);
        setTrainer(trainerData);
        setKurse(kurseData);
        setAnmeldungen(anmeldungenData);
        setTeilnehmer(teilnehmerData);
        setKurstermine(kurstermineData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const raeumeUndOrteMap = useMemo(() => {
    const m = new Map<string, RaeumeUndOrte>();
    raeumeUndOrte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [raeumeUndOrte]);

  const trainerMap = useMemo(() => {
    const m = new Map<string, Trainer>();
    trainer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [trainer]);

  const kurseMap = useMemo(() => {
    const m = new Map<string, Kurse>();
    kurse.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kurse]);

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

  return { raeumeUndOrte, setRaeumeUndOrte, trainer, setTrainer, kurse, setKurse, anmeldungen, setAnmeldungen, teilnehmer, setTeilnehmer, kurstermine, setKurstermine, loading, error, fetchAll, raeumeUndOrteMap, trainerMap, kurseMap, teilnehmerMap, kurstermineMap };
}