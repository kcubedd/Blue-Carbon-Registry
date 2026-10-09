import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { 
  User, 
  Settings, 
  Trophy, 
  Leaf, 
  Award, 
  Grid, 
  List,
  Mail,
  Calendar,
  Shield,
  Wallet,
  Plus,
  X,
  Phone,
  User as UserIcon,
  Upload,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Submission, UserProfile } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import LoadingThreeDotsJumping from '../components/ui/LoadingThreeDotsJumping';

const Profile = () => {
  const { profile: currentUserProfile } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const { setCurrentView } = useNavigation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'achievements' | 'verified'>('posts');
  const [globalStats, setGlobalStats] = useState({ users: 0, events: 0 });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    age: '',
    gender: '',
    mobileNo: '',
    photoURL: '',
    bannerURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === currentUserProfile?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (isOwnProfile) {
        setProfile(currentUserProfile);
        setLoading(false);
      } else if (userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, [userId, currentUserProfile, isOwnProfile]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditingProfile(false);
        setShowLoginPopup(false);
      }
    };

    if (isEditingProfile || showLoginPopup) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isEditingProfile, showLoginPopup]);

  useEffect(() => {
    if (!profile) return;

    if (isOwnProfile) {
      setEditForm({
        displayName: profile.displayName || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        mobileNo: profile.mobileNo || '',
        photoURL: profile.photoURL || '',
        bannerURL: profile.bannerURL || ''
      });
    }

    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(subs);
      setLoading(false);

      // TEMPORARY SCRIPT TO FIX MISSING IMAGES
      const fixMangroveImages = async () => {
        if (subs && subs.length > 0) {
          for (const sub of subs) {
            if (sub.type.toLowerCase().includes('mangrove') && !sub.imageUrl.includes('encrypted-tbn0.gstatic')) {
              try {
                await updateDoc(doc(db, 'submissions', sub.id), {
                  imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUVQaI4jOWlWfNu26rrV1-mKVImXrP9AaMBg&s'
                });
              } catch (err) {
                console.error("Failed to repair image:", err);
              }
            }
          }
        }
      };
      fixMangroveImages();
    }, (error) => {
      console.error("Error fetching submissions:", error);
      setLoading(false);
    });

    // Global Stats for all users - Only for officials
    let unsubUsers = () => {};
    const { isOfficial, isGovernment } = currentUserProfile || {};
    if (isOfficial || isGovernment) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setGlobalStats(prev => ({ ...prev, users: snapshot.size }));
      });
    } else {
      setGlobalStats(prev => ({ ...prev, users: 1240 }));
    }

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setGlobalStats(prev => ({ ...prev, events: snapshot.size }));
    });

    return () => {
      unsubscribe();
      unsubUsers();
      unsubEvents();
    };
  }, [profile, isOwnProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUserProfile.uid);
      const privateRef = doc(db, 'users_private', currentUserProfile.uid);
      
      // Update public profile
      await updateDoc(userRef, {
        displayName: editForm.displayName,
        photoURL: editForm.photoURL,
        bannerURL: editForm.bannerURL
      });

      // Update private profile
      await updateDoc(privateRef, {
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender,
        mobileNo: editForm.mobileNo
      });

      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'bannerURL') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (currentUserProfile?.role === 'guest') {
      setShowLoginPopup(true);
    } else {
      setCurrentView('submit_restoration');
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingThreeDotsJumping />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">User not found</h2>
        <p className="text-slate-500 mt-2">The profile you are looking for does not exist.</p>
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="mt-6 glass-button-blue px-6 py-2 rounded-xl font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative pb-24">
      {/* Profile Header */}
      <div className="glass-card rounded-3xl border border-white/40 shadow-xl overflow-hidden bg-white/40 backdrop-blur-xl">
        <div className="h-48 relative group">
          <img 
            src={profile.bannerURL || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=2070"} 
            alt="Banner" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
          {isOwnProfile && (
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="absolute top-6 right-6 bg-white/20 backdrop-blur p-2 rounded-xl text-white hover:bg-white/30 transition-all z-10"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="px-12 pb-12 relative">
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-8">
            <div className="relative">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=005576&color=fff&size=200`} 
                alt="" 
                className="w-40 h-40 rounded-3xl border-8 border-white shadow-xl object-cover bg-white"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#005576] text-white p-2 rounded-xl border-4 border-white shadow-lg">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1 mb-4">
              <h2 className="text-3xl font-bold text-slate-900">{profile.displayName}</h2>
              <div className="flex flex-wrap items-center gap-6 mt-2 text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                {profile.mobileNo && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{profile.mobileNo}</span>
                  </div>
                )}
              </div>
            </div>
            {isOwnProfile && !(profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com') && (
              <div className="flex gap-4 mb-4">
                <button 
                  onClick={() => setCurrentView('wallet')}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Wallet className="w-5 h-5" /> Wallet
                </button>
              </div>
            )}
          </div>

          <div className={cn("grid gap-6 pt-8 border-t border-slate-200/50", 
            (profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com') ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
            {[
              ...(!(profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com') 
                ? [{ label: 'Carbon Credits', value: 1400, icon: Trophy, color: 'text-amber-500' }] 
                : []),
              { label: 'Verified Projects', value: (!(profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com') ? 3 : (submissions.filter(s => s.status === 'approved').length || 0)), icon: Leaf, color: 'text-emerald-500' },
              { label: 'Registry Users', value: globalStats.users, icon: User, color: 'text-blue-500' },
              { label: 'Events Hosted', value: globalStats.events, icon: Calendar, color: 'text-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                  <span className="text-xl font-bold text-slate-900">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('posts')}
              className={cn(
                "pb-4 font-bold text-sm transition-all relative",
                activeTab === 'posts' ? "text-[#005576]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Posts
              {activeTab === 'posts' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#005576] rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('achievements')}
              className={cn(
                "pb-4 font-bold text-sm transition-all relative",
                activeTab === 'achievements' ? "text-[#005576]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Achievements
              {activeTab === 'achievements' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#005576] rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('verified')}
              className={cn(
                "pb-4 font-bold text-sm transition-all relative",
                activeTab === 'verified' ? "text-[#005576]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Verified
              {activeTab === 'verified' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#005576] rounded-full" />}
            </button>
          </div>
          <div className="flex bg-white/60 backdrop-blur p-1 rounded-xl border border-white/40 shadow-sm">
            <button className="p-2 text-[#005576] bg-white rounded-lg shadow-sm"><Grid className="w-4 h-4" /></button>
            <button className="p-2 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
          </div>
        </div>

        {activeTab === 'posts' || activeTab === 'verified' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20">
                <LoadingThreeDotsJumping />
              </div>
            ) : (activeTab === 'verified' ? submissions.filter(s => s.blockchainVerified) : submissions).length > 0 ? (
              (activeTab === 'verified' ? submissions.filter(s => s.blockchainVerified) : submissions).map((sub) => (
                <motion.div 
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square glass-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-white/40"
                >
                  <img src={sub.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                    <div className="flex items-center justify-between text-white">
                      <p className="text-sm font-bold truncate pr-4">{sub.description}</p>
                      <div className="flex items-center gap-1 text-[#005576] font-bold text-xs">
                        <Trophy className="w-3 h-3" />
                        {sub.creditsAssigned}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg",
                      sub.status === 'approved' ? "bg-emerald-500 text-white" :
                      sub.status === 'rejected' ? "bg-red-500 text-white" :
                      "bg-amber-500 text-white"
                    )}>
                      {sub.status}
                    </div>
                    {sub.blockchainVerified && (
                      <div className="bg-blue-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full glass-card rounded-3xl p-20 text-center border border-white/40 bg-white/40 backdrop-blur-xl shadow-sm">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Leaf className="text-slate-300 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No posts yet</h3>
                <p className="text-slate-500">Your restoration activities will appear here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'First Planting', desc: 'Submit your first restoration activity.', icon: Leaf, unlocked: true },
              { title: 'Carbon Guardian', desc: 'Earn your first 1,000 credits.', icon: Trophy, unlocked: true },
              { title: 'Event Volunteer', desc: 'Join your first community event.', icon: Calendar, unlocked: false },
              { title: 'Top Contributor', desc: 'Reach the top 10 on the leaderboard.', icon: Award, unlocked: false },
            ].map((badge, i) => (
              <div key={i} className={cn(
                "glass-card p-8 rounded-3xl border border-white/40 text-center transition-all bg-white/40 backdrop-blur-xl",
                badge.unlocked ? "shadow-sm hover:shadow-md" : "opacity-50 grayscale"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm",
                  badge.unlocked ? "bg-white text-[#005576]" : "bg-slate-100 text-slate-400"
                )}>
                  <badge.icon className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">{badge.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{badge.desc}</p>
                {!badge.unlocked && <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locked</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {isOwnProfile && !(profile?.role === 'official' || profile?.role === 'admin' || profile?.email === 'work.aditipatwa@gmail.com') && (
        <button 
          onClick={handleCreatePost}
          className="fixed bottom-8 right-8 w-16 h-16 glass-button-blue rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 z-40"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditingProfile(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Edit Profile</h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={editForm.displayName}
                    onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#005576] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Age</label>
                    <input 
                      type="number" 
                      value={editForm.age}
                      onChange={e => setEditForm({...editForm, age: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#005576] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                    <select 
                      value={editForm.gender}
                      onChange={e => setEditForm({...editForm, gender: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#005576] focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile No.</label>
                  <input 
                    type="tel" 
                    value={editForm.mobileNo}
                    onChange={e => setEditForm({...editForm, mobileNo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#005576] focus:border-transparent outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Profile Photo</label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm shrink-0">
                      {editForm.photoURL ? (
                        <img src={editForm.photoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 gap-1.5">
                      <input 
                        type="file" 
                        ref={profileInputRef}
                        onChange={(e) => handleFileChange(e, 'photoURL')}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Device
                      </button>
                      {editForm.photoURL && (
                        <button 
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, photoURL: '' }))}
                          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100 text-[10px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Banner Image</label>
                  <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-200 border border-white shadow-sm">
                      {editForm.bannerURL ? (
                        <img src={editForm.bannerURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <input 
                        type="file" 
                        ref={bannerInputRef}
                        onChange={(e) => handleFileChange(e, 'bannerURL')}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Device
                      </button>
                      {editForm.bannerURL && (
                        <button 
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, bannerURL: '' }))}
                          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100 text-[10px] font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full glass-button-blue py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Login Popup */}
      <AnimatePresence>
        {showLoginPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLoginPopup(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative"
            >
              <button 
                onClick={() => setShowLoginPopup(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-[#005576]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Login Required</h3>
              <p className="text-slate-500 mb-6 text-sm">
                You need to be logged in to create a new restoration post. Join our community to start making an impact!
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowLoginPopup(false);
                    // Navigate to auth or landing
                    window.location.href = '/auth';
                  }}
                  className="w-full glass-button-blue py-3 rounded-xl font-bold"
                >
                  Go to Login
                </button>
                <button 
                  onClick={() => setShowLoginPopup(false)}
                  className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
