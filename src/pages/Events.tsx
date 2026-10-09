import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Users, ArrowRight, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { cn } from '../lib/utils';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  enrolledUsers?: string[];
}

export const Events: React.FC = () => {
  const { isOfficial, profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    description: '', 
    date: '', 
    location: '' 
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        enrolledUsers: [],
        createdAt: new Date().toISOString()
      });
      setNewEvent({ title: '', description: '', date: '', location: '' });
      setShowCreateForm(false);
      toast.success('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event.');
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!profile) {
      toast.error('Please login to join events.');
      return;
    }
    
    setIsJoining(eventId);
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        enrolledUsers: arrayUnion(profile.uid)
      });
      toast.success('Successfully joined the event!');
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Failed to join event.');
    } finally {
      setIsJoining(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setIsDeleting(eventId);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted successfully.');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event.');
    } finally {
      setIsDeleting(null);
      setEventToDelete(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(evts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <h1 className="text-5xl font-black text-primary-accent tracking-tight">Upcoming Events</h1>
          <p className="text-lg text-primary-text/70 max-w-2xl">
            Join our community in real-world restoration efforts and workshops. 
            Every action counts towards a more sustainable future.
          </p>
        </motion.div>

        {isOfficial && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowCreateForm(true)}
            className="glass-button-blue px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-8 rounded-[32px] space-y-6 border border-blue-100 shadow-xl shadow-blue-50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary-accent flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  New Restoration Event
                </h2>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Event Title</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Mangrove Plantation Drive"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Location</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Sundarbans, West Bengal"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Description</label>
                  <textarea 
                    required
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    placeholder="Describe the event and its goals..."
                  />
                </div>
                <button 
                  type="submit"
                  className="col-span-1 md:col-span-2 glass-button-blue py-4 rounded-xl font-bold text-lg"
                >
                  Publish Event
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {events.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4 rounded-[20px]">
          <Calendar className="w-16 h-16 text-primary-accent/20 mx-auto" />
          <h3 className="text-2xl font-bold text-primary-accent">No Upcoming Events</h3>
          <p className="text-primary-text/60">Check back later for new restoration drives and workshops.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((e, i) => (
            <motion.div 
              key={e.id} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 space-y-8 group hover:bg-white/40 transition-all rounded-[20px]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-primary-accent/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary-accent" />
                  </div>
                  {isOfficial && (
                    <button 
                      onClick={() => setEventToDelete(e.id)}
                      disabled={isDeleting === e.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Event"
                    >
                      {isDeleting === e.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-primary-accent leading-tight">{e.title}</h3>
                <p className="text-sm text-primary-text/70 leading-relaxed">
                  {e.description}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-primary-text/5">
                <div className="flex items-center gap-3 text-primary-accent/60">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{e.location}</span>
                </div>
                <div className="flex items-center gap-3 text-primary-text/50">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">{(e.enrolledUsers?.length || 0)} Attendees Joined</span>
                </div>
                <div className="flex items-center gap-3 text-primary-text/40">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">{e.date}</span>
                </div>
              </div>

              <button 
                onClick={() => handleJoinEvent(e.id)}
                disabled={isJoining === e.id || e.enrolledUsers?.includes(profile?.uid || '')}
                className={cn(
                  "w-full py-4 glass font-bold rounded-xl transition-all flex items-center justify-center gap-2 group/btn",
                  e.enrolledUsers?.includes(profile?.uid || '') 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default" 
                    : "text-primary-accent hover:bg-primary-accent hover:text-white"
                )}
              >
                {isJoining === e.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : e.enrolledUsers?.includes(profile?.uid || '') ? (
                  <>
                    <Users className="w-4 h-4" />
                    Joined
                  </>
                ) : (
                  <>
                    Join Event
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => eventToDelete && handleDeleteEvent(eventToDelete)}
        title="Delete Event"
        message="Are you sure you want to delete this restoration event? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
