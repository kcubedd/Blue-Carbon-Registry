import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

type ViewType = 
  | 'recent_restorations' 
  | 'verified_projects' 
  | 'events' 
  | 'impact_showcase' 
  | 'dashboard' 
  | 'submit_restoration' 
  | 'map'
  | 'profile'
  | 'wallet'
  | 'login_required';

interface NavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  userRole: 'guest' | 'user' | 'official' | 'government' | null;
  editingSubmission: any | null;
  setEditingSubmission: (sub: any | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children, initialView }: { children: ReactNode, initialView: ViewType }) => {
  const { profile, isOfficial, isGovernment } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);

  const userRole = profile?.role as any || (isOfficial ? 'official' : isGovernment ? 'government' : 'guest');

  const handleSetView = (view: ViewType) => {
    // Guest cannot access restricted views
    const restrictedViews: ViewType[] = ['submit_restoration', 'wallet', 'profile'];
    if (restrictedViews.includes(view) && (!profile || profile.role === 'guest')) {
      setCurrentView('login_required');
      return;
    }

    // Officials cannot access user-only views
    const userOnlyViews: ViewType[] = ['impact_showcase', 'submit_restoration', 'wallet'];
    if (isOfficial && userOnlyViews.includes(view)) {
      // Prevent access or redirect to dashboard
      return;
    }

    setCurrentView(view);
  };

  // Update default view when role changes
  useEffect(() => {
    if (isOfficial) {
      setCurrentView('recent_restorations');
    } else if (profile) {
      setCurrentView('dashboard');
    }
  }, [isOfficial, profile?.uid]);

  return (
    <NavigationContext.Provider value={{ 
      currentView, 
      setCurrentView: handleSetView,
      userRole,
      editingSubmission,
      setEditingSubmission
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
