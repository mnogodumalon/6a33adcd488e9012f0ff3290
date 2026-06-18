import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KursePage from '@/pages/KursePage';
import KurseDetailPage from '@/pages/KurseDetailPage';
import TrainerPage from '@/pages/TrainerPage';
import TrainerDetailPage from '@/pages/TrainerDetailPage';
import TeilnehmerPage from '@/pages/TeilnehmerPage';
import TeilnehmerDetailPage from '@/pages/TeilnehmerDetailPage';
import KursterminePage from '@/pages/KursterminePage';
import KurstermineDetailPage from '@/pages/KurstermineDetailPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';
import AnmeldungenDetailPage from '@/pages/AnmeldungenDetailPage';
import PublicFormKurse from '@/pages/public/PublicForm_Kurse';
import PublicFormTrainer from '@/pages/public/PublicForm_Trainer';
import PublicFormTeilnehmer from '@/pages/public/PublicForm_Teilnehmer';
import PublicFormKurstermine from '@/pages/public/PublicForm_Kurstermine';
import PublicFormAnmeldungen from '@/pages/public/PublicForm_Anmeldungen';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a33ac97f71b811034a5f224" element={<PublicFormKurse />} />
              <Route path="public/6a33ac9e6060014a70436880" element={<PublicFormTrainer />} />
              <Route path="public/6a33ac9f9cf5d458275318aa" element={<PublicFormTeilnehmer />} />
              <Route path="public/6a33ac9f436c052d056df9f7" element={<PublicFormKurstermine />} />
              <Route path="public/6a33aca0e11531f0f32fe8a9" element={<PublicFormAnmeldungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kurse" element={<KursePage />} />
                <Route path="kurse/:id" element={<KurseDetailPage />} />
                <Route path="trainer" element={<TrainerPage />} />
                <Route path="trainer/:id" element={<TrainerDetailPage />} />
                <Route path="teilnehmer" element={<TeilnehmerPage />} />
                <Route path="teilnehmer/:id" element={<TeilnehmerDetailPage />} />
                <Route path="kurstermine" element={<KursterminePage />} />
                <Route path="kurstermine/:id" element={<KurstermineDetailPage />} />
                <Route path="anmeldungen" element={<AnmeldungenPage />} />
                <Route path="anmeldungen/:id" element={<AnmeldungenDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
