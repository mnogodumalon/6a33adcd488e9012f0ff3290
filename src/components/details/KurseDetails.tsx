import type { Kurse, Kurstermine, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KurseDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kurse;
  /** 1:N „Kurstermine": VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine: () => void;
  /** 1:N „Anmeldungen": VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen: () => void;
}

export function KurseDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  onAddKurstermine,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: KurseDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Kurstitel" value={record.fields.kurstitel} format="text" />
        <RecordField label="Kurzbeschreibung" value={record.fields.kurzbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Detaillierte Beschreibung" value={record.fields.detaillierte_beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Dauer (Anzahl)" value={record.fields.dauer_anzahl} format="text" />
        <RecordField label="Dauer (Einheit)" value={record.fields.dauer_einheit} format="pill" />
        <RecordField label="Zielgruppe" value={record.fields.zielgruppe} format="text" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_teilnehmer} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
      </RecordSection>

      <SatelliteSection
        title="Kurstermine"
        items={kurstermineList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? 'Kurstermine', meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title="Anmeldungen"
        items={anmeldungenList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: 'Anmeldungen', meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSE} recordId={record.record_id} />
    </>
  );
}
