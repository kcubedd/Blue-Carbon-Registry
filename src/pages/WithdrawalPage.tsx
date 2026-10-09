import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  History, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  IndianRupee,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Withdrawal, BankDetails } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const WithdrawalPage = () => {
  const { profile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: profile?.bankDetails?.accountHolderName || '',
    accountNumber: profile?.bankDetails?.accountNumber || '',
    ifsc: profile?.bankDetails?.ifsc || ''
  });

  const MIN_WITHDRAWAL = 3500;
  const CONVERSION_RATE = 5; // 5 credits = 1 INR

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const userRef = doc(db, 'users_private', profile.uid);
      await updateDoc(userRef, {
        bankDetails
      });
      setShowBankModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!profile || profile.totalCredits < MIN_WITHDRAWAL || !profile.bankDetails) return;

    setIsRequesting(true);
    try {
      const amountINR = Math.floor(profile.totalCredits / CONVERSION_RATE);
      
      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        userName: profile.displayName,
        creditsRequested: profile.totalCredits,
        amountINR,
        status: 'pending',
        bankDetails: profile.bankDetails,
        createdAt: new Date().toISOString()
      });

      // We don't deduct credits here. 
      // Credits are deducted when the government official approves the payout.
      // This prevents users from losing credits if the payout is rejected.
      
      alert("Withdrawal request submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit withdrawal request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const isOfficial = profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com';
  const currentCredits = !isOfficial ? 1400 : (profile?.totalCredits || 0);
  const currentBalanceINR = !isOfficial ? 280 : (profile ? Math.floor(currentCredits / CONVERSION_RATE) : 0);
  const canWithdraw = profile && currentCredits >= MIN_WITHDRAWAL && profile.bankDetails;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Wallet className="text-emerald-600 w-8 h-8" />
            Wallet & Payouts
          </h2>
          <p className="text-slate-500 mt-1">Manage your impact credits and convert them to real currency.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
          <ShieldCheck className="text-emerald-600 w-5 h-5" />
          <span className="text-sm font-bold text-emerald-700">Verified Registry Economy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="md:col-span-2 glass-card rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Wallet size={160} />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{currentCredits}</h3>
                  <span className="text-xl font-bold text-slate-400 uppercase tracking-widest">CBC</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Value</p>
                <div className="flex items-center gap-1 text-emerald-600">
                  <IndianRupee className="w-5 h-5" />
                  <span className="text-4xl font-black tracking-tight">
                    {currentBalanceINR} 
                    <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-widest">rupees</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conversion Rate</p>
                <p className="text-sm font-bold text-slate-700">5 Impact Credits = ₹1</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Minimum Withdrawal</p>
                <p className="text-sm font-bold text-slate-700">3,500 Credits (₹700)</p>
              </div>
            </div>

            <div className="pt-4">
              {!profile?.bankDetails ? (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-amber-500 w-5 h-5" />
                    <p className="text-sm font-bold text-amber-700">Add bank details to enable withdrawals</p>
                  </div>
                  <button 
                    onClick={() => setShowBankModal(true)}
                    className="bg-white text-amber-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-amber-100 transition-colors"
                  >
                    Setup Bank
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={handleRequestWithdrawal}
                    disabled={!canWithdraw || isRequesting}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                      canWithdraw 
                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                    )}
                  >
                    {isRequesting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowUpRight className="w-5 h-5" /> Request Payout
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowBankModal(true)}
                    className="px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-5 h-5" /> Edit Bank
                  </button>
                </div>
              )}
              {!canWithdraw && profile?.bankDetails && (
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                  You need {MIN_WITHDRAWAL - (profile?.totalCredits || 0)} more credits to withdraw
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-card rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500 w-5 h-5" />
            Payout Process
          </h4>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">1</div>
              <p className="text-xs text-slate-600 leading-relaxed">Request withdrawal once you reach 3,500 credits.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">2</div>
              <p className="text-xs text-slate-600 leading-relaxed">Government personnel verify the legitimacy of your restoration activities.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">3</div>
              <p className="text-xs text-slate-600 leading-relaxed">Upon approval, funds are transferred via Razorpay to your bank account.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Powered By</p>
            <div className="flex items-center gap-2 grayscale opacity-50">
              <img src="https://razorpay.com/assets/razorpay-glyph.svg" className="w-5 h-5" alt="" />
              <span className="font-bold text-slate-900">Razorpay Payouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="space-y-4">
        <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="text-slate-400 w-6 h-6" />
          Withdrawal History
        </h4>
        <div className="glass-card rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Credits</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">Loading history...</td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No withdrawal requests found.</td>
                  </tr>
                ) : withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(w.createdAt)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{w.creditsRequested} CBC</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-emerald-600 font-bold">
                        <IndianRupee className="w-3 h-3" />
                        {w.amountINR}
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
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {w.payoutId || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBankModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-card w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Bank Details</h3>
                <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-slate-600">
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateBank} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Holder Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Number</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">IFSC Code</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    value={bankDetails.ifsc}
                    onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mt-4"
                >
                  Save Details
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WithdrawalPage;
