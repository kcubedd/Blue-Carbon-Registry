import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Trophy,
  Leaf,
  X,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Submission, Comment } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getExplorerUrl } from '../services/blockchain';

const AppreciationWall = () => {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(subs);
      setLoading(false);

      // Auto-repair missing/broken images directly in the showcase
      const fixShowcaseImages = async () => {
        if (subs && subs.length > 0) {
          for (const sub of subs) {
            // Check if string includes mangrove or if the current URL is just broken
            const t = sub.type?.toLowerCase() || '';
            const desc = sub.description?.toLowerCase() || '';
            
            if (t.includes('mangrove') || desc.includes('mangrove')) {
              // Only update if it does not have the correct target URL
              const targetUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUVQaI4jOWlWfNu26rrV1-mKVImXrP9AaMBg&s';
              if (sub.imageUrl !== targetUrl) {
                try {
                  await updateDoc(doc(db, 'submissions', sub.id), { imageUrl: targetUrl });
                } catch (e) { console.error('Error repairing image', e); }
              }
            }
          }
        }
      };
      fixShowcaseImages();
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Impact Showcase</h2>
        <p className="text-slate-500 mt-1">Celebrating our community's restoration efforts.</p>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card rounded-3xl aspect-square animate-pulse border border-slate-100"></div>
            ))}
          </div>
        ) : submissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                whileHover={{ scale: 1.03, rotate: i % 2 === 0 ? 2 : -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => setSelectedSubmission(sub)}
                className="relative cursor-pointer aspect-square rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow bg-slate-100"
              >
                <img src={sub.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-3 text-white mb-2">
                    <img 
                      src={sub.userPhoto || `https://ui-avatars.com/api/?name=${sub.userName}&background=005576&color=fff`} 
                      alt=""
                      className="w-8 h-8 rounded-full border border-white/50" 
                    />
                    <span className="font-bold text-sm drop-shadow-md">{sub.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="text-amber-400 w-4 h-4" />
                    <span className="text-xs font-bold text-white drop-shadow-md">{sub.creditsAssigned} Credits</span>
                  </div>
                  {sub.blockchainVerified && (
                    <div className="absolute top-4 right-4 bg-blue-500/80 backdrop-blur-md text-white p-1.5 rounded-full shadow-lg border border-blue-400/50">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-12 text-center border border-slate-100 max-w-2xl mx-auto">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Leaf className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No posts yet</h3>
            <p className="text-slate-500">Be the first to share a restoration activity!</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedSubmission && (
          <PostModal 
            submission={selectedSubmission} 
            onClose={() => setSelectedSubmission(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PostModal: React.FC<{ submission: Submission, onClose: () => void }> = ({ submission, onClose }) => {
  const { profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('submissionId', '==', submission.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(comms);
    });

    return () => unsubscribe();
  }, [submission.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    try {
      await addDoc(collection(db, 'comments'), {
        submissionId: submission.id,
        userId: profile.uid,
        userName: profile.displayName,
        text: newComment,
        createdAt: new Date().toISOString()
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const sharePost = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Blue Carbon Restoration',
        text: `Check out this ${submission.type} restoration by ${submission.userName}!`,
        url: window.location.href,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-white backdrop-blur-md rounded-full text-slate-800 transition-colors md:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Image */}
        <div className="md:w-3/5 bg-slate-100 flex items-center justify-center relative min-h-[300px] md:min-h-0">
          <img src={submission.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Restoration" />
        </div>

        {/* Right: Details */}
        <div className="md:w-2/5 flex flex-col h-[50vh] md:h-auto max-h-[90vh] bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <img 
                src={submission.userPhoto || `https://ui-avatars.com/api/?name=${submission.userName}&background=005576&color=fff`} 
                alt="" 
                className="w-10 h-10 rounded-full border border-slate-100 object-cover"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{submission.userName}</h4>
                <p className="text-xs text-slate-500">{formatDate(submission.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-slate-400 hover:text-slate-600 p-2 hidden md:block" onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content (Caption + Comments) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Caption */}
            <div className="text-sm text-slate-900 flex gap-3">
              <img 
                src={submission.userPhoto || `https://ui-avatars.com/api/?name=${submission.userName}&background=005576&color=fff`} 
                alt="" 
                className="w-8 h-8 rounded-full border border-slate-100 object-cover shrink-0"
              />
              <div>
                <span className="font-bold mr-2">{submission.userName}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-2 align-middle">
                  {submission.type}
                </span>
                {submission.description}
                <div className="mt-2 flex items-center gap-2">
                  <Trophy className="text-amber-500 w-4 h-4" />
                  <span className="text-xs font-bold text-slate-600">{submission.creditsAssigned} Credits Earned</span>
                </div>
                {submission.blockchainVerified && submission.blockchainTxHash && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Immutable Record</p>
                        <p className="text-xs font-bold text-blue-900">Blockchain Verified</p>
                      </div>
                    </div>
                    <a 
                      href={getExplorerUrl(submission.blockchainTxHash)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 shadow-sm border border-blue-100 transition-all hover:shadow-md"
                    >
                      View on Polygon <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4 mt-6">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm flex gap-3">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${comment.userName}&background=f1f5f9&color=0f172a`} 
                    alt="" 
                    className="w-8 h-8 rounded-full border border-slate-100 object-cover shrink-0"
                  />
                  <div>
                    <span className="font-bold text-slate-900 mr-2">{comment.userName}</span>
                    <span className="text-slate-800">{comment.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions & Input */}
          <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={cn(
                    "transition-transform hover:scale-110 active:scale-95",
                    isLiked ? "text-red-500" : "text-slate-800 hover:text-slate-600"
                  )}
                >
                  <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
                </button>
                <button className="text-slate-800 hover:text-slate-600 transition-transform hover:scale-110 active:scale-95">
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button 
                  onClick={sharePost}
                  className="text-slate-800 hover:text-slate-600 transition-transform hover:scale-110 active:scale-95"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="font-bold text-sm text-slate-900 mb-3">
              {isLiked ? '25 likes' : '24 likes'}
            </div>
            
            <form onSubmit={handleAddComment} className="flex gap-2 items-center">
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="text-emerald-600 font-bold text-sm disabled:opacity-50 transition-opacity"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AppreciationWall;
