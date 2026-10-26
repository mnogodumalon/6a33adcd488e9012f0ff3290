import type { Kurse, Kurstermine, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface KurseDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kurse;
  /** 1:N „Kurstermine" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  kurstermineList: Kurstermine[];
  /** Zeilen-Klick → overlay.push auf das Kurstermine-Detail (nie der Edit-Dialog). */
  onOpenKurstermine: (record: Kurstermine) => void;
  /** Kontextuelles „+": öffnet den Kurstermine-Dialog mit diesem Record vorgesetzt. */
  onAddKurstermine?: () => void;
  /** 1:N „Anmeldungen" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen?: () => void;
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
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kurse', 'kurstitel')} value={record.fields.kurstitel} format="text" />
        <RecordField label={fieldLabel('kurse', 'kurzbeschreibung')} value={record.fields.kurzbeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kurse', 'detaillierte_beschreibung')} value={record.fields.detaillierte_beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kurse', 'kategorie')} value={record.fields.kategorie} format="pill" />
        <RecordField label={fieldLabel('kurse', 'dauer_anzahl')} value={record.fields.dauer_anzahl} format="text" />
        <RecordField label={fieldLabel('kurse', 'dauer_einheit')} value={record.fields.dauer_einheit} format="pill" />
        <RecordField label={fieldLabel('kurse', 'zielgruppe')} value={record.fields.zielgruppe} format="text" />
        <RecordField label={fieldLabel('kurse', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('kurse', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kurstermine')}
        items={kurstermineList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: r.fields.ort ?? appLabel('kurstermine'), meta: r.fields.startdatum })}
        onOpen={onOpenKurstermine}
        onAdd={onAddKurstermine}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('anmeldungen')}
        items={anmeldungenList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: appLabel('anmeldungen'), meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSE} recordId={record.record_id} readOnly={!perms.canWrite('kurse')} />
    </>
  );
}
