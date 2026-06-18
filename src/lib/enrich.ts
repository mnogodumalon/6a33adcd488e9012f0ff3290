import type { EnrichedAnmeldungen, EnrichedKurstermine } from '@/types/enriched';
import type { Anmeldungen, Kurse, Kurstermine, Teilnehmer, Trainer } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface KurstermineMaps {
  kurseMap: Map<string, Kurse>;
  trainerMap: Map<string, Trainer>;
}

export function enrichKurstermine(
  kurstermine: Kurstermine[],
  maps: KurstermineMaps
): EnrichedKurstermine[] {
  return kurstermine.map(r => ({
    ...r,
    kursName: resolveDisplay(r.fields.kurs, maps.kurseMap, 'kurstitel'),
    trainerName: resolveDisplay(r.fields.trainer, maps.trainerMap, 'vorname', 'nachname'),
  }));
}

interface AnmeldungenMaps {
  kurstermineMap: Map<string, Kurstermine>;
  kurseMap: Map<string, Kurse>;
  teilnehmerMap: Map<string, Teilnehmer>;
}

export function enrichAnmeldungen(
  anmeldungen: Anmeldungen[],
  maps: AnmeldungenMaps
): EnrichedAnmeldungen[] {
  return anmeldungen.map(r => ({
    ...r,
    kursterminName: resolveDisplay(r.fields.kurstermin, maps.kurstermineMap, 'ort'),
    kursName: resolveDisplay(r.fields.kurs, maps.kurseMap, 'kurstitel'),
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.teilnehmerMap, 'vorname', 'nachname'),
  }));
}
