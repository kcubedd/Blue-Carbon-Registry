import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Trophy, 
  PlusCircle, 
  CheckCircle2, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  Leaf,
  ShieldCheck,
  User,
  Wallet
} from 'lucide-react';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Submission } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import LoadingThreeDotsJumping from '../components/ui/LoadingThreeDotsJumping';

const Dashboard = () => {
  const { profile, isOfficial, isGovernment } = useAuth();
  const { setCurrentView, setEditingSubmission } = useNavigation();
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [globalStats, setGlobalStats] = useState({ users: 0, submissions: 0, pending: 0, credits: 0, events: 0 });
  const [typeBreakdown, setTypeBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);
  const [verificationStats, setVerificationStats] = useState({ verified: 0, pending: 0, total: 0 });
  const [impactChartData, setImpactChartData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateChartData = (subs: Submission[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        name: months[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
        value: 0
      });
    }

    subs.forEach(sub => {
      if (sub.status !== 'approved') return;
      const subDate = new Date(sub.createdAt);
      const subMonth = subDate.getMonth();
      const subYear = subDate.getFullYear();
      
      const monthData = last6Months.find(m => m.month === subMonth && m.year === subYear);
      if (monthData) {
        monthData.value += (sub.creditsAssigned || 0);
      }
    });

    return last6Months.map(({ name, value }) => ({ name, value }));
  };

  useEffect(() => {
    if (!profile) return;

    // Global Stats for all users - Only for officials
    let unsubUsers = () => {};
    if (isOfficial || isGovernment) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setGlobalStats(prev => ({ ...prev, users: snapshot.size }));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    } else {
      // For regular users, maybe just show a static or estimated number
      setGlobalStats(prev => ({ ...prev, users: 1240 })); 
    }

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setGlobalStats(prev => ({ ...prev, events: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });

    // User's own submissions
    const userQuery = query(
      collection(db, 'submissions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubUser = onSnapshot(userQuery, (snapshot) => {
      const allSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setRecentSubmissions(allSubs.slice(0, 5));
      
      // Calculate type breakdown
      const breakdown: Record<string, number> = {};
      const colors: Record<string, string> = {
        mangrove: '#059669',
        seagrass: '#0891b2',
        wetland: '#4f46e5',
        cleanup: '#d97706'
      };

      let verified = 0;
      let pending = 0;

      allSubs.forEach(sub => {
        breakdown[sub.type] = (breakdown[sub.type] || 0) + 1;
        if (sub.blockchainVerified) verified++;
        if (sub.status === 'pending') pending++;
      });

      const breakdownData = Object.entries(breakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[name] || '#64748b'
      }));

      setTypeBreakdown(breakdownData);
      setVerificationStats({ verified, pending, total: allSubs.length });
      
      if (!isOfficial && !isGovernment) {
        setImpactChartData(calculateChartData(allSubs));
        setLoading(false);
      }
    }, (error) => {
      if (error.code === 'permission-denied' && !auth.currentUser) return;
      handleFirestoreError(error, OperationType.GET, 'submissions');
    });

    // Admin/Official/Gov specific data
    let unsubPending: () => void = () => {};
    let unsubStats: () => void = () => {};

    if (isOfficial || isGovernment) {
      const pendingQuery = query(
        collection(db, 'submissions'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      unsubPending = onSnapshot(pendingQuery, (snapshot) => {
        const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setPendingSubmissions(subs);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'submissions');
      });

      // Global Stats
      unsubStats = onSnapshot(collection(db, 'submissions'), (snapshot) => {
        const allSubs = snapshot.docs.map(doc => doc.data() as Submission);
        const pending = allSubs.filter(s => s.status === 'pending').length;
        const verified = allSubs.filter(s => s.blockchainVerified).length;
        const credits = allSubs.reduce((acc, curr) => acc + (curr.creditsAssigned || 0), 0);
        setGlobalStats(prev => ({ ...prev, submissions: allSubs.length, pending, credits }));
        setImpactChartData(calculateChartData(allSubs));
        setVerificationStats({ verified, pending, total: allSubs.length });

        // Global type breakdown
        const breakdown: Record<string, number> = {};
        const colors: Record<string, string> = {
          mangrove: '#059669',
          seagrass: '#0891b2',
          wetland: '#4f46e5',
          cleanup: '#d97706'
        };

        allSubs.forEach(sub => {
          breakdown[sub.type] = (breakdown[sub.type] || 0) + 1;
        });

        const breakdownData = Object.entries(breakdown).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: colors[name] || '#64748b'
        }));

        setTypeBreakdown(breakdownData);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'submissions');
      });
    }

    return () => {
      unsubUser();
      unsubPending();
      unsubStats();
      unsubUsers();
      unsubEvents();
    };
  }, [profile, isOfficial, isGovernment]);

  const userStats = [
    { label: 'Restorations Verified', value: verificationStats.verified || 0, icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-50', tag: 'h3' },
  ];

  const adminStats = [
    { label: 'Total Submissions', value: globalStats.submissions, icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', tag: 'h3' },
    { label: 'Pending Approvals', value: globalStats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', tag: 'h3' },
    { label: 'Total Credits Issued', value: globalStats.credits, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50', tag: 'h3' },
  ];

  const stats = (isOfficial || isGovernment) ? adminStats : userStats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            {isOfficial ? 'Official Registry Dashboard' : isGovernment ? 'Government Fund Control' : 'Your environmental contributions'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isOfficial 
              ? 'Monitor global restoration activities and manage approvals.' 
              : isGovernment 
              ? 'Manage payouts and platform funds.'
              : "Here's what's happening with your restoration projects."}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Restoration Breakdown</h3>
          <div className="flex items-center gap-8">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {typeBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
              {typeBreakdown.length === 0 && (
                <p className="text-sm text-slate-400 italic">No restorations recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Chart Area */}
        <div className="lg:col-span-2 glass-card p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Impact Growth</h3>
              <p className="text-sm text-slate-500">Credits earned over the last 6 months</p>
            </div>
          </div>
          <div className="h-[520px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {impactChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === impactChartData.length - 1 ? '#005576' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Pending Approvals */}
        <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">
              {(isOfficial || isGovernment) ? 'Pending Approvals' : 'Recent Activity'}
            </h3>
            {(isOfficial || isGovernment) && (
              <button 
                onClick={() => setCurrentView(isOfficial ? 'recent_restorations' : isGovernment ? 'dashboard' : 'wallet')}
                className="text-emerald-600 text-sm font-bold hover:underline"
              >
                View All
              </button>
            )}
          </div>
          
          <div className="space-y-6 flex-1">
            {loading ? (
              <div className="py-12">
                <LoadingThreeDotsJumping />
              </div>
            ) : (isOfficial || isGovernment ? pendingSubmissions : recentSubmissions).length > 0 ? (
              (isOfficial || isGovernment ? pendingSubmissions : recentSubmissions).map((sub) => (
                <div 
                  key={sub.id} 
                  onClick={() => setCurrentView(isOfficial ? 'recent_restorations' : isGovernment ? 'dashboard' : 'dashboard')}
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                    <img src={sub.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                      {(isOfficial || isGovernment) ? sub.userName : sub.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">
                        {(isOfficial || isGovernment) ? sub.type : formatDate(sub.createdAt)}
                      </p>
                      {sub.status === 'rejected' && sub.rejectionReason && (
                        <span className="text-[10px] text-red-400 italic truncate max-w-[100px]">
                          Reason: {sub.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      sub.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                      sub.status === 'rejected' ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {sub.status}
                    </div>
                    {sub.status === 'rejected' && !isOfficial && !isGovernment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubmission(sub);
                          setCurrentView('submit_restoration');
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Resubmit
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-slate-300 w-8 h-8" />
                </div>
                <p className="text-slate-500 text-sm">
                  {(isOfficial || isGovernment) ? 'All caught up! No pending reviews.' : 'No submissions yet.'}
                </p>
                {(!isOfficial && !isGovernment) && (
                  <button 
                    onClick={() => setCurrentView('submit_restoration')}
                    className="text-emerald-600 text-sm font-bold mt-2"
                  >
                    Submit your first
                  </button>
                )}
              </div>
            )}
          </div>

          {(isOfficial || isGovernment) && (
            <div className="mt-8 pt-8 border-t border-slate-100 mt-auto">
              <div className="glass-card !bg-slate-900/60 !border-white/20 backdrop-blur-xl rounded-3xl p-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Admin Action</p>
                  <h4 className="font-bold text-lg mb-4">Generate Registry Report</h4>
                  <button className="glass-button-blue px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    Download PDF <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
