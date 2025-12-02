import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { KeyboardShortcutsProvider } from './contexts/KeyboardShortcutsContext';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { OfflineBanner } from './components/OfflineBanner';
import { OfflineQueueProcessor } from './components/OfflineQueueProcessor';
import NotificationContainer from './components/NotificationContainer';
import HomePage from './pages/Home';
import DashboardPage from './pages/Dashboard';
import TranscriptsPage from './pages/Transcripts';
import InsightsPage from './pages/Insights';
import CollectionDetailPage from './pages/CollectionDetail';
import VideoDetailPage from './pages/VideoDetail';
import NotificationsPage from './pages/Notifications';
import TagsManagerPage from './pages/TagsManager';
import SettingsPage from './pages/Settings';
import SharedWithMePage from './pages/SharedWithMe';
import HowItWorksPage from './pages/HowItWorks';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import ContactPage from './pages/Contact';

function App() {
  return (
    <SettingsProvider>
      <NotificationProvider>
        <KeyboardShortcutsProvider>
          <Router>
            <ScrollToTop />
            <OfflineBanner />
            <OfflineQueueProcessor />
            <NotificationContainer />
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transcripts" element={<TranscriptsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/collection/:id" element={<CollectionDetailPage />} />
                <Route path="/video/:id" element={<VideoDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/tags" element={<TagsManagerPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/shared-with-me" element={<SharedWithMePage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </Layout>
          </Router>
        </KeyboardShortcutsProvider>
      </NotificationProvider>
    </SettingsProvider>
  );
}

export default App;
