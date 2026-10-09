import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { 
  Upload, 
  MapPin, 
  Leaf, 
  Calendar as CalendarIcon, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import EXIF from 'exif-js';
import { ref, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { RestorationType } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Utility to compress images to base64 for fast direct-to-firestore uploading
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
};

const SubmitRestoration = () => {
  const { profile } = useAuth();
  const { setCurrentView, editingSubmission, setEditingSubmission } = useNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(editingSubmission?.imageUrl || null);
  const [description, setDescription] = useState(editingSubmission?.description || '');
  const [type, setType] = useState<RestorationType>(editingSubmission?.type || 'mangrove');
  const [date, setDate] = useState(editingSubmission?.date || new Date().toISOString().split('T')[0]);
  
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number } | null>(
    editingSubmission ? { lat: editingSubmission.latitude, lng: editingSubmission.longitude } : null
  );

  useEffect(() => {
    return () => {
      // Clear editing state on unmount
      setEditingSubmission(null);
    };
  }, [setEditingSubmission]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setGpsData(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));

    // Extract EXIF data
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        EXIF.getData(img as any, function(this: any) {
          const lat = EXIF.getTag(this, "GPSLatitude");
          const latRef = EXIF.getTag(this, "GPSLatitudeRef");
          const lng = EXIF.getTag(this, "GPSLongitude");
          const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

          if (lat && lng) {
            const convertToDecimal = (gps: any, ref: string) => {
              const d = gps[0].numerator / gps[0].denominator;
              const m = gps[1].numerator / gps[1].denominator;
              const s = gps[2].numerator / gps[2].denominator;
              let decimal = d + m / 60 + s / 3600;
              if (ref === "S" || ref === "W") decimal *= -1;
              return decimal;
            };

            const latitude = convertToDecimal(lat, latRef);
            const longitude = convertToDecimal(lng, lngRef);
            setGpsData({ lat: latitude, lng: longitude });
          } else {
            // Bypass GPS requirement for now
            setGpsData({ lat: 0, lng: 0 });
          }
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!editingSubmission && (!image || !gpsData)) return;

    setLoading(true);
    setError(null);

    try {
      let imageUrl = editingSubmission?.imageUrl || '';

      // 1. Process Image
      if (image) {
        try {
          imageUrl = await compressImage(image);
        } catch (e) {
          throw new Error("Failed to process image. Please try a different photo.");
        }
      }

      const submissionData = {
        userId: profile.uid,
        userName: profile.displayName,
        userPhoto: profile.photoURL,
        imageUrl,
        description,
        type,
        latitude: gpsData?.lat ?? editingSubmission?.latitude ?? 0,
        longitude: gpsData?.lng ?? editingSubmission?.longitude ?? 0,
        date,
        status: 'pending',
        creditsAssigned: 0,
        updatedAt: new Date().toISOString(),
        createdAt: editingSubmission?.createdAt || new Date().toISOString()
      };

      // 2. Create or Update Submission Record
      if (editingSubmission) {
        await updateDoc(doc(db, 'submissions', editingSubmission.id), submissionData);
      } else {
        await addDoc(collection(db, 'submissions'), submissionData);
        // 3. Update User Stats (increment restorationsCount) - only for new submissions
        await updateDoc(doc(db, 'users', profile.uid), {
          restorationsCount: increment(1)
        });
      }

      setSuccess(true);
      toast.success("Submission successful! Redirecting...");
      setTimeout(() => setCurrentView('dashboard'), 2000);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Submit Restoration</h2>
        <p className="text-slate-500 mt-1">Share your impact with the community. Photos are now accepted without strict GPS verification.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleSubmit} className="glass-card p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            {/* Image Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                preview ? "border-emerald-500" : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-bold flex items-center gap-2">
                      <Upload className="w-5 h-5" /> Change Photo
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="text-emerald-600 w-8 h-8" />
                  </div>
                  <p className="text-slate-900 font-bold">Click to upload photo</p>
                  <p className="text-slate-500 text-sm mt-1">JPG, PNG up to 10MB.</p>
                </div>
              )}
            </div>

            {/* GPS Status */}
            <AnimatePresence>
              {gpsData && (gpsData.lat !== 0 || gpsData.lng !== 0) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card !bg-emerald-50 p-4 rounded-3xl flex items-center gap-3 border border-emerald-100"
                >
                  <MapPin className="text-emerald-600 w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-900">Location Verified</p>
                    <p className="text-xs text-emerald-700">{gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}</p>
                  </div>
                  <CheckCircle2 className="text-emerald-600 w-5 h-5" />
                </motion.div>
              )}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="glass-card !bg-red-50 p-4 rounded-3xl flex items-start gap-3 border border-red-100"
                >
                  <AlertCircle className="text-red-600 w-5 h-5 mt-0.5" />
                  <p className="text-sm font-medium text-red-900 flex-1">{error}</p>
                  <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Restoration Type</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['mangrove', 'seagrass', 'wetland'] as RestorationType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "py-3 rounded-3xl border-2 font-bold text-sm capitalize transition-all",
                        type === t 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your restoration activity..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date of Activity</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !image || !gpsData || success}
              className="w-full py-4 glass-button-blue rounded-3xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Uploading...' : success ? 'Submitted Successfully!' : 'Submit for Verification'}
              {success && <CheckCircle2 className="w-6 h-6" />}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <div className="glass-card !bg-slate-900/90 rounded-3xl p-8 text-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400 w-6 h-6" />
              Verification Process
            </h3>
            <div className="space-y-6">
              {[
                { step: '01', title: 'Upload Photo', desc: 'Upload a photo taken at the site. GPS metadata is optional but helpful.' },
                { step: '02', title: 'Admin Review', desc: 'Our team verifies the location and evidence of restoration activity.' },
                { step: '03', title: 'Earn Credits', desc: 'Once approved, carbon credits are added to your wallet and your post goes live.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-emerald-400 font-bold text-lg">{item.step}</span>
                  <div>
                    <h4 className="font-bold mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card !bg-emerald-50/90 rounded-3xl p-8 border border-emerald-100">
            <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <Leaf className="text-emerald-600 w-5 h-5" />
              Impact Tip
            </h3>
            <p className="text-emerald-800 text-sm leading-relaxed">
              Mangrove restoration earns the highest credits due to superior carbon sequestration rates in coastal ecosystems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default SubmitRestoration;
