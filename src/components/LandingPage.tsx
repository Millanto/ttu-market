import { motion } from 'motion/react';
import { 
  Laptop, 
  BookOpen, 
  Utensils, 
  Shirt, 
  Printer, 
  Wrench, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Users,
  Wallet,
  Activity
} from 'lucide-react';
import { CATEGORIES } from '../mockData';

interface LandingPageProps {
  onJoinNow: () => void;
  onLogin: () => void;
  onBrowseServices: () => void;
  onSelectCategory: (catId: string) => void;
}

export default function LandingPage({
  onJoinNow,
  onLogin,
  onBrowseServices,
  onSelectCategory,
}: LandingPageProps) {

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Laptop': return <Laptop className="w-6 h-6 text-[#0F6E56]" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6 text-[#0F6E56]" />;
      case 'Utensils': return <Utensils className="w-6 h-6 text-[#0F6E56]" />;
      case 'Shirt': return <Shirt className="w-6 h-6 text-[#0F6E56]" />;
      case 'Printer': return <Printer className="w-6 h-6 text-[#0F6E56]" />;
      case 'Wrench': return <Wrench className="w-6 h-6 text-[#0F6E56]" />;
      default: return <Laptop className="w-6 h-6 text-[#0F6E56]" />;
    }
  };

  return (
    <div id="landing-page" className="relative min-h-screen flex flex-col bg-[#F7F8FA] text-[#0D0D0D] overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-10 h-16 bg-white border-b border-[#E5E7EB]">
        <div id="logo-branding" className="text-xl md:text-2xl font-black text-[#0F6E56] tracking-tight">
          TTU Market
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            id="nav-login-btn"
            onClick={onLogin}
            className="text-sm font-semibold px-4 py-2 text-[#6B7280] hover:text-[#0D0D0D] transition-colors rounded-lg hover:bg-slate-100"
          >
            Login
          </button>
          <button 
            id="nav-signup-btn"
            onClick={onJoinNow}
            className="glass-btn-primary text-sm font-bold px-5 py-2.5 rounded-lg active:scale-95 transition-transform"
          >
            Join Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-grow pt-32 pb-16 px-4 md:px-10 max-w-7xl mx-auto w-full relative">
        <div className="relative z-10 max-w-4xl mx-auto text-center md:text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-black text-4xl sm:text-5xl md:text-6xl text-[#0D0D0D] leading-tight mb-4 tracking-tight"
          >
            Smarter Campus <span className="text-[#0F6E56] font-extrabold font-sans">Commerce.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-base md:text-lg text-[#6B7280] mb-8 max-w-xl leading-relaxed mx-auto md:mx-0 font-medium"
          >
            The dedicated trading platform for Takoradi Technical University. Showcase your services, hire verified student talent, and complete transactions securely.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-20 justify-center md:justify-start"
          >
            <button 
              id="hero-join-btn"
              onClick={onJoinNow}
              className="glass-btn-primary px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 shadow-xl shadow-[#0F6E56]/20"
            >
              Join TTU Market <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              id="hero-browse-btn"
              onClick={onBrowseServices}
              className="border border-[#E5E7EB] text-[#0D0D0D] bg-white hover:bg-[#F7F8FA] transition-all px-8 py-4 rounded-xl font-bold hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Browse Services
            </button>
          </motion.div>

          {/* Counters */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl"
          >
            <div id="stat-students" className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-6 text-left transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl font-extrabold text-[#0D0D0D]">12,400+</span>
                <Users className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <div className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">Active Students</div>
            </div>
            
            <div id="stat-transactions" className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-6 text-left transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl font-extrabold text-[#0D0D0D]">45,000+</span>
                <Activity className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <div className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">Total Transactions</div>
            </div>
            
            <div id="stat-earnings" className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-6 text-left transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl font-extrabold text-[#0F6E56]">GHS 2.4M</span>
                <Wallet className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <div className="text-[10px] font-bold tracking-widest text-[#6B7280] uppercase">Earned by Students</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories Section */}
      <div id="landing-categories" className="bg-white border-y border-[#E5E7EB] py-16 px-4 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0D0D0D]">Popular Categories</h2>
            <button 
              id="view-all-cats-btn"
              onClick={onBrowseServices} 
              className="text-[#0F6E56] hover:text-[#0b5441] text-sm font-bold flex items-center gap-1 transition-colors"
            >
              View All
            </button>
          </div>
          
          <div id="categories-scroll-container" className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x hide-scrollbar">
            {CATEGORIES.map((cat, idx) => (
              <motion.div 
                key={cat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelectCategory(cat.id)}
                className="flex-shrink-0 snap-center flex flex-col items-center gap-3 group cursor-pointer w-28 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#F7F8FA] flex items-center justify-center border border-[#E5E7EB] group-hover:bg-[#0F6E56]/15 group-hover:border-[#0F6E56]/30 transition-all shadow-sm">
                  <div className="group-hover:scale-110 transition-transform">
                    {getCategoryIcon(cat.icon)}
                  </div>
                </div>
                <span className="text-xs font-bold text-[#6B7280] group-hover:text-[#0F6E56] transition-colors">
                  {cat.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="py-24 px-4 md:px-10 bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D0D0D] mb-16 tracking-tight">How it works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div id="step-1-card" className="flex flex-col items-center group bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-8 transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold mb-6 text-lg shadow-lg shadow-[#0F6E56]/20 group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-xl font-bold text-[#0D0D0D] mb-3">Create Profile</h3>
              <p className="text-[#6B7280] text-sm max-w-xs leading-relaxed">
                Verify your student status with your TTU ID card and build your professional catalog list.
              </p>
            </div>
            
            {/* Step 2 */}
            <div id="step-2-card" className="flex flex-col items-center group bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-8 transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold mb-6 text-lg shadow-lg shadow-[#0F6E56]/20 group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-xl font-bold text-[#0D0D0D] mb-3">Post or Browse</h3>
              <p className="text-[#6B7280] text-sm max-w-xs leading-relaxed">
                List services or find student-led businesses & post real-time urgent gig requests.
              </p>
            </div>
            
            {/* Step 3 */}
            <div id="step-3-card" className="flex flex-col items-center group bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md p-8 transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#0F6E56] text-white flex items-center justify-center font-bold mb-6 text-lg shadow-lg shadow-[#0F6E56]/20 group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-xl font-bold text-[#0D0D0D] mb-3">Get Paid Safely</h3>
              <p className="text-[#6B7280] text-sm max-w-xs leading-relaxed">
                Keep cash exchanges clean or handle secured payments and ratings directly on campus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-12 px-4 md:px-10 border-t border-[#E5E7EB] bg-white text-[#0D0D0D]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="text-lg font-black text-[#0F6E56] mb-2 uppercase tracking-wide">TTU Market</div>
            <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed">
              Empowering the student entrepreneurs & hustlers of Takoradi Technical University through secure, peer-to-peer campus commerce.
            </p>
          </div>
          <div className="flex gap-8 cursor-pointer">
            <a href="#" className="text-sm font-semibold text-[#6B7280] hover:text-[#0F6E56] transition-colors">Safety Guide</a>
            <a href="#" className="text-sm font-semibold text-[#6B7280] hover:text-[#0F6E56] transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm font-semibold text-[#6B7280] hover:text-[#0F6E56] transition-colors">Campus Terms</a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[#E5E7EB] text-center text-xs text-[#6B7280]">
          &copy; 2026 Takoradi Technical University Market. Refined & Built by TTU Developers. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
