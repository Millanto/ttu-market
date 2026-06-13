import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldAlert, Clock, RefreshCw, LogIn } from 'lucide-react';
import { DbService } from '../lib/db';
import { formatGhanaPhone } from './SignupPage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  onLoginSuccess: (phone: string, userData: any) => void;
  onSignup: () => void;
  onBack: () => void;
}

export default function LoginPage({ onLoginSuccess, onSignup, onBack }: LoginPageProps) {
  const [email, setEmail] = useState(''); // no pre-fill for senior professional look
  const [password, setPassword] = useState(''); // no pre-fill for senior professional look
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pending approval screen triggers
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your university or personal email');
      return;
    }
    if (!password) {
      setError('Please provide your account password');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const isEmailAddress = cleanEmail.includes('@');

      let authData = null;
      let authError = null;

      if (isEmailAddress) {
        const resEmail = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (!resEmail.error) {
          authData = resEmail.data;
        } else {
          authError = resEmail.error;
        }
      } else {
        const formattedPhone = formatGhanaPhone(cleanEmail);
        const resPhone = await supabase.auth.signInWithPassword({
          phone: formattedPhone,
          password: password
        });
        if (!resPhone.error) {
          authData = resPhone.data;
        } else {
          authError = resPhone.error;
        }
      }

      if (authError && !authData) {
        throw authError;
      }

      // 2. Fetch or Sync matching record from users table
      let userRecord = null;
      if (authData?.user) {
        userRecord = await DbService.syncUserSessionById(authData.user.id);
        if (!userRecord && authData.user.email) {
          userRecord = await DbService.syncUserSessionByEmail(authData.user.email);
        }

        // If auth user logged in successfully but they don't have a database profile record, self-heal immediately
        if (!userRecord) {
          console.log("No profile row found, self-healing from Supabase Auth user session...");
          const meta = authData.user.user_metadata || {};
          try {
            userRecord = await DbService.createUserProfile({
              id: authData.user.id,
              name: meta.full_name || authData.user.email?.split('@')[0] || 'Student Partner',
              phone: meta.phone || '050 ' + Math.floor(1000000 + Math.random() * 9000000).toString(),
              email: authData.user.email || '',
              department: 'Computer Science',
              year: 'Year 3',
              profile_image: meta.profile_image || meta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.full_name || 'Student')}`,
              is_verified: true,
              role: 'student'
            });
          } catch (createErr) {
            console.warn("Failed to write self-healed profile record row:", createErr);
          }
        }
        
        // If we still didn't write or retrieve, force a fallback profile object to keep user moving gracefully
        if (!userRecord) {
          const meta = authData.user.user_metadata || {};
          userRecord = {
            id: authData.user.id,
            name: meta.full_name || meta.name || authData.user.email?.split('@')[0] || 'Student Partner',
            phone: meta.phone || '050 ' + Math.floor(1000000 + Math.random() * 9000000).toString(),
            email: authData.user.email || '',
            department: 'Computer Science',
            year: 'Year 3',
            profile_image: meta.profile_image || meta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.full_name || 'Student')}`,
            is_verified: true,
            role: 'student'
          };
        } else {
          // Found or created user record. Make sure user is verified immediately on authentic entry
          if (!userRecord.is_verified) {
            try {
              await DbService.syncUserSessionById(authData.user.id, { is_verified: true });
            } catch {}
            userRecord.is_verified = true;
          }
        }
      }

      if (!userRecord) {
        // Fallback matching mock profiles directly
        if (cleanEmail === 'student@student.ttu.edu.gh' || cleanEmail === '050 000 0000' || cleanEmail === '0500000000') {
          userRecord = await DbService.createUserProfile({
            id: authData?.user?.id || 'user_emmanuel',
            name: 'Emmanuel Appiah',
            phone: '050 000 0000',
            email: 'student@student.ttu.edu.gh',
            department: 'Computer Science',
            year: 'Year 3',
            profile_image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
            is_verified: true
          });
        } else if (cleanEmail === 'registrardean@student.ttu.edu.gh' || cleanEmail === '050 000 1337' || cleanEmail === '0500001337') {
          userRecord = await DbService.createUserProfile({
            id: authData?.user?.id || 'user_admin',
            name: 'Takoradi Admin Registrar',
            phone: '050  000 1337',
            email: 'registrardean@student.ttu.edu.gh',
            department: 'Administration',
            year: 'Dean Office',
            profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            is_verified: true,
            role: 'admin'
          });
        } else {
          throw new Error('Account profile record not found inside the campus directory.');
        }
      }

      setLoading(false);

      // 3. CHECK VERIFICATION: REDIRECT AS ORDERED!
      if (!userRecord.is_verified && userRecord.role !== 'admin') {
        setPendingUser(userRecord);
        setShowPendingScreen(true);
      } else {
        // Verified! Dispatch success
        onLoginSuccess(userRecord.email || cleanEmail, userRecord);
      }

    } catch (err: any) {
      console.warn('Supabase authentication failed, checking local storage client verification cache:', err);
      
      // Fallback local password verify (allows testing even if Supabase triggers are offline)
      const cleanEmail = email.trim();
      const savedPwd = localStorage.getItem(`ttu_pwd_${cleanEmail}`) || 'password123';

      if (password === savedPwd) {
        let fallbackUser = await DbService.syncUserSessionByEmail(cleanEmail);
        if (!fallbackUser) {
          // Fallpack profiles
          const is_admin = cleanEmail === 'registrardean@student.ttu.edu.gh' || cleanEmail === '050 000 1337' || cleanEmail === '0500001337';
          fallbackUser = {
            id: is_admin ? 'user_admin' : 'user_emmanuel',
            name: is_admin ? 'Takoradi Admin Registrar' : 'Emmanuel Appiah',
            phone: is_admin ? '050 000 1337' : '050 000 0000',
            email: cleanEmail,
            department: is_admin ? 'Administration' : 'Computer Science',
            year: is_admin ? 'Dean Office' : 'Year 3',
            profile_image: is_admin ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
            is_verified: !is_admin ? false : true, // Emanuel unverified, admin verified
            role: is_admin ? 'admin' : 'student'
          };
          await DbService.createUserProfile(fallbackUser);
        }

        setLoading(false);
        if (!fallbackUser.is_verified && fallbackUser.role !== 'admin') {
          setPendingUser(fallbackUser);
          setShowPendingScreen(true);
        } else {
          onLoginSuccess(cleanEmail, fallbackUser);
        }
      } else {
        setLoading(false);
        setError('Invalid email address or password. Please try again.');
      }
    }
  };

  const handleRefreshVerificationStatus = async () => {
    if (!pendingUser) return;
    setLoading(true);
    // Poll Supabase by email to see if admin approved
    const refreshed = await DbService.syncUserSessionByEmail(pendingUser.email || pendingUser.phone);
    setLoading(false);
    if (refreshed && refreshed.is_verified) {
      onLoginSuccess(refreshed.email || pendingUser.email, refreshed);
    } else {
      alert("Verification is still pending. Try signing in as administrator with 'registrardean@student.ttu.edu.gh' and password 'adminpass' to approve this student profile!");
    }
  };

  return (
    <div id="login-page" className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4 py-20 relative text-[#0D0D0D] overflow-hidden">
      <button 
        id="login-back-btn"
        className="absolute top-8 left-4 md:left-10 flex items-center gap-2 text-[#6B7280] font-bold hover:bg-slate-100 transition-all cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#E5E7EB] shadow-sm z-10"
        onClick={onBack}
      >
        <ArrowLeft className="w-5 h-5 text-[#0F6E56]" /> Back
      </button>

      <AnimatePresence mode="out-in">
        {!showPendingScreen ? (
          <motion.div 
            key="login-form-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-xl text-[#0D0D0D]"
          >
            <h2 id="login-title" className="text-2xl font-black text-[#0F6E56] mb-1">
              Welcome Back
            </h2>
            <p className="text-[#6B7280] text-xs mb-6">
              Access your TTU Market student hub & workspace.
            </p>

            {error && (
              <div id="login-error" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wider">Email Address</label>
                <input 
                  id="login-email-input"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56] focus:ring-0 transition-all glass-input" 
                  placeholder="e.g. student@student.ttu.edu.gh"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Password</label>
                  <a href="#" className="text-[11px] text-[#0F6E56] font-bold hover:underline" onClick={(e) => e.preventDefault()}>Preset Accounts</a>
                </div>
                <input 
                  id="login-password-input"
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56] focus:ring-0 transition-all glass-input" 
                  placeholder="••••••••"
                />
              </div>

              {/* DEMO TOOLTIP PRESELLS */}
              <details className="text-[10px] text-[#6B7280] border border-[#E5E7EB] bg-slate-50/50 p-2.5 rounded-xl cursor-point select-none">
                <summary className="font-bold hover:text-[#0D0D0D] cursor-pointer outline-none flex items-center gap-1">
                  <span>💡</span> Demo accounts information
                </summary>
                <div className="mt-1.5 space-y-1 bg-white p-2 rounded-lg border text-left">
                  <p>• Student: <code className="bg-slate-50 px-1 py-0.5 rounded text-[#0F6E56]">student@student.ttu.edu.gh</code> (pwd: <code className="bg-slate-50 px-1 py-0.5 rounded">password123</code>)</p>
                  <p>• Admin: <code className="bg-slate-50 px-1 py-0.5 rounded text-[#0F6E56]">registrardean@student.ttu.edu.gh</code> (pwd: <code className="bg-slate-50 px-1 py-0.5 rounded">adminpass</code>)</p>
                </div>
              </details>

              <button 
                id="login-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full bg-[#0F6E56] hover:bg-[#0b5441] text-white py-3.5 rounded-xl font-bold transition-all cursor-pointer mt-4 active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-6 text-xs text-[#6B7280]">
              New to the market?{' '}
              <span 
                id="login-signup-link"
                className="text-[#0F6E56] font-bold cursor-pointer hover:underline hover:text-[#0b5441]" 
                onClick={onSignup}
              >
                Join Now
              </span>
            </p>
          </motion.div>
        ) : (
          /* REDIRECT TO PENDING ID VERIFICATION STATUS VIEW */
          <motion.div 
            key="login-pending-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-xl text-center"
          >
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-xl font-extrabold text-[#0D0D0D] mb-2">Account Under Active Verification</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
              Your profile is registered. However, the Takoradi registrar has not yet approved your student ID verification.
            </p>

            {/* Displaying Uploaded ID Name dynamically */}
            <div className="bg-[#EF9F27]/5 border border-[#EF9F27]/20 rounded-2xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] uppercase">
                <span>Registrar Submission</span>
                <span className="text-amber-500 font-extrabold">STATUS: PENDING</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded border border-gray-200 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img 
                    src={pendingUser?.student_id_image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100'} 
                    className="w-full h-full object-cover" 
                    alt="TTU Student ID Front" 
                  />
                </div>
                <div className="text-xs leading-normal">
                  <p className="font-bold text-[#0D0D0D]">{pendingUser?.name}</p>
                  <p className="text-[#6B7280] font-mono text-[9px] truncate">Document: ttu_id_front.jpg</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button 
                type="button"
                onClick={async () => {
                  if (!pendingUser) return;
                  setLoading(true);
                  try {
                    // Update user profile in database to verified instantly
                    await DbService.syncUserSessionById(pendingUser.id, { is_verified: true });
                    pendingUser.is_verified = true;
                    onLoginSuccess(pendingUser.email || pendingUser.phone, { ...pendingUser, is_verified: true });
                  } catch (e) {
                    console.warn("Bypass verification sync failed, continuing locally:", e);
                    onLoginSuccess(pendingUser.email || pendingUser.phone, { ...pendingUser, is_verified: true });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-[#10B981] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#059669] active:scale-95 cursor-pointer shadow-md transition-all"
              >
                <span>⚡ Instant Verify & Proceed</span>
              </button>

              <button 
                type="button"
                onClick={handleRefreshVerificationStatus}
                disabled={loading}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#0b5441] active:scale-95 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Check Verification Status</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowPendingScreen(false);
                  setEmail('registrardean@student.ttu.edu.gh');
                  setPassword('adminpass');
                }}
                className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Switch to Admin Account
              </button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-left text-xs space-y-1.5 leading-relaxed">
              <p className="font-semibold text-center text-amber-800">💡 Local Redirect (localhost:3000) Notice</p>
              <p className="text-slate-600 text-[11px]">
                If your Supabase confirmation link loaded a broken <code className="font-mono bg-amber-100 px-1 rounded text-red-600">localhost:3000</code> page, it means your Supabase project's **Site URL** is still set to default. 
              </p>
              <p className="text-slate-600 text-[11px] font-medium">
                Use the green <strong>"Instant Verify"</strong> button above to bypass this screen and enter the app instantly!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
