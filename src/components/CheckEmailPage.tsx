import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendVerificationEmail } from '../lib/sendEmailClient';

interface CheckEmailPageProps {
  email: string;
  onBack: () => void;
  onVerifySuccess: (userData: any) => void;
}

export default function CheckEmailPage({ email, onBack, onVerifySuccess }: CheckEmailPageProps) {
  const [resending, setResending] = useState(false);
  const [sentNotice, setSentNotice] = useState('');
  const [errorNotif, setErrorNotif] = useState('');

  const handleResendLink = async () => {
    if (!email) return;
    setResending(true);
    setSentNotice('');
    setErrorNotif('');

    try {
      // 1. Resend official auth link if Supabase is active
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`
          }
        });
      } catch (authErr) {
        console.warn("Supabase native email resend warning, continuing to Resend service:", authErr);
      }

      // 2. Direct instant Resend SMTP delivery
      const confirmationUrl = `${window.location.origin}/auth/confirm?email=${encodeURIComponent(email)}`;
      await sendVerificationEmail(email, confirmationUrl);
      
      setSentNotice('We re-sent the activation link. Please check your inbox!');
    } catch (err: any) {
      console.warn("Resend email failed:", err);
      setErrorNotif(err.message || 'Resend failed. Please ensure your Resend setup remains valid.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div id="check-email-page" className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4 py-12 md:py-20 relative text-[#0D0D0D] overflow-hidden">
      <button 
        id="check-email-back-btn"
        className="absolute top-8 left-4 md:left-10 flex items-center gap-2 text-[#6B7280] font-bold hover:bg-slate-100 transition-all cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#E5E7EB] shadow-sm z-10"
        onClick={onBack}
      >
        <ArrowLeft className="w-5 h-5 text-[#0F6E56]" /> Back
      </button>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-xl text-center"
      >
        <div id="check-email-mail-icon" className="w-16 h-16 bg-[#0F6E56]/10 rounded-full flex items-center justify-center text-[#0F6E56] mx-auto mb-6">
          <Mail className="w-8 h-8 animate-bounce" />
        </div>

        <h2 id="check-email-title" className="text-2xl font-black text-[#0F6E56] mb-2 leading-tight">
          Check your email
        </h2>
        
        <p className="text-sm text-[#0D0D0D] font-medium mb-4">
          We sent a verification link to <span className="font-extrabold text-[#0F6E56] break-all">{email || "your provided address"}</span>.
        </p>

        <div className="bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-2xl p-4 text-left text-xs text-[#0D0D0D] leading-relaxed mb-6 space-y-2">
          <p className="font-bold flex items-center gap-2 text-[#0F6E56]">
            <CheckCircle className="w-4 h-4" /> Next Steps:
          </p>
          <p>
            1. Click the link in your email to get automatically redirected to the homepage feed fully verified and logged in.
          </p>
          <p className="text-[#6B7280]">
            2. Check your spam folder if you do not see it.
          </p>
        </div>



        {sentNotice && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-[#0F6E56] rounded-xl text-xs font-semibold leading-normal flex items-center gap-2 text-left">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{sentNotice}</span>
          </div>
        )}

        {errorNotif && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorNotif}</span>
          </div>
        )}

        <div className="space-y-3">
          <button 
            type="button"
            disabled={resending}
            onClick={handleResendLink}
            className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#0b5441] active:scale-95 cursor-pointer shadow-md transition-all"
          >
            {resending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Re-sending...</span>
              </>
            ) : (
              <span>Resend Verification Link</span>
            )}
          </button>

          <button 
            type="button"
            onClick={onBack}
            className="w-full bg-slate-50 text-[#6B7280] hover:bg-slate-100 py-3 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all border border-[#E5E7EB]"
          >
            Return to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
