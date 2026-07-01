import type { Anmeldungen, Kurstermine } from './app';

export type EnrichedAnmeldungen = Anmeldungen & {
  kursterminName: string;
  kursName: string;
  teilnehmerName: string;
};

export type EnrichedKurstermine = Kurstermine & {
  raumName: string;
  kursName: string;
  trainerName: string;
};
