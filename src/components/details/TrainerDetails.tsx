import type { Trainer, Kurstermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface TrainerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Trainer;
  /** 1:N „Kurstermine": VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine: () => void;
}

export function TrainerDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  onAddKurstermine,
}: TrainerDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Vorname" value={record.fields.vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.nachname} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.email} format="email" />
        <RecordField label="Trainer-Typ" value={record.fields.trainer_typ} format="pill" />
        <RecordField label="Fachgebiet(e)" value={record.fields.fachgebiete} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title="Kurstermine"
        items={kurstermineList.filter(r => extractRecordId(r.fields.trainer) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? 'Kurstermine', meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TRAINER} recordId={record.record_id} />
    </>
  );
}
