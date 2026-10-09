import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  MapPin, 
  Calendar, 
  User,
  Filter,
  Trash2,
  Trophy,
  Leaf
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, addDoc, where, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db, auth } from '../lib/firebase';
import { Submission, RestorationType } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import LoadingThreeDotsJumping from '../components/ui/LoadingThreeDotsJumping';
import { storeOnBlockchain, getExplorerUrl } from '../services/blockchain';
import { validateSubmissionIntegrity, generateImageHash } from '../lib/validation';

import { useNavigation } from '../context/NavigationContext';

const AdminPanel = ({ mode = 'pending' }: { mode?: 'pending' | 'verified' }) => {
  const { currentView } = useNavigation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [creditAmount, setCreditAmount] = useState('100');
  const [isVerifyingOnChain, setIsVerifyingOnChain] = useState(false);

  useEffect(() => {
    // Real-time data pipeline for submissions
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(subs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSubmissions = submissions.filter(s => {
    if (mode === 'pending') return s.status === 'pending';
    if (mode === 'verified') return s.status === 'approved';
    return true;
  });

  const CREDIT_VALUES: Record<RestorationType, number> = {
    mangrove: 500,
    seagrass: 550,
    wetland: 350,
    cleanup: 150
  };

  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedSub) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }

    setIsReviewing(true);
    try {
      const subRef = doc(db, 'submissions', selectedSub.id);
      const credits = status === 'approved' ? CREDIT_VALUES[selectedSub.type] : 0;

      // 1. Update Submission status in Firestore
      const updateData: any = {
        status,
        creditsAssigned: credits,
        reviewedAt: new Date().toISOString()
      };

      if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason;
      }

      await updateDoc(subRef, updateData);

      if (status === 'approved') {
        // 2. Move to verified_projects (Copy document)
        await addDoc(collection(db, 'verified_projects'), {
          originalSubmissionId: selectedSub.id,
          userId: selectedSub.userId,
          userName: selectedSub.userName,
          imageUrl: selectedSub.imageUrl,
          description: selectedSub.description,
          type: selectedSub.type,
          latitude: selectedSub.latitude,
          longitude: selectedSub.longitude,
          date: selectedSub.date,
          status: 'approved',
          creditsAssigned: credits,
          approvalTimestamp: new Date().toISOString(),
          approvedBy: auth.currentUser?.uid || 'system',
          blockchainStatus: 'pending',
          verifiedAt: new Date().toISOString()
        });

        // 3. Update User Credits
        const userRef = doc(db, 'users', selectedSub.userId);
        await updateDoc(userRef, {
          totalCredits: increment(credits),
          restorationsCount: increment(1)
        });

        // 4. Create Transaction
        await addDoc(collection(db, 'transactions'), {
          userId: selectedSub.userId,
          amount: credits,
          type: 'credit',
          referenceId: selectedSub.id,
          description: `Restoration Approval: ${selectedSub.type}`,
          createdAt: new Date().toISOString()
        });

        // 5. Trigger Blockchain Verification
        await handleBlockchainVerify(selectedSub, credits);
      }

      setSelectedSub(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process review. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleBlockchainVerify = async (sub: Submission, credits?: number) => {
    setIsVerifyingOnChain(true);
    try {
      const imageHash = generateImageHash(sub.imageUrl);
      
      const subWithCredits = { 
        ...sub, 
        creditsAssigned: credits !== undefined ? credits : sub.creditsAssigned 
      };

      // 1. Validate integrity
      const validation = validateSubmissionIntegrity(subWithCredits, imageHash);
      if (!validation.valid) {
        throw new Error(validation.error || "Integrity check failed.");
      }

      // 2. Call backend for on-chain storage
      const txHash = await storeOnBlockchain(subWithCredits, imageHash);
      
      if (txHash) {
        const subRef = doc(db, 'submissions', sub.id);
        await updateDoc(subRef, {
          blockchainTxHash: txHash,
          blockchainVerified: true
        });

        // Also update verified_projects document
        const vpQuery = query(collection(db, 'verified_projects'), where('originalSubmissionId', '==', sub.id));
        const vpSnapshot = await getDocs(vpQuery);
        if (!vpSnapshot.empty) {
          const vpRef = doc(db, 'verified_projects', vpSnapshot.docs[0].id);
          await updateDoc(vpRef, {
            blockchainStatus: 'confirmed',
            blockchainTxHash: txHash
          });
        }
      }
    } catch (bcErr: any) {
      console.error("Blockchain verification failed:", bcErr);
      toast.error(`Blockchain verification failed: ${bcErr.message}`);
    } finally {
      setIsVerifyingOnChain(false);
    }
  };

  const handleDeleteReport = async (sub: Submission) => {
    try {
      // 1. Delete from submissions
      await deleteDoc(doc(db, 'submissions', sub.id));
      
      // 2. If approved, also delete from verified_projects
      if (sub.status === 'approved') {
        const vpQuery = query(collection(db, 'verified_projects'), where('originalSubmissionId', '==', sub.id));
        const vpSnapshot = await getDocs(vpQuery);
        for (const vpDoc of vpSnapshot.docs) {
          await deleteDoc(doc(db, 'verified_projects', vpDoc.id));
        }

        // 3. Decrement user stats
        const userRef = doc(db, 'users', sub.userId);
        await updateDoc(userRef, {
          totalCredits: increment(-sub.creditsAssigned),
          restorationsCount: increment(-1)
        });
      }
      
      toast.success('Project removed successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove project.');
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
            {mode === 'pending' ? (
              <><ShieldCheck className="text-emerald-600 w-8 h-8" /> Recent Restorations</>
            ) : (
              <><CheckCircle2 className="text-emerald-600 w-8 h-8" /> Verified Projects</>
            )}
          </h2>
          <p className="text-slate-500 mt-1">
            {mode === 'pending' 
              ? "Review and verify restoration activities from the field."
              : "View and manage all verified restoration projects."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {mode === 'pending' && (
            <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-bold text-sm border border-amber-100">
              {pendingCount} Pending Reviews
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-end">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Contributor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <LoadingThreeDotsJumping />
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="bg-slate-50 p-6 rounded-full">
                        {mode === 'pending' ? (
                          <ShieldCheck className="w-12 h-12 text-slate-300" />
                        ) : (
                          <CheckCircle2 className="w-12 h-12 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-900">
                          {mode === 'pending' ? 'No Recent Restorations' : 'No Verified Projects'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {mode === 'pending' 
                            ? "No restoration submissions have been recorded in the registry yet."
                            : "No projects have been verified yet."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredSubmissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={sub.userPhoto || `https://ui-avatars.com/api/?name=${sub.userName}&background=f1f5f9&color=64748b`} className="w-8 h-8 rounded-full" alt="" />
                      <span className="text-sm font-bold text-slate-900">{sub.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase px-2 py-1 rounded-lg">
                      {sub.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(sub.date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {sub.latitude.toFixed(2)}, {sub.longitude.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      sub.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                      sub.status === 'rejected' ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        sub.status === 'approved' ? "bg-emerald-500" :
                        sub.status === 'rejected' ? "bg-red-500" :
                        "bg-amber-500"
                      )}></div>
                      {sub.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedSub(sub)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(sub)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Post"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    {/* Review Modal */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSub(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-card w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <div className="md:w-1/2 bg-slate-100">
                <img src={selectedSub.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="md:w-1/2 p-10 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">Review Evidence</h3>
                    <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-slate-600">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="text-slate-500">Verify the restoration activity and metadata.</p>
                </div>

                <div className="space-y-4">
                  <div className="glass-card !bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <MapPin className="text-emerald-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Location Metadata</p>
                      <p className="text-sm font-bold text-slate-900">{selectedSub.latitude.toFixed(6)}, {selectedSub.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                  <div className="glass-card !bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Calendar className="text-emerald-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Activity Date</p>
                      <p className="text-sm font-bold text-slate-900">{formatDate(selectedSub.date)}</p>
                    </div>
                  </div>
                  <div className="glass-card !bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <User className="text-emerald-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contributor</p>
                      <p className="text-sm font-bold text-slate-900">{selectedSub.userName}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-slate-700 leading-relaxed">{selectedSub.description}</p>
                </div>

                {selectedSub.status === 'pending' && (
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Credits to be Awarded</p>
                      <div className="flex items-center gap-3">
                        <Trophy className="text-amber-500 w-5 h-5" />
                        <span className="font-bold text-slate-900 text-xl">{CREDIT_VALUES[selectedSub.type]} CBC</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rejection Reason (Required for Reject)</p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this submission is being rejected..."
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleReview('rejected')}
                        disabled={isReviewing}
                        className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isReviewing ? (
                          <div className="w-5 h-5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <><XCircle className="w-5 h-5" /> Reject</>
                        )}
                      </button>
                      <button 
                        onClick={() => handleReview('approved')}
                        disabled={isReviewing || isVerifyingOnChain}
                        className="py-4 glass-button-blue rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isReviewing || isVerifyingOnChain ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {isVerifyingOnChain ? 'Verifying On-Chain...' : 'Processing...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" /> Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedSub.status === 'approved' && !selectedSub.blockchainVerified && (
                  <div className="pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => handleBlockchainVerify(selectedSub)}
                      disabled={isVerifyingOnChain}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                    >
                      {isVerifyingOnChain ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying On-Chain...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" /> Verify on Blockchain
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-3 uppercase tracking-widest font-bold">
                      Approved but not yet anchored on-chain
                    </p>
                  </div>
                )}

                {selectedSub.blockchainVerified && selectedSub.blockchainTxHash && (
                  <div className="pt-6 border-t border-slate-100">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2 rounded-xl text-white">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Blockchain Verified</p>
                          <p className="text-xs font-mono text-emerald-800 truncate w-32">{selectedSub.blockchainTxHash}</p>
                        </div>
                      </div>
                      <a 
                        href={getExplorerUrl(selectedSub.blockchainTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        View Explorer
                      </a>
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

export default AdminPanel;
