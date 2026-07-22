import type { Kurstermine, RaeumeUndOrte, Kurse, Trainer, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KurstermineDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kurstermine;
  /** N:1-Ziel „RaeumeUndOrte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  raeumeUndOrteList: RaeumeUndOrte[];
  /** Klick auf die RaeumeUndOrte-Relation → overlay.push auf dessen Detail. */
  onOpenRaeumeUndOrte?: (record: RaeumeUndOrte) => void;
  /** N:1-Ziel „Kurse": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kurseList: Kurse[];
  /** Klick auf die Kurse-Relation → overlay.push auf dessen Detail. */
  onOpenKurse?: (record: Kurse) => void;
  /** N:1-Ziel „Trainer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  trainerList: Trainer[];
  /** Klick auf die Trainer-Relation → overlay.push auf dessen Detail. */
  onOpenTrainer?: (record: Trainer) => void;
  /** 1:N „Anmeldungen": VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen: () => void;
}

export function KurstermineDetails({
  record,
  raeumeUndOrteList,
  onOpenRaeumeUndOrte,
  kurseList,
  onOpenKurse,
  trainerList,
  onOpenTrainer,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: KurstermineDetailsProps) {
  const raumTarget = raeumeUndOrteList.find(r => r.record_id === extractRecordId(record.fields.raum));
  const kursTarget = kurseList.find(r => r.record_id === extractRecordId(record.fields.kurs));
  const trainerTarget = trainerList.find(r => r.record_id === extractRecordId(record.fields.trainer));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Startdatum und -uhrzeit" value={record.fields.startdatum} format="datetime" />
        <RecordField label="Enddatum und -uhrzeit" value={record.fields.enddatum} format="datetime" />
        <RecordField label="Ort (Freitext)" value={record.fields.ort} format="text" />
        <RecordField label="Online-Link" value={record.fields.online_link} format="url" />
        <RecordField label="Anmeldefrist" value={record.fields.anmeldefrist} format="date" />
        <RecordField label="Maximale Teilnehmerzahl (abweichend vom Kurs)" value={record.fields.max_teilnehmer_abweichend} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={2}>
        <RecordRelation
          label="Raum/Ort"
          name={raumTarget?.fields.raumname ?? '—'}
          meta={[raumTarget?.fields.strasse, raumTarget?.fields.hausnummer].filter(Boolean).join(' · ') || undefined}
          onClick={raumTarget && onOpenRaeumeUndOrte ? () => onOpenRaeumeUndOrte!(raumTarget!) : undefined}
        />
        <RecordRelation
          label="Kurs"
          name={kursTarget?.fields.kurstitel ?? '—'}
          meta={[kursTarget?.fields.zielgruppe].filter(Boolean).join(' · ') || undefined}
          onClick={kursTarget && onOpenKurse ? () => onOpenKurse!(kursTarget!) : undefined}
        />
        <RecordRelation
          label="Trainer"
          name={trainerTarget?.fields.vorname ?? '—'}
          meta={[trainerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={trainerTarget && onOpenTrainer ? () => onOpenTrainer!(trainerTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title="Anmeldungen"
        items={anmeldungenList.filter(r => extractRecordId(r.fields.kurstermin) === record.record_id)}
        map={r => ({ name: 'Anmeldungen', meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSTERMINE} recordId={record.record_id} />
    </>
  );
}
