import type { Teilnehmer, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface TeilnehmerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Teilnehmer;
  /** 1:N „Anmeldungen" (teilnehmer): VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen?: () => void;
}

export function TeilnehmerDetails({
  record,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: TeilnehmerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilnehmer', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('teilnehmer', 'firma_abteilung')} value={record.fields.firma_abteilung} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'rolle')} value={record.fields.rolle} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'aktiv_status')} value={record.fields.aktiv_status} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('anmeldungen')}
        items={anmeldungenList.filter(r => extractRecordId(r.fields.teilnehmer) === record.record_id)}
        map={r => ({ name: appLabel('anmeldungen'), meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TEILNEHMER} recordId={record.record_id} readOnly={!perms.canWrite('teilnehmer')} />
    </>
  );
}
