import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Download,
  IndianRupee,
  Clock,
  User,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Withdrawal } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const GovernmentDashboard = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');

  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePayout = async (status: 'approved' | 'rejected') => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      const withdrawalRef = doc(db, 'withdrawals', selectedWithdrawal.id);

      if (status === 'approved') {
        // 1. Call Backend API for Razorpay Payout
        const response = await fetch('/api/payouts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawalId: selectedWithdrawal.id,
            userId: selectedWithdrawal.userId,
            amountINR: selectedWithdrawal.amountINR,
            bankDetails: selectedWithdrawal.bankDetails
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Payout failed");
        }

        const data = await response.json();

        // 2. Update Withdrawal Status
        await updateDoc(withdrawalRef, {
          status: 'paid',
          payoutId: data.payoutId
        });

        // 3. Deduct Credits from User
        const userRef = doc(db, 'users', selectedWithdrawal.userId);
        await updateDoc(userRef, {
          totalCredits: increment(-selectedWithdrawal.creditsRequested)
        });

        // 4. Create Transaction Record
        await addDoc(collection(db, 'transactions'), {
          userId: selectedWithdrawal.userId,
          amount: -selectedWithdrawal.creditsRequested,
          type: 'withdrawal',
          referenceId: selectedWithdrawal.id,
          description: `Withdrawal Payout: ₹${selectedWithdrawal.amountINR}`,
          createdAt: new Date().toISOString()
        });

        alert(`Payout processed successfully! ID: ${data.payoutId}`);
      } else {
        // Reject Withdrawal
        await updateDoc(withdrawalRef, {
          status: 'rejected'
        });
        alert("Withdrawal request rejected.");
      }

      setSelectedWithdrawal(null);
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch = w.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         w.userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || w.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    pending: withdrawals.filter(w => w.status === 'pending').length,
    totalPaid: withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.amountINR, 0),
    totalCredits: withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.creditsRequested, 0)
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="text-blue-600 w-8 h-8" />
            Government Fund Control
          </h2>
          <p className="text-slate-500 mt-1">Review and approve impact credit payouts to citizens.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex items-center gap-2">
            <Zap className="text-blue-600 w-4 h-4" />
            <span className="text-sm font-bold text-blue-700">Razorpay X Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pending Requests</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{stats.pending}</h3>
            <span className="text-sm font-bold text-amber-500">Awaiting Review</span>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Disbursed</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">₹{stats.totalPaid.toLocaleString()}</h3>
            <span className="text-sm font-bold text-emerald-500">Real Currency</span>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Credits Retired</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{stats.totalCredits.toLocaleString()}</h3>
            <span className="text-sm font-bold text-blue-500">CBC Impact</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <div className="flex gap-2">
          {(['all', 'pending', 'paid', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                filterStatus === status 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Credits</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading withdrawals...</td></tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No withdrawal requests found.</td></tr>
              ) : filteredWithdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{w.userName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{w.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{w.creditsRequested.toLocaleString()} CBC</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-emerald-600 font-bold">
                      <IndianRupee className="w-3 h-3" />
                      {w.amountINR.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      w.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                      w.status === 'approved' ? "bg-blue-50 text-blue-600" :
                      w.status === 'rejected' ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {w.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {w.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(w.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedWithdrawal(w)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedWithdrawal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWithdrawal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Review Withdrawal</h3>
                  <p className="text-slate-500 text-sm">Verify bank details before approving payout.</p>
                </div>
                <button onClick={() => setSelectedWithdrawal(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">User Information</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedWithdrawal.userName}</p>
                        <p className="text-xs text-slate-500 font-mono">{selectedWithdrawal.userId}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payout Amount</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-3xl font-black text-emerald-600">₹{selectedWithdrawal.amountINR}</h4>
                      <span className="text-sm font-bold text-slate-400">({selectedWithdrawal.creditsRequested} CBC)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Bank Account Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Holder Name</p>
                      <p className="text-sm font-bold text-slate-900">{selectedWithdrawal.bankDetails.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Account Number</p>
                      <p className="text-sm font-bold text-slate-900 font-mono">{selectedWithdrawal.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">IFSC Code</p>
                      <p className="text-sm font-bold text-slate-900 font-mono">{selectedWithdrawal.bankDetails.ifsc}</p>
                    </div>
                  </div>
                </div>

                {selectedWithdrawal.status === 'pending' && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                      <ShieldCheck className="text-blue-600 w-5 h-5" />
                      <p className="text-xs text-blue-800 leading-relaxed">
                        By clicking approve, you authorize a real-time IMPS transfer via Razorpay X. Ensure all details are correct.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handlePayout('rejected')}
                        disabled={isProcessing}
                        className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> Reject Request
                      </button>
                      <button 
                        onClick={() => handlePayout('approved')}
                        disabled={isProcessing}
                        className="py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                      >
                        {isProcessing ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-5 h-5" /> Approve & Payout
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedWithdrawal.status === 'paid' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900">Payout Completed</h4>
                      <p className="text-xs text-emerald-700 mt-1">Funds have been successfully disbursed via Razorpay.</p>
                    </div>
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Razorpay Payout ID</p>
                      <p className="text-xs font-mono font-bold text-emerald-800">{selectedWithdrawal.payoutId}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GovernmentDashboard;
