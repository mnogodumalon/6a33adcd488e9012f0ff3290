import type { RaeumeUndOrte, Kurstermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface RaeumeUndOrteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: RaeumeUndOrte;
  /** 1:N „Kurstermine" (raum): VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine?: () => void;
}

export function RaeumeUndOrteDetails({
  record,
  kurstermineList,
  onOpenKurstermine,
  onAddKurstermine,
}: RaeumeUndOrteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('raeume_und_orte', 'raumname')} value={record.fields.raumname} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'stadt')} value={record.fields.stadt} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'kapazitaet')} value={record.fields.kapazitaet} format="text" />
        <RecordField label={fieldLabel('raeume_und_orte', 'ausstattung')} value={record.fields.ausstattung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('raeume_und_orte', 'raum_typ')} value={record.fields.raum_typ} format="pill" />
        <RecordField label={fieldLabel('raeume_und_orte', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('raeume_und_orte', 'online_raum')} value={record.fields.online_raum} format="pill" />
        <RecordField label={fieldLabel('raeume_und_orte', 'online_link')} value={record.fields.online_link} format="url" />
        <RecordField label={fieldLabel('raeume_und_orte', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kurstermine')}
        items={kurstermineList.filter(r => extractRecordId(r.fields.raum) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? appLabel('kurstermine'), meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.RAEUME_UND_ORTE} recordId={record.record_id} readOnly={!perms.canWrite('raeume_und_orte')} />
    </>
  );
}
