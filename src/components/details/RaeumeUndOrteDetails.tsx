import type { RaeumeUndOrte, Kurstermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface RaeumeUndOrteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: RaeumeUndOrte;
  /** 1:N „Kurstermine": VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine: () => void;
}

export function RaeumeUndOrteDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  onAddKurstermine,
}: RaeumeUndOrteDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Name des Raums/Orts" value={record.fields.raumname} format="text" />
        <RecordField label="Straße" value={record.fields.strasse} format="text" />
        <RecordField label="Hausnummer" value={record.fields.hausnummer} format="text" />
        <RecordField label="PLZ" value={record.fields.plz} format="text" />
        <RecordField label="Stadt" value={record.fields.stadt} format="text" />
        <RecordField label="Maximale Personenzahl" value={record.fields.kapazitaet} format="text" />
        <RecordField label="Ausstattung" value={record.fields.ausstattung} format="longtext" className="md:col-span-2" />
        <RecordField label="Typ" value={record.fields.raum_typ} format="pill" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Online-Raum" value={record.fields.online_raum} format="pill" />
        <RecordField label="Online-Link" value={record.fields.online_link} format="url" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title="Kurstermine"
        items={kurstermineList.filter(r => extractRecordId(r.fields.raum) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? 'Kurstermine', meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.RAEUME_UND_ORTE} recordId={record.record_id} />
    </>
  );
}
