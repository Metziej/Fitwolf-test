import React, { useState } from 'react';
import { UserRole, Goal, UnitSystem, UserProfile } from '../types.ts';
import { auth, db, handleFirestoreError, OperationType } from '../firebase.ts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            onLogin(userDoc.data() as UserProfile);
          } else {
            // If profile doesn't exist for some reason, create a default one
            const defaultProfile: UserProfile = {
              id: user.uid,
              username: user.displayName || email.split('@')[0].toUpperCase(),
              email: user.email!,
              role: UserRole.HUNTER,
              tierId: 'free',
              weight: 80,
              height: 180,
              age: 25,
              goal: Goal.CUT,
              units: UnitSystem.METRIC,
              kcal: 2500,
              protein: 160,
              carbs: 250,
              fats: 70,
              scaleRatio: 1,
              activityLevel: 1.55,
              characterConfig: { headSize: 1, muscleMass: 1, height: 1, eyeColor: '#FF2A2A' },
              stats: { str: 0, vit: 0, int: 0, recovery: 0 }
            };
            await setDoc(doc(db, 'users', user.uid), defaultProfile);
            onLogin(defaultProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateAuthProfile(user, { displayName: username });

        const newProfile: UserProfile = {
          id: user.uid,
          username: username.toUpperCase(),
          email: email,
          role: email.includes('admin') ? UserRole.ADMIN : UserRole.HUNTER,
          tierId: 'free',
          weight: 80,
          height: 180,
          age: 25,
          goal: Goal.CUT,
          units: UnitSystem.METRIC,
          kcal: 2500,
          protein: 160,
          carbs: 250,
          fats: 70,
          scaleRatio: 1,
          activityLevel: 1.55,
          characterConfig: { headSize: 1, muscleMass: 1, height: 1, eyeColor: '#FF2A2A' },
          stats: { str: 0, vit: 0, int: 0, recovery: 0 }
        };

        try {
          await setDoc(doc(db, 'users', user.uid), newProfile);
          onLogin(newProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email.");
      setMode('login');
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md border-2 border-[#FF2A2A] bg-[#050505] p-8 shadow-[0_0_50px_rgba(255,42,42,0.2)]">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase mb-2">FITWOLF</h1>
          <p className="text-[10px] uppercase font-black tracking-[0.4em] text-[#FF2A2A]">System Access Required</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 text-red-500 text-[10px] uppercase font-black tracking-widest">
            Error: {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleAuth} className="space-y-6">
            <input type="email" placeholder="EMAIL@SYSTEM.NET" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <input type="password" placeholder="PASSWORD" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <button type="submit" disabled={loading} className="w-full bg-[#FF2A2A] text-black font-black py-4 uppercase tracking-[0.5em] shadow-[0_0_20px_#FF2A2A] disabled:opacity-50">
              {loading ? 'INITIALIZING...' : 'Initialize Link'}
            </button>
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setMode('register')} className="text-[9px] uppercase font-black text-gray-500 hover:text-white">New Hunter?</button>
              <button type="button" onClick={() => setMode('forgot')} className="text-[9px] uppercase font-black text-gray-500 hover:text-white">Lost Credentials?</button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleAuth} className="space-y-6">
            <input type="text" placeholder="HUNTER DESIGNATION" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <input type="email" placeholder="EMAIL" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <input type="password" placeholder="CREATE PASSWORD" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <button type="submit" disabled={loading} className="w-full bg-[#FF2A2A] text-black font-black py-4 uppercase tracking-[0.5em] disabled:opacity-50">
              {loading ? 'CREATING...' : 'Create Identity'}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-[9px] uppercase font-black text-gray-500 mt-2">Back to Login</button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <p className="text-[10px] text-gray-500 uppercase font-black leading-relaxed">Enter your email to receive a secure override link.</p>
            <input type="email" placeholder="REGISTERED EMAIL" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-[#222] p-4 text-xs font-black text-white outline-none focus:border-[#FF2A2A]" />
            <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 uppercase tracking-[0.3em] disabled:opacity-50">
              {loading ? 'SENDING...' : 'Send Reset Code'}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-[9px] uppercase font-black text-gray-500 mt-2">Back to Login</button>
          </form>
        )}
      </div>
    </div>
  );
}
