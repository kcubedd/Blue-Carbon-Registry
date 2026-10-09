import React from 'react';
import Header from '../Header';
import { useNavigation, NavigationProvider } from '../../context/NavigationContext';

// Pages
import Dashboard from '../../pages/Dashboard';
import SubmitRestoration from '../../pages/SubmitRestoration';
import RestorationMap from '../../pages/RestorationMap';
import { Events } from '../../pages/Events';
import WithdrawalPage from '../../pages/WithdrawalPage';
import AppreciationWall from '../../pages/AppreciationWall';
import Profile from '../../pages/Profile';
import AdminPanel from '../../pages/AdminPanel';
import GovernmentDashboard from '../../pages/GovernmentDashboard';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

const DashboardContent = () => {
  const { currentView, setCurrentView } = useNavigation();
  const { isOfficial, isGovernment, profile } = useAuth();

  const renderView = () => {
    if (currentView === 'login_required') {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-amber-100 p-6 rounded-full mb-6">
            <ShieldCheck className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Login Required</h2>
          <p className="text-slate-600 max-w-md mb-8">
            You are currently exploring as a Guest. To submit restorations and earn carbon credits, please log in with an official account.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.href = '/auth'}
              className="glass-button-blue px-8 py-3 rounded-full font-bold"
            >
              Sign In
            </button>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="bg-slate-200 text-slate-700 px-8 py-3 rounded-full font-bold hover:bg-slate-300 transition-colors"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      );
    }

    if (isOfficial) {
      switch (currentView) {
        case 'recent_restorations':
          return <AdminPanel mode="pending" />;
        case 'verified_projects':
          return <AdminPanel mode="verified" />;
        case 'events':
          return <Events />;
        case 'profile':
          return <Profile />;
        default:
          return <AdminPanel mode="pending" />;
      }
    }

    if (isGovernment) {
      return <GovernmentDashboard />;
    }

    // User views
    switch (currentView) {
      case 'impact_showcase':
        return <AppreciationWall />;
      case 'dashboard':
        return <Dashboard />;
      case 'submit_restoration':
        return <SubmitRestoration />;
      case 'map':
        return <RestorationMap />;
      case 'events':
        return <Events />;
      case 'wallet':
        return <WithdrawalPage />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=2070" 
          alt="Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-3xl" />
      </div>
      
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <NavigationProvider initialView="dashboard">
      <DashboardContent />
    </NavigationProvider>
  );
};

export default DashboardLayout;
