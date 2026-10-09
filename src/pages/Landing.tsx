import React from 'react';
import { Link } from 'react-router-dom';
import { Waves, Shield, Map, Users, ArrowRight, Globe, Droplets, Wind, Leaf, ShieldCheck, Coins } from 'lucide-react';
import { motion } from 'motion/react';
import { PixelImage } from '../components/PixelImage';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { isOfficial, isGovernment, user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-50 relative overflow-x-hidden">
      {/* Diagonal Fade Grid Background - Top Left */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #d1d5db 1px, transparent 1px),
            linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
        }}
      />
      
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="sticky top-6 z-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between px-8 py-4 glass-card !rounded-full shadow-xl">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
                  <Waves className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">BlueCarbon</span>
              </div>
              <div className="flex items-center gap-8">
                <a href="#about" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors text-sm">About</a>
                <a href="#impact" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors text-sm">Impact</a>
                {user ? (
                  <>
                    {isOfficial && (
                      <Link to="/dashboard" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Official Portal
                      </Link>
                    )}
                    {isGovernment && (
                      <Link to="/dashboard" className="text-blue-600 font-bold hover:text-blue-700 transition-colors text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Gov Portal
                      </Link>
                    )}
                    {!isOfficial && !isGovernment && (
                      <Link to="/dashboard" className="text-slate-900 font-semibold hover:text-emerald-600 transition-colors text-sm">Dashboard</Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="text-slate-900 font-semibold hover:text-emerald-600 transition-colors text-sm">Login</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="glass-card !rounded-[3rem] p-6 md:p-10 grid lg:grid-cols-2 gap-10 items-center shadow-2xl shadow-emerald-900/5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100/50 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold mb-4 backdrop-blur-sm">
                <Globe className="w-3.5 h-3.5" />
                Preserving Coastal Ecosystems
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-[1.1] mb-6">
                Restore the <span className="text-emerald-600">Blue Carbon</span> of our Oceans.
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Record, verify, and scale coastal ecosystem restoration. Join a global community of citizens and NGOs protecting mangroves, seagrass, and wetlands.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/auth?signup=true" className="inline-flex items-center glass-button-blue px-8 py-4 rounded-full font-bold text-base gap-2 group">
                  Start Restoring <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#about" className="px-8 py-4 rounded-full font-bold text-base text-slate-600 hover:bg-white/50 transition-all border border-slate-200/50 glass-card !border-slate-200/50">
                  Learn More
                </a>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative z-10 border-4 border-white/50">
                <img 
                  src="https://imgs.search.brave.com/eA0uo1nLwde-jiVrDbjs3WtRvcQ2w_FYirgKRmFyV48/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA3Lzc0LzkzLzkz/LzM2MF9GXzc3NDkz/OTMzOV9kdnYxVGp6/Y1VJaFgwa1REMHYy/NDZWVW15bjh3TUs2/Yy5qcGc" 
                  alt="Coastal Ecosystem Aerial" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ecosystems Section */}
      <section id="about" className="py-32 bg-transparent">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">The Power of Coastal Ecosystems</h2>
            <p className="text-lg text-slate-600">Coastal "Blue Carbon" ecosystems can sequester up to 10x more carbon than tropical forests.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Mangroves', 
                desc: 'Dense coastal forests that protect shorelines and store massive amounts of carbon in their roots.',
                icon: Leaf,
                img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUVQaI4jOWlWfNu26rrV1-mKVImXrP9AaMBg&s'
              },
              { 
                title: 'Seagrass', 
                desc: 'Underwater meadows that provide habitat for marine life and act as powerful carbon sinks.',
                icon: Droplets,
                img: 'https://www.teriin.org/sites/default/files/inline-images/Seagrass.png'
              },
              { 
                title: 'Wetlands', 
                desc: 'Coastal marshes and wetlands that filter water and provide critical flood protection.',
                icon: Wind,
                img: 'https://gaiacompany.io/wp-content/uploads/2024/10/Wetland-1.jpg'
              }
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-emerald-100/20">
                <div className="h-56 overflow-hidden relative">
                  <PixelImage 
                    src={item.img} 
                    grid="8x8"
                    grayscaleAnimation={true}
                    pixelFadeInDuration={2000}
                    maxAnimationDelay={1000}
                    colorRevealDelay={0}
                    className="w-full h-full group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                <div className="p-8 bg-white/40 backdrop-blur-xl border-t border-white/20">
                  <div className="bg-emerald-50/50 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-white/30 shadow-sm">
                    <item.icon className="text-emerald-600 w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-32 bg-transparent relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card !rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-emerald-900/5 border border-white relative overflow-hidden"
          >
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 mb-6 shadow-inner border border-emerald-200/50">
                <Leaf className="w-10 h-10" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Impact Carbon Credits
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Impact Carbon Credits represent the verified positive environmental impact you make by restoring coastal ecosystems. They are a digital measure of the carbon sequestered through your direct actions.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm text-center hover:shadow-md transition-shadow">
                <Globe className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2 text-lg">Global Impact</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Every credit represents real, verified carbon removal from the atmosphere.</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm text-center hover:shadow-md transition-shadow">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2 text-lg">Verified Action</h3>
                <p className="text-sm text-slate-600 leading-relaxed">Restoration efforts are rigorously verified by NGOs and the community.</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 backdrop-blur-md p-8 rounded-3xl border border-amber-100 shadow-sm text-center relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative z-10">
                  <Coins className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">Withdrawable</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Credits become fully withdrawable once you earn a total of <strong className="text-amber-600 font-bold">3,500 Impact Carbon Credits</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-100 rounded-3xl p-8 md:p-10 text-center mb-12 shadow-inner">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Ready to make a difference?</h3>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Join our community of restorers today. Start planting mangroves, protecting seagrass, and earning your Impact Carbon Credits. Remember, once you hit the 3,500 credit milestone, your impact becomes withdrawable value!
              </p>
            </div>

            <div className="text-center">
              <Link 
                to="/auth?signup=true" 
                className="inline-flex items-center gap-3 glass-button-blue px-10 py-5 rounded-full font-bold text-lg transition-all hover:-translate-y-1"
              >
                Earn impact carbon credits now! <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-transparent py-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="glass-card !rounded-[3rem] p-12 md:p-20 border border-emerald-100/20 shadow-2xl shadow-emerald-900/5 grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
                  <Waves className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-2xl tracking-tight text-slate-900">BlueCarbon</span>
              </div>
              <p className="text-slate-600 max-w-sm leading-relaxed text-sm">
                Empowering global citizens to restore coastal ecosystems through transparent verification and community action.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-slate-900">Platform</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><Link to="/dashboard" className="hover:text-emerald-600 transition-colors">Carbon Map</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-600 transition-colors">Events</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-slate-900">Legal</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-20 mt-20 border-t border-slate-200/30 text-center text-slate-500 text-xs">
            © 2026 Blue Carbon Restoration Registry. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Landing;
