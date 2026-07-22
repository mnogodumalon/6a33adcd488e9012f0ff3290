import type { Anmeldungen, Kurstermine } from './app';

export type EnrichedKurstermine = Kurstermine & {
  raumName: string;
  kursName: string;
  trainerName: string;
};

export type EnrichedAnmeldungen = Anmeldungen & {
  kursterminName: string;
  kursName: string;
  teilnehmerName: string;
};
