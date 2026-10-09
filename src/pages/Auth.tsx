import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Waves, Mail, Lock, User, Chrome, ShieldCheck, UserCircle, Quote } from 'lucide-react';
import { motion } from 'motion/react';

const QUOTES = [
  { text: "Blue carbon ecosystems are among the most efficient carbon sinks on Earth.", author: "Dr. S. Rajan" },
  { text: "Mangroves protect our coastlines and provide a home for countless species.", author: "Marine Biologist" },
  { text: "Every mangrove planted is a step towards a more resilient planet.", author: "Coastal Guardian" },
  { text: "The ocean is the lungs of our planet; let's help it breathe.", author: "Ocean Advocate" },
  { text: "Restoring mangroves is not just about carbon; it's about life.", author: "Climate Scientist" }
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isSignupParam = searchParams.get('signup') === 'true';
  const [isSignup, setIsSignup] = useState(isSignupParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(QUOTES[0]);
  const navigate = useNavigate();

  useEffect(() => {
    setIsSignup(isSignupParam);
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, [isSignupParam]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        
        // Create public user profile
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          displayName,
          photoURL: '',
          bannerURL: '',
          role: 'user',
          totalCredits: 0,
          restorationsCount: 0,
          createdAt: new Date().toISOString()
        }).catch(err => {
          console.error("Signup users setDoc error:", err);
          throw err;
        });

        // Create private user profile
        await setDoc(doc(db, 'users_private', userCredential.user.uid), {
          email,
          age: null,
          gender: '',
          mobileNo: '',
          bankDetails: null
        }).catch(err => {
          console.error("Signup users_private setDoc error:", err);
          throw err;
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('If an account exists with this email, a password reset link has been sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create public user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          bannerURL: '',
          role: 'user',
          totalCredits: 0,
          restorationsCount: 0,
          createdAt: new Date().toISOString()
        }).catch(err => {
          console.error("Google users setDoc error:", err);
          throw err;
        });

        // Create private user profile
        await setDoc(doc(db, 'users_private', user.uid), {
          email: user.email || '',
          age: null,
          gender: '',
          mobileNo: '',
          bankDetails: null
        }).catch(err => {
          console.error("Google users_private setDoc error:", err);
          throw err;
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOfficialLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const email = 'moes.official@registry.gov';
      const password = 'officialpassword123';
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(result.user, { displayName: 'MoES Official' });
          
          // Create public user profile
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            displayName: 'MoES Official',
            photoURL: '',
            bannerURL: '',
            role: 'admin',
            totalCredits: 0,
            restorationsCount: 0,
            createdAt: new Date().toISOString()
          }).catch(err => {
            console.error("Official users setDoc error:", err);
            throw err;
          });

          // Create private user profile
          await setDoc(doc(db, 'users_private', result.user.uid), {
            email,
            age: null,
            gender: '',
            mobileNo: '',
            bankDetails: null
          }).catch(err => {
            console.error("Official users_private setDoc error:", err);
            throw err;
          });
        } else {
          throw e;
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError('Quick login failed. Please try manual login.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      
      // Create public user profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: 'Guest Explorer',
        photoURL: '',
        bannerURL: '',
        role: 'guest',
        totalCredits: 0,
        restorationsCount: 0,
        createdAt: new Date().toISOString()
      }).catch(err => {
        console.error("Guest users setDoc error:", err);
        throw err;
      });

      // Create private user profile
      await setDoc(doc(db, 'users_private', user.uid), {
        email: 'guest@bluecarbon.registry',
        age: null,
        gender: '',
        mobileNo: '',
        bankDetails: null
      }).catch(err => {
        console.error("Guest users_private setDoc error:", err);
        throw err;
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError('Guest login failed.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=2070" 
          alt="Mangroves and Sea" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-5xl w-full h-full max-h-[700px] glass-card rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/30"
      >
        {/* Left Side: Branding & Info */}
        <div className="md:w-5/12 p-8 md:p-10 text-slate-900 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
                <Waves className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight text-emerald-900">BlueCarbon</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-emerald-950">
              Restoring our <br /> 
              <span className="text-emerald-600">coasts.</span>
            </h1>
            
            <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xs">
              Join the Ministry of Earth Sciences initiative to track and reward coastal restoration efforts.
            </p>

            <div className="space-y-3">
              {['Verified Credits', 'Impact Tracking'].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="glass-card !bg-white/40 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-sm">
              <Quote className="w-4 h-4 text-emerald-600 mb-2 opacity-50" />
              <p className="text-xs italic text-slate-800 leading-relaxed">
                "{quote.text}"
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                  {quote.author[0]}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-900">{quote.author}</p>
                  <p className="text-[8px] opacity-60 uppercase tracking-wider">Registry Contributor</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:w-7/12 p-8 md:p-10 bg-white/40 backdrop-blur-sm border-l border-white/20">
          <div className="max-w-sm mx-auto h-full flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {isSignup ? 'Create account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-slate-500">
                {isSignup ? 'Start your restoration journey today' : 'Sign in to access your dashboard'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm text-red-600 p-3 rounded-xl text-xs font-medium mb-4 border border-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50/80 backdrop-blur-sm text-emerald-600 p-3 rounded-xl text-xs font-medium mb-4 border border-emerald-100">
                {success}
              </div>
            )}

            {/* Quick Login Button */}
            <div className="mb-6">
              <button 
                onClick={handleOfficialLogin}
                className="w-full flex items-center justify-center gap-2 p-3 border border-white/50 rounded-3xl bg-white/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all group shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-slate-700">Official Login</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/50"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-bold text-slate-400">
                <span className="px-3 bg-transparent">Or use email</span>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              {isSignup && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/50 rounded-3xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-xs"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/50 rounded-3xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-white/50 rounded-3xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end px-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-3xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100 mt-2"
              >
                {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  {isSignup ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={handleGoogleSignIn} className="p-2 bg-white/50 rounded-lg hover:bg-white transition-colors border border-white/50">
                <Chrome className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
