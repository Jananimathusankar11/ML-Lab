import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewDashboard from './pages/OverviewDashboard';
import DetectRetinopathy from './pages/DetectRetinopathy';
import ImagePreprocessing from './pages/ImagePreprocessing';
import FeatureAnalysis from './pages/FeatureAnalysis';
import DatasetExplorer from './pages/DatasetExplorer';
import ModelTraining from './pages/ModelTraining';
import ModelEvaluation from './pages/ModelEvaluation';
import PredictionHistory from './pages/PredictionHistory';
import ProjectDocumentation from './pages/ProjectDocumentation';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setDashboardData(res);
        setApiOnline(true);
      }
    } catch (e) {
      console.warn('Dashboard fetch warning:', e);
      setApiOnline(false);
    } finally {
      setLoadingDashboard(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Periodic liveness check
    const interval = setInterval(async () => {
      try {
        await api.getHealth();
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F8FAFC] flex">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        modelStatus={dashboardData?.data?.model_status}
        trainingStatus={dashboardData?.data?.training_status}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Sticky Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          apiOnline={apiOnline}
          onRefresh={loadDashboard}
          refreshing={refreshing}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewDashboard
              dashboardData={dashboardData}
              loading={loadingDashboard}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'detect' && (
            <DetectRetinopathy onPredictionComplete={loadDashboard} />
          )}

          {activeTab === 'preprocess' && <ImagePreprocessing />}

          {activeTab === 'features' && <FeatureAnalysis />}

          {activeTab === 'dataset' && <DatasetExplorer />}

          {activeTab === 'training' && (
            <ModelTraining onTrainingFinish={loadDashboard} />
          )}

          {activeTab === 'evaluation' && <ModelEvaluation />}

          {activeTab === 'history' && <PredictionHistory />}

          {activeTab === 'docs' && <ProjectDocumentation />}

          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#2B3550] px-8 py-4 text-xs text-[#A7B1C8] flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#080D19]/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F8FAFC]">RetinaAI</span>
            <span>— Diabetic Retinopathy Machine Learning System</span>
          </div>
          <div>
            Built with React, Vite, Tailwind CSS, Flask & TensorFlow
          </div>
        </footer>
      </div>
    </div>
  );
}
