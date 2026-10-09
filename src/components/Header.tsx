import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, ShieldCheck, Leaf, MessageSquare, Calendar, CheckCircle2, LayoutDashboard, Send, Map as MapIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { useNavigation } from '../context/NavigationContext';

const Header = () => {
  const { profile, isOfficial, isGovernment } = useAuth();
  const { currentView, setCurrentView } = useNavigation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  let navItems: { id: any; icon: any; label: string }[] = [];

  if (isOfficial) {
    navItems = [
      { id: 'recent_restorations', icon: ShieldCheck, label: 'Recent Restorations' },
      { id: 'verified_projects', icon: CheckCircle2, label: 'Verified Projects' },
      { id: 'events', icon: Calendar, label: 'Events' },
    ];
  } else if (isGovernment) {
    navItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];
  } else {
    navItems = [
      { id: 'impact_showcase', icon: MessageSquare, label: 'Impact Showcase' },
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'submit_restoration', icon: Send, label: 'Submit Restoration' },
      { id: 'map', icon: MapIcon, label: 'Map' },
      { id: 'events', icon: Calendar, label: 'Events' },
    ];
  }

  const handleLogout = () => {
    signOut(auth);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setHasUnread(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showNotifications]);

  return (
    <header className="h-16 glass-card !overflow-visible rounded-[20px] border border-white/40 flex items-center justify-between px-6 sticky top-4 z-20 bg-white/40 backdrop-blur-xl mx-4 mt-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-200 shrink-0">
          <Leaf className="text-white w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-sm leading-tight">Blue Carbon</span>
          <span className="text-emerald-600 text-[10px] font-medium uppercase tracking-wider">Registry</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-1 bg-white/40 border border-white/60 p-1 rounded-full shadow-sm">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-xs font-medium whitespace-nowrap",
                isActive 
                  ? "bg-[#005576] text-white shadow-md shadow-[#005576]/30" 
                  : "text-slate-600 hover:bg-white/50 hover:text-[#005576]"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-6">
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={toggleNotifications}
            className="relative p-2 rounded-full hover:bg-white/60 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-card bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                <span className="text-[10px] font-bold text-[#005576] uppercase tracking-wider bg-[#005576]/10 px-2 py-0.5 rounded-full">New</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white/60 border border-white/40 hover:bg-white/80 transition-colors cursor-pointer group">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        Your recent restoration of <span className="font-bold text-[#005576]">mangroves</span> just got approved!
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Just now</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{profile?.displayName || 'User'}</p>
            <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Member'}</p>
          </div>
          <button onClick={() => setCurrentView('profile')} className="hover:scale-105 transition-transform shrink-0">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=005576&color=fff`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover"
            />
          </button>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 rounded-full text-slate-400 hover:bg-white/60 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
