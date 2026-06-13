import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Info, Sparkles, Image as ImageIcon, Zap, CheckCircle2, Upload, Link, AlertTriangle } from 'lucide-react';
import { CATEGORIES } from '../mockData';
import { User } from '../types';
import { uploadFileToBucket, DbService } from '../lib/db';

interface PostServiceProps {
  user: User;
  onAddService: (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    priceType: 'fixed' | 'hourly' | 'item';
    imageUrl: string;
    status: 'pending' | 'active';
  }) => void;
  onAddUrgentNeed: (data: {
    title: string;
    description: string;
    budget: number;
    timeLeftText: string;
  }) => void;
}

const STOCK_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500', name: 'Software/Creative' },
  { url: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=500', name: 'Learning/Books' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500', name: 'Gourmet Food' },
  { url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500', name: 'Apparel/Fashion' },
  { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500', name: 'Social/Community' },
  { url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500', name: 'Tech/Gadgets' }
];

export default function PostService({ user, onAddService, onAddUrgentNeed }: PostServiceProps) {
  const [postType, setPostType] = useState<'service' | 'urgent_need'>('service');
  
  // Service form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('it');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'hourly' | 'item'>('fixed');
  const [selectedPhoto, setSelectedPhoto] = useState(STOCK_IMAGES[0].url);

  // Custom photo upload state
  const [customFileBlob, setCustomFileBlob] = useState<Blob | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [customPhotoUrlInput, setCustomPhotoUrlInput] = useState('');
  const [fileError, setFileError] = useState('');
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Urgent Need form state
  const [needTitle, setNeedTitle] = useState('');
  const [needDesc, setNeedDesc] = useState('');
  const [needBudget, setNeedBudget] = useState('');
  const [timeLeft, setTimeLeft] = useState('2h left');

  const [successMsg, setSuccessMsg] = useState('');

  // Handle local image file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError('The selected image is too large (Maximum size is 5MB).');
        return;
      }
      setFileError('');
      setCustomFileBlob(file);
      setCustomFileName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (customPhotoUrlInput.trim().startsWith('http')) {
      setSelectedPhoto(customPhotoUrlInput.trim());
      setCustomFileBlob(null);
      setCustomFileName('');
      setFileError('');
      setCustomPhotoUrlInput('');
    } else {
      setFileError('Please enter a valid Image URL starting with http:// or https://');
    }
  };

  // Submit new student service catalog
  const handlePostService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isVerified && user.role !== 'admin') {
      setFileError('Campus rules state only verified accounts can post public services.');
      return;
    }
    if (!title.trim() || !desc.trim() || !price) return;
    setIsPhotoUploading(true);
    setFileError('');

    try {
      let finalImageUrl = selectedPhoto;

      // Real upload to Supabase service-images Storage Bucket
      if (customFileBlob) {
        const cleanName = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const targetPath = `${user.phone.replace(/\s+/g, '')}_srv_${Date.now()}_${cleanName}.jpg`;
        finalImageUrl = await uploadFileToBucket('service-images', targetPath, customFileBlob);
      }

      // Save to database row with status 'pending' as explicitly requested!
      const finalService = {
        id: `srv_${Date.now()}`,
        title,
        description: desc,
        category,
        price: parseFloat(price),
        priceType,
        seller_name: user.name,
        seller_dept: user.department,
        seller_image: user.profileImage,
        image_url: finalImageUrl,
        status: user.role === 'admin' ? 'active' : 'pending', // Admins bypass auto review
        rating: 5.0,
        reviews_count: 0,
        timestamp: new Date().toISOString()
      };

      await DbService.createService(finalService);

      // Notify parent App
      onAddService({
        title,
        description: desc,
        category,
        price: parseFloat(price),
        priceType,
        imageUrl: finalImageUrl,
        status: user.role === 'admin' ? 'active' : 'pending'
      });

      setSuccessMsg('Your student service has been posted under peer review! Our admin registrar checks listed portfolios within hours.');
      
      // Clear form
      setTitle('');
      setDesc('');
      setPrice('');
      setCustomFileBlob(null);
      setCustomFileName('');
      setSelectedPhoto(STOCK_IMAGES[0].url);

      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Error posting listing:', err);
      setFileError('Could not publish service. Ensure database parameters are ready.');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  // Submit urgent needs SOS Gigs
  const handlePostNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needTitle.trim() || !needDesc.trim() || !needBudget) return;

    try {
      const finalNeed = {
        id: `need_${Date.now()}`,
        title: needTitle,
        description: needDesc,
        budget: parseFloat(needBudget),
        timeLeftText: timeLeft,
        poster_name: user.name,
        poster_dept: user.department,
        poster_image: user.profileImage,
        timestamp: new Date().toISOString(),
        accepted: false
      };

      await DbService.createUrgentJob(finalNeed);

      onAddUrgentNeed({
        title: needTitle,
        description: needDesc,
        budget: parseFloat(needBudget),
        timeLeftText: timeLeft,
      });

      setSuccessMsg('Urgent campus bounty broadcasted successfully! Gigs stream instantly to all verified user nodes.');
      
      setNeedTitle('');
      setNeedDesc('');
      setNeedBudget('');
      
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error listing urgent job:', err);
    }
  };

  // Enforce access rule
  const isUserUnverified = !user.isVerified && user.role !== 'admin';

  return (
    <div id="post-services-tab" className="bg-[#F7F8FA] min-h-screen pb-20 text-[#0D0D0D]">
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">
        
        {/* Upper Header */}
        <div className="mb-8">
          <h1 id="post-title" className="text-xl sm:text-2xl font-black text-[#0D0D0D] tracking-tight">
            Publish Campus Offering
          </h1>
          <p className="text-xs text-[#6B7280] mt-1 font-semibold">
            Broadcasting live on the global Takoradi student node network.
          </p>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="post-success-alert"
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-[#0F6E56] text-xs flex items-center gap-3 shadow-sm font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#0F6E56]" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* Form Type Tab Selector */}
        <div className="grid grid-cols-2 bg-white p-1.5 rounded-2xl mb-8 border border-[#E5E7EB] shadow-sm">
          <button 
            id="tab-post-service"
            type="button"
            onClick={() => { setPostType('service'); setSuccessMsg(''); }}
            className={`py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              postType === 'service' 
                ? 'bg-[#0F6E56] text-white shadow' 
                : 'text-[#6B7280] hover:text-[#0D0D0D]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>List My Service Portfolio</span>
          </button>

          <button 
            id="tab-post-need"
            type="button"
            onClick={() => { setPostType('urgent_need'); setSuccessMsg(''); }}
            className={`py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              postType === 'urgent_need' 
                ? 'bg-[#EF9F27] text-white shadow' 
                : 'text-[#6B7280] hover:text-[#0D0D0D]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Broadcast Request (SOS Bounty)</span>
          </button>
        </div>

        {/* MAIN DISPLAY FOR VERIFIED AND UNVERIFIED ACCOUNTS */}
        {postType === 'service' && isUserUnverified ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1 }}
            className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 p-6 sm:p-8 rounded-3xl text-center space-y-4"
          >
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-[#0D0D0D] uppercase tracking-wide">ID Verification Required</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed max-w-lg mx-auto font-medium">
              We care about trust. Your student card upload is currently being analyzed by Takoradi registrars. Once verified, you will instantly unlock this section to post services, listing portfolios, and securely escrowing payments.
            </p>
            <div className="text-xs font-semibold text-amber-700 bg-amber-100/50 px-4 py-2 rounded-xl inline-block">
              Currently Logged In: {user.name} ({user.phone})
            </div>
          </motion.div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-md text-[#0D0D0D]">
            {postType === 'service' ? (
              /* POST SERVICE FORM */
              <form onSubmit={handlePostService} className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F6E56] uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-[#0F6E56]" />
                  <span>Verified Service Creation Node</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Service Title / Skill</label>
                    <input 
                      id="post-service-title"
                      type="text" 
                      required 
                      maxLength={70}
                      placeholder="e.g., Professional laptop cleaning and thermal pasting"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56] transition-all glass-input animate-trans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Skill Category</label>
                    <select 
                      id="post-service-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-xs text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Explanative Service Details</label>
                  <textarea 
                    id="post-service-desc"
                    required
                    rows={4}
                    maxLength={600}
                    placeholder="Provide details of what you offer. Mention deliverables, terms, duration, and resources you provide on peer escrow confirmation."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56] transition-all glass-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Service Cost (GHS)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">GHS</span>
                      <input 
                        id="post-service-price"
                        type="number" 
                        min="1" 
                        required
                        placeholder="e.g. 50"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-14 pr-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56] transition-all glass-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Billing Cycle</label>
                    <select 
                      id="post-service-pricetype"
                      value={priceType}
                      onChange={(e) => setPriceType(e.target.value as any)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#0F6E56]"
                    >
                      <option value="fixed">Fixed Cost / Lump sum</option>
                      <option value="hourly">Hourly Billing Rate</option>
                      <option value="item">Per Laundry Bag / Plate / Hour</option>
                    </select>
                  </div>
                </div>

                {/* Portfolio Cover Selection */}
                <div id="portfolio-cover-sec" className="bg-slate-50 p-4 rounded-2xl border border-[#E5E7EB]">
                  <h3 className="text-xs font-extrabold mb-3 text-[#0D0D0D] uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#0F6E56]" />
                    <span>Upload Portfolio Illustration / Photos</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Presets */}
                    <div>
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-2">Option A: Choose from Stock Campus Graphics</span>
                      <div className="grid grid-cols-6 gap-2">
                        {STOCK_IMAGES.map((img, idx) => (
                          <div 
                            key={idx}
                            onClick={() => { setSelectedPhoto(img.url); setCustomFileBlob(null); setCustomFileName(''); }}
                            className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                              selectedPhoto === img.url && !customFileBlob
                                ? 'border-[#0F6E56] scale-105 ring-2 ring-[#0F6E56]/20'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={img.url} className="w-full h-full object-cover" alt={img.name} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Device Upload option (Required by User's constraint #3) */}
                    <div className="border-t border-gray-200 pt-3">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-2">Option B: Upload Custom Photography From Your Gallery</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-trans">
                        <div>
                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E7EB] hover:border-[#0F6E56] bg-white hover:bg-[#0F6E56]/5 rounded-xl p-3 text-center cursor-pointer min-h-[82px] transition-all">
                            <Upload className="w-4 h-4 text-[#0F6E56] mb-1" />
                            <span className="text-[11px] font-bold text-[#0D0D0D]">Choose device photo</span>
                            <span className="text-[9px] text-[#6B7280]">{customFileName || 'Max size limit: 5MB'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileChange}
                              className="hidden" 
                            />
                          </label>
                        </div>

                        <div className="flex flex-col justify-between bg-white border border-[#E5E7EB] rounded-xl p-3 min-h-[82px]">
                          <span className="text-[11px] font-bold text-[#0D0D0D] flex items-center gap-1">
                            <Link className="w-3 h-3 text-[#0F6E56]" />
                            <span>Or paste layout URL</span>
                          </span>
                          <div className="flex gap-2">
                            <input 
                              type="url" 
                              placeholder="https://images.unsplash.com/...jpg"
                              value={customPhotoUrlInput}
                              onChange={(e) => setCustomPhotoUrlInput(e.target.value)}
                              className="flex-grow bg-white border border-[#E5E7EB] text-[10px] px-2 rounded-lg"
                            />
                            <button 
                              type="button"
                              onClick={handleUrlSubmit}
                              className="bg-[#0F6E56] text-white text-[10px] font-bold px-2 rounded-lg"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>

                      {fileError && (
                        <p className="text-xs text-red-500 mt-2 font-semibold bg-red-100/50 p-2 rounded-xl">{fileError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  id="post-service-submit"
                  type="submit"
                  disabled={isPhotoUploading}
                  className="w-full bg-[#0F6E56] text-white py-3.5 hover:bg-[#0b5441] shadow-lg shadow-[#0F6E56]/15 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPhotoUploading ? 'Saving safe service payload...' : 'Publish Student Service Portfolio'}
                </button>
              </form>
            ) : (
              /* POST URGENT NEED FORM (EXEMPT FROM UNVERIFIED CHECK SO THEY CAN QUICKLY GET WORK DELIVERED CLIENT-SIDE!) */
              <form onSubmit={handlePostNeed} className="space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#EF9F27] uppercase tracking-wider mb-2">
                  <Zap className="w-4 h-4 text-[#EF9F27]" />
                  <span>Broadcast Urgent SOS Help Gig</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">What is the urgent task?</label>
                  <input 
                    id="post-need-title"
                    type="text" 
                    required 
                    maxLength={60}
                    placeholder="e.g. Bring me washing soap and matchstick at Hostel D Room 12"
                    value={needTitle}
                    onChange={(e) => setNeedTitle(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#EF9F27] transition-all glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Help Details</label>
                  <textarea 
                    id="post-need-desc"
                    required
                    rows={4}
                    placeholder="Be precise about where you are and what is needed."
                    value={needDesc}
                    onChange={(e) => setNeedDesc(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#EF9F27] transition-all glass-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Bounty budget compensation (GHS)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280]">GHS</span>
                      <input 
                        id="post-need-budget"
                        type="number" 
                        min="1" 
                        required
                        placeholder="e.g. 20"
                        value={needBudget}
                        onChange={(e) => setNeedBudget(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-14 pr-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#EF9F27] transition-all glass-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">Task Life Expiry</label>
                    <select 
                      id="post-need-time"
                      value={timeLeft}
                      onChange={(e) => setTimeLeft(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#0D0D0D] focus:outline-none focus:border-[#EF9F27]"
                    >
                      <option value="15m left">15 minutes limit</option>
                      <option value="1h left">1 hour limit</option>
                      <option value="4h left">4 hours limit</option>
                      <option value="Today">Today before sunset</option>
                    </select>
                  </div>
                </div>

                <button 
                  id="post-need-submit"
                  type="submit"
                  className="w-full bg-[#EF9F27] text-white py-3.5 hover:bg-[#df8a13] shadow-lg rounded-xl font-bold transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  Broadcast Live SOS Gig Notice
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
