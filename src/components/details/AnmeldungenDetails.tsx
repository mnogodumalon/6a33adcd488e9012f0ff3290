import type { Anmeldungen, Kurstermine, Kurse, Teilnehmer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface AnmeldungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anmeldungen;
  /** N:1-Ziel „Kurstermine": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kurstermineList: Kurstermine[];
  /** Klick auf die Kurstermine-Relation → overlay.push auf dessen Detail. */
  onOpenKurstermine?: (record: Kurstermine) => void;
  /** N:1-Ziel „Kurse": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kurseList: Kurse[];
  /** Klick auf die Kurse-Relation → overlay.push auf dessen Detail. */
  onOpenKurse?: (record: Kurse) => void;
  /** N:1-Ziel „Teilnehmer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  teilnehmerList: Teilnehmer[];
  /** Klick auf die Teilnehmer-Relation → overlay.push auf dessen Detail. */
  onOpenTeilnehmer?: (record: Teilnehmer) => void;
}

export function AnmeldungenDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  kurseList,
  onOpenKurse,
  teilnehmerList,
  onOpenTeilnehmer,
}: AnmeldungenDetailsProps) {
  const kursterminTarget = kurstermineList.find(r => r.record_id === extractRecordId(record.fields.kurstermin));
  const kursTarget = kurseList.find(r => r.record_id === extractRecordId(record.fields.kurs));
  const teilnehmerTarget = teilnehmerList.find(r => r.record_id === extractRecordId(record.fields.teilnehmer));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Anmeldedatum" value={record.fields.anmeldedatum} format="datetime" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={2}>
        <RecordRelation
          label="Kurstermin"
          name={kursterminTarget?.fields.ort ?? '—'}
          meta={undefined}
          onClick={kursterminTarget && onOpenKurstermine ? () => onOpenKurstermine!(kursterminTarget!) : undefined}
        />
        <RecordRelation
          label="Kurs"
          name={kursTarget?.fields.kurstitel ?? '—'}
          meta={[kursTarget?.fields.zielgruppe].filter(Boolean).join(' · ') || undefined}
          onClick={kursTarget && onOpenKurse ? () => onOpenKurse!(kursTarget!) : undefined}
        />
        <RecordRelation
          label="Teilnehmer"
          name={teilnehmerTarget?.fields.vorname ?? '—'}
          meta={[teilnehmerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={teilnehmerTarget && onOpenTeilnehmer ? () => onOpenTeilnehmer!(teilnehmerTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} />
    </>
  );
}
