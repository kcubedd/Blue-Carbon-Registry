import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trophy, 
  Calendar,
  History,
  TrendingUp
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';

const Wallet = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Your Wallet</h2>
        <p className="text-slate-500 mt-1">Manage your carbon impact credits and view transaction history.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card !bg-slate-900/90 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div className="bg-white/10 p-3 rounded-3xl backdrop-blur">
                  <WalletIcon className="text-emerald-400 w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Registry Wallet</p>
                  <p className="text-sm font-medium text-emerald-400">Active</p>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm font-medium mb-1">Total Balance</p>
              <div className="flex items-baseline gap-2 mb-12">
                <span className="text-5xl font-bold">{profile?.totalCredits.toLocaleString() || 0}</span>
                <span className="text-emerald-400 font-bold">CBC</span>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Impact Tier</p>
                  <p className="font-bold">Guardian II</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Next Reward</p>
                  <p className="font-bold text-emerald-400">500 CBC</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          </motion.div>

          <div className="mt-8 glass-card p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
              Quick Stats
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">From Restorations</span>
                <span className="font-bold text-slate-900">840 CBC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">From Events</span>
                <span className="font-bold text-slate-900">400 CBC</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-sm text-slate-500">Global Rank</span>
                <span className="font-bold text-emerald-600">#124</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="text-slate-400 w-6 h-6" />
              Transaction History
            </h3>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-3xl"></div>
              ))
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-3xl flex items-center justify-center",
                      tx.type === 'restoration' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {tx.type === 'restoration' ? <Trophy className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{tx.description}</p>
                      <p className="text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 flex items-center justify-end gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      +{tx.amount} CBC
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="text-slate-300 w-10 h-10" />
                </div>
                <p className="text-slate-500 font-medium">No transactions found.</p>
                <p className="text-sm text-slate-400 mt-1">Earn credits by submitting restorations or joining events.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
