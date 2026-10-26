import type { Trainer, Kurstermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface TrainerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Trainer;
  /** 1:N „Kurstermine" (trainer): VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine?: () => void;
}

export function TrainerDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  onAddKurstermine,
}: TrainerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('trainer', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('trainer', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('trainer', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('trainer', 'trainer_typ')} value={record.fields.trainer_typ} format="pill" />
        <RecordField label={fieldLabel('trainer', 'fachgebiete')} value={record.fields.fachgebiete} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kurstermine')}
        items={kurstermineList.filter(r => extractRecordId(r.fields.trainer) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? appLabel('kurstermine'), meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TRAINER} recordId={record.record_id} readOnly={!perms.canWrite('trainer')} />
    </>
  );
}
