import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  BookOpen, 
  CheckCircle2, 
  LogOut, 
  Trash2, 
  Award,
  DollarSign,
  PlusCircle,
  TrendingDown,
  Clock,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Send,
  X,
  Camera
} from 'lucide-react';
import { User, Service } from '../types';
import { DbService, uploadFileToBucket } from '../lib/db';

interface ProfileViewProps {
  user: User;
  onLogout: () => void;
  myServices: Service[];
  onDeleteService: (serviceId: string) => void;
  onUpdateSchoolInfo: (data: { department: string; year: string; profileImage?: string }) => void;
  onWalletUpdated: (newAmt: number) => void;
}

export default function ProfileView({
  user,
  onLogout,
  myServices,
  onDeleteService,
  onUpdateSchoolInfo,
  onWalletUpdated,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [eduDept, setEduDept] = useState(user.department);
  const [eduYear, setEduYear] = useState(user.year);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Profile picture photo exceeds maximum limit of 5MB');
        return;
      }
      setIsUploadingPhoto(true);

      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      try {
        const cleanPhone = user.phone.replace(/\s+/g, '');
        const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
        const targetPath = `${cleanPhone}_profile_${Date.now()}.${extension}`;
        let profileImageUrl = await uploadFileToBucket('student-ids', targetPath, file);
        
        // Base64 storage fallback if bucketing is offline / inactive on user's Supabase instance
        if (!profileImageUrl || profileImageUrl.includes('unsplash.com')) {
          try {
            profileImageUrl = await blobToBase64(file);
          } catch (e) {
            console.warn("Could not encode profile photo to base64:", e);
          }
        }

        onUpdateSchoolInfo({
          department: user.department,
          year: user.year,
          profileImage: profileImageUrl
        });
      } catch (err) {
        console.error("Error uploading profile picture:", err);
        alert('Failed to update the profile picture. Please try again.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // Wallet states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState(user.phone);
  const [momoName, setMomoName] = useState(user.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const logs = await DbService.queryTransactions(user.phone);
      setTransactions(logs);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSaveInfo = () => {
    onUpdateSchoolInfo({ department: eduDept, year: eduYear });
    setIsEditing(false);
  };

  const getHustleProgressPercentage = () => {
    const current = user.completedJobsCount || 0;
    const target = 15;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Paystack Deposits Integration (Task 9)
  const handleAddFundsPaystack = () => {
    const depositAmtStr = prompt("Enter amount to deposit inside your Escrow Deposit Wallet (GHS):", "50");
    if (!depositAmtStr) return;
    const depositAmt = parseFloat(depositAmtStr);
    if (isNaN(depositAmt) || depositAmt <= 0) {
      alert("Please provide a valid deposit bounty amount.");
      return;
    }

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
    const email = `${user.phone.replace(/\s+/g, '')}@student.ttu.edu.gh`;

    try {
      // Trigger paystack popup
      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email: email,
        amount: Math.round(depositAmt * 100), // convert to pesewas
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        callback: async (response: any) => {
          // Success callback
          const updatedBalance = (user.earnedGHS || 0) + depositAmt;
          
          // 1. Sync User Balance row on Supabase users table
          await DbService.syncUserSession(user.phone, { earned_ghs: updatedBalance });

          // 2. Add Transaction tracking line in transactional ledger
          const txn = {
            id: `txn_${Date.now()}`,
            user_id: user.phone,
            amount: depositAmt,
            type: 'deposit',
            status: 'completed',
            reference: response.reference,
            timestamp: new Date().toISOString()
          };
          await DbService.addManualTransaction(txn);
          
          // 3. Inform Parents App
          onWalletUpdated(updatedBalance);
          alert(`Successfully deposited GHS ${depositAmt.toFixed(2)} to secure student lockbox ledger! Ref: ${response.reference}`);
          loadTransactions();
        },
        onClose: () => {
          alert("Deposit session discarded safely.");
        }
      });
      handler.openIframe();
    } catch (err: any) {
      console.error('Paystack initialization failure:', err);
      alert("Paystack secure payment gateway could not be loaded. Please ensure you have configured NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your system environment variables and are running online.");
    }
  };

  // Withdrawals Implementation
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawValue = parseFloat(withdrawAmt);
    if (isNaN(withdrawValue) || withdrawValue <= 0) {
      alert("Please provide a valid payout amount.");
      return;
    }
    if (withdrawValue > user.earnedGHS) {
      alert("Insufficient escrow wallet funds available to pay out.");
      return;
    }

    setLoading(true);
    try {
      // Direct call to our secure server-side Paystack Transfer proxy
      const response = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: withdrawValue,
          userPhone: user.phone,
          momoNumber: momoNumber,
          momoNetwork: momoNetwork,
          recipientName: user.name
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Payout processing rejected by payment provider');
      }

      // Success
      const remainingFunds = data.balance !== undefined ? data.balance : (user.earnedGHS - withdrawValue);

      // Dispatch Parent update
      onWalletUpdated(remainingFunds);
      setShowWithdrawModal(false);
      setWithdrawAmt('');
      alert(data.message || `Withdrawal of GHS ${withdrawValue.toFixed(2)} completed successfully!`);
      loadTransactions();
    } catch (err: any) {
      console.error('[Payout API Err]', err);
      alert(`Escrow Payout Dispatch Failed: ${err.message || 'Could not reach server API'}`);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const totalReceived = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  return (
    <div id="profile-block-tab" className="bg-[#F7F8FA] min-h-screen pb-20 text-[#0D0D0D] font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Profile Header Dashboard Card */}
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-md mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7F8FA] rounded-bl-full pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="flex flex-col items-center">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => document.getElementById('profile-upload-input')?.click()}
                title="Click to upload/change your profile photo"
              >
                <input 
                  type="file"
                  id="profile-upload-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileFileChange}
                  disabled={isUploadingPhoto}
                />
                <img 
                  src={user.profileImage} 
                  alt={user.name} 
                  className={`w-24 h-24 rounded-full object-cover border-2 border-[#0F6E56] transition-all bg-white ${
                    isUploadingPhoto ? 'opacity-50 blur-[1px]' : 'group-hover:opacity-90 group-hover:scale-105 shadow-md'
                  }`}
                />
                <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span>Update photo</span>
                </div>
                {isUploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-white/60 flex items-center justify-center">
                    <span className="text-[10px] font-black text-[#0F6E56] animate-pulse">Uploading...</span>
                  </div>
                )}
                {user.isVerified && (
                  <div id="profile-tick-badge" className="absolute -bottom-1 -right-1 bg-[#0F6E56] text-white p-1.5 rounded-full border-2 border-white shadow-md">
                    <CheckCircle2 className="w-4 h-4 fill-white text-[#0F6E56]" />
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => document.getElementById('profile-upload-input')?.click()}
                className="text-[10px] text-[#0F6E56] hover:underline font-black mt-2 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                disabled={isUploadingPhoto}
              >
                <Camera className="w-3 h-3" />
                Change Photo
              </button>
            </div>

            <div className="flex-grow text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h2 id="profile-name" className="text-xl font-black text-[#0D0D0D]">{user.name}</h2>
                <span className="text-[10px] bg-[#0F6E56]/10 text-[#0F6E56] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-center sm:self-auto">
                  Student Contractor
                </span>
              </div>

              {isEditing ? (
                <div className="mt-3 grid grid-cols-2 gap-2 max-w-sm mx-auto sm:mx-0">
                  <select 
                    value={eduDept}
                    onChange={(e) => setEduDept(e.target.value)}
                    className="bg-white border border-[#E5E7EB] text-[#0D0D0D] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0F6E56]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Engineering">Engineering Department</option>
                    <option value="Applied Arts">Applied Arts</option>
                    <option value="Business">Business Studies</option>
                    <option value="Applied Mathematics">Applied Mathematics</option>
                  </select>
                  <select 
                    value={eduYear}
                    onChange={(e) => setEduYear(e.target.value)}
                    className="bg-white border border-[#E5E7EB] text-[#0D0D0D] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0F6E56]"
                  >
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                    <option value="Year 4">Year 4</option>
                  </select>
                  <button 
                    onClick={handleSaveInfo}
                    className="col-span-2 bg-[#0F6E56] hover:bg-[#0b5441] text-white rounded-xl py-2 text-xs font-bold mt-1 shadow-md"
                  >
                    Save Details
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs text-[#6B7280] font-medium flex flex-col items-center sm:items-start">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#0F6E56]" />
                    <span id="profile-academic-detail">{user.department} • {user.year}</span>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-[#0F6E56] hover:text-[#0b5441] text-[10px] ml-2 font-bold cursor-pointer"
                    >
                      (Edit details)
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0F6E56]" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#0F6E56] font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>TTU, Takoradi, Ghana</span>
                  </div>
                </div>
              )}
            </div>

            <div className="self-center sm:self-start">
              <button 
                id="profile-logout-btn"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* ESCROW WALLET ACCOUNT CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#0F6E56]/5 rounded-full" />
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
              <span>Ledger Balance</span>
              <DollarSign className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <p className="text-2xl font-black text-[#0F6E56]">
              GHS {Number(user.earnedGHS || 0).toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
              <button 
                onClick={handleAddFundsPaystack}
                className="bg-[#0F6E56] hover:bg-[#0b5441] text-white py-2 px-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Add Funds</span>
              </button>
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 py-2 px-1 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
              >
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span>Payout</span>
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Accumulated Income</span>
            <p className="text-xl font-bold text-[#EF9F27]">
              GHS {parseFloat(totalReceived || 35.0).toFixed(2)}
            </p>
            <span className="text-[9px] text-[#6B7280] block font-semibold">Total funds loaded since registration of student credentials.</span>
          </div>

          <div className="bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="w-full">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] uppercase">
                <span>Silver Hustler Badge</span>
                <span>{getHustleProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                <div className="bg-[#0F6E56] h-full" style={{ width: `${getHustleProgressPercentage()}%` }}></div>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-[#6B7280] mt-2 block">
              Done: {user.completedJobsCount || 0} / 15 gigs (unlocked privileges)
            </span>
          </div>

        </div>

        {/* DOUBLE COLUMN: SERVICES VS TRANSACTION HISTORY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Own listings */}
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs uppercase text-[#0D0D0D] tracking-wide border-b pb-2">My listed Skills ({myServices.length})</h3>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {myServices.length === 0 ? (
                <p className="text-center py-10 text-[11px] text-[#6B7280]">No active listed services portfolios.</p>
              ) : (
                myServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <img src={service.imageUrl} className="w-10 h-10 object-cover rounded-xl border" alt="" />
                      <div>
                        <h4 className="font-bold text-xs text-[#0D0D0D] line-clamp-1">{service.title}</h4>
                        <span className="text-[10px] text-[#0F6E56] font-bold">GHS {service.price}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteService(service.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Wallet Transaction logs */}
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs uppercase text-[#0D0D0D] tracking-wide border-b pb-2">Escrow Transactions History</h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center text-[#6B7280] space-y-1">
                  <Clock className="w-6 h-6 text-gray-300" />
                  <p className="text-[10px]">No historical ledger activities spotted.</p>
                </div>
              ) : (
                transactions.map((t) => {
                  const isDep = t.type === 'deposit';
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-[#F7F8FA] rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          isDep ? 'bg-[#0F6E56]/10 text-[#0F6E56]' : 'bg-red-100 text-red-600'
                        }`}>
                          {isDep ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0D0D0D] capitalize">{t.type} Funds</p>
                          <p className="text-[8px] text-[#6B7280] font-mono leading-none mt-0.5">{t.reference}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-extrabold ${isDep ? 'text-[#0F6E56]' : 'text-red-500'}`}>
                        {isDep ? '+' : '-'} GHS {parseFloat(t.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* PAYOUT WITHDRAWAL MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full border p-6 text-left space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold uppercase text-[#0D0D0D] flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-[#0F6E56]" />
                  <span>Withdraw Escrow Funds</span>
                </h3>
                <button onClick={() => setShowWithdrawModal(false)} className="text-[#6B7280]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#EF9F27]/5 p-3 rounded-2xl border border-dashed text-[10px] text-[#EF9F27] leading-relaxed font-semibold">
                🔔 Mobile money transfers are processed peer-to-peer across Ghana. Ensure network name details are accurate.
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Select Telecom Network</label>
                  <select 
                    value={momoNetwork} 
                    onChange={(e) => setMomoNetwork(e.target.value)}
                    className="w-full bg-[#F7F8FA] border py-2 px-3 rounded-xl focus:outline-none"
                  >
                    <option value="MTN">MTN Mobile Money (MoMo)</option>
                    <option value="Telecel">Telecel Cash / Vodafone</option>
                    <option value="AirtelTigo">AirtelTigo / AT Money</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-1">MoMo Wallet Number</label>
                    <input 
                      type="text" 
                      required 
                      value={momoNumber} 
                      onChange={(e) => setMomoNumber(e.target.value)}
                      className="w-full bg-[#F7F8FA] border py-2 px-3 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-1">Registered Name</label>
                    <input 
                      type="text" 
                      required 
                      value={momoName} 
                      onChange={(e) => setMomoName(e.target.value)}
                      className="w-full bg-[#F7F8FA] border py-2 px-3 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Amount to Transfer (GHS)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">GHS</span>
                    <input 
                      type="number" 
                      min="1" 
                      max={user.earnedGHS} 
                      required 
                      value={withdrawAmt} 
                      onChange={(e) => setWithdrawAmt(e.target.value)}
                      className="w-full bg-[#F7F8FA] border py-2 pl-12 pr-4 rounded-xl text-sm font-bold text-[#0D0D0D]"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Maximum transferrable: GHS {user.earnedGHS.toFixed(2)}</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#0F6E56] hover:bg-[#0b5441] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Processing network key...' : 'Submit MoMo Transfer'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
