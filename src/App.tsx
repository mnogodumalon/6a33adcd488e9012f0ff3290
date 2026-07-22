import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import TrainerPage from '@/pages/TrainerPage';
import TrainerDetailPage from '@/pages/TrainerDetailPage';
import TeilnehmerPage from '@/pages/TeilnehmerPage';
import TeilnehmerDetailPage from '@/pages/TeilnehmerDetailPage';
import RaeumeUndOrtePage from '@/pages/RaeumeUndOrtePage';
import RaeumeUndOrteDetailPage from '@/pages/RaeumeUndOrteDetailPage';
import KursterminePage from '@/pages/KursterminePage';
import KurstermineDetailPage from '@/pages/KurstermineDetailPage';
import KursePage from '@/pages/KursePage';
import KurseDetailPage from '@/pages/KurseDetailPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';
import AnmeldungenDetailPage from '@/pages/AnmeldungenDetailPage';
import PublicFormTrainer from '@/pages/public/PublicForm_Trainer';
import PublicFormTeilnehmer from '@/pages/public/PublicForm_Teilnehmer';
import PublicFormRaeumeUndOrte from '@/pages/public/PublicForm_RaeumeUndOrte';
import PublicFormKurstermine from '@/pages/public/PublicForm_Kurstermine';
import PublicFormKurse from '@/pages/public/PublicForm_Kurse';
import PublicFormAnmeldungen from '@/pages/public/PublicForm_Anmeldungen';
// <public:imports>
// </public:imports>
// <custom:imports>
const KursterminPlanenPage = lazy(() => import('@/pages/intents/KursterminPlanenPage'));
const TeilnehmerAnmeldenPage = lazy(() => import('@/pages/intents/TeilnehmerAnmeldenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a33ac9e6060014a70436880" element={<PublicFormTrainer />} />
              <Route path="public/6a33ac9f9cf5d458275318aa" element={<PublicFormTeilnehmer />} />
              <Route path="public/6a33afda2b58f2e41ee46836" element={<PublicFormRaeumeUndOrte />} />
              <Route path="public/6a33ac9f436c052d056df9f7" element={<PublicFormKurstermine />} />
              <Route path="public/6a33ac97f71b811034a5f224" element={<PublicFormKurse />} />
              <Route path="public/6a33aca0e11531f0f32fe8a9" element={<PublicFormAnmeldungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="trainer" element={<TrainerPage />} />
                <Route path="trainer/:id" element={<TrainerDetailPage />} />
                <Route path="teilnehmer" element={<TeilnehmerPage />} />
                <Route path="teilnehmer/:id" element={<TeilnehmerDetailPage />} />
                <Route path="raeume-und-orte" element={<RaeumeUndOrtePage />} />
                <Route path="raeume-und-orte/:id" element={<RaeumeUndOrteDetailPage />} />
                <Route path="kurstermine" element={<KursterminePage />} />
                <Route path="kurstermine/:id" element={<KurstermineDetailPage />} />
                <Route path="kurse" element={<KursePage />} />
                <Route path="kurse/:id" element={<KurseDetailPage />} />
                <Route path="anmeldungen" element={<AnmeldungenPage />} />
                <Route path="anmeldungen/:id" element={<AnmeldungenDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/kurstermin-planen" element={<Suspense fallback={null}><KursterminPlanenPage /></Suspense>} />
                <Route path="intents/teilnehmer-anmelden" element={<Suspense fallback={null}><TeilnehmerAnmeldenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
