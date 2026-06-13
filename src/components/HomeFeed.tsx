import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Clock, 
  Star, 
  Search, 
  Filter, 
  Award, 
  UserCheck,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Service, UrgentNeed, TopEarner, User } from '../types';
import { DbService } from '../lib/db';

interface HomeFeedProps {
  user: User;
  onSelectCategory: (catId: string) => void;
  onSelectService: (service: Service) => void;
  onAcceptUrgentNeed: (needId: string) => void;
  onViewAllUrgent: () => void;
  onSearchChange: (search: string) => void;
}

export default function HomeFeed({
  user,
  onSelectCategory,
  onSelectService,
  onAcceptUrgentNeed,
  onViewAllUrgent,
  onSearchChange,
}: HomeFeedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptedAnimId, setAcceptedAnimId] = useState<string | null>(null);

  // States for database payloads
  const [dbUrgentNeeds, setDbUrgentNeeds] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbTopEarners, setDbTopEarners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real-time data from Supabase DB on lifecycle load
  useEffect(() => {
    async function loadFeedData() {
      try {
        setLoading(true);
        const [jobs, items, earners] = await Promise.all([
          DbService.queryUrgentJobs(),
          DbService.queryServices(),
          DbService.queryTopEarners()
        ]);
        
        setDbUrgentNeeds(jobs);
        setDbServices(items);
        setDbTopEarners(earners.slice(0, 3)); // show top 3 as requested
      } catch (err) {
        console.error('Error fetching HomeFeed data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeedData();
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchTerm);
  };

  const handleAcceptClick = async (id: string) => {
    setAcceptedAnimId(id);
    try {
      await DbService.acceptUrgentJob(id, user.name);
      onAcceptUrgentNeed(id);
    } catch (err) {
      console.error('Error accepting SOS job:', err);
    } finally {
      setAcceptedAnimId(null);
    }
  };

  const getHustleProgressPercentage = () => {
    const current = user.completedJobsCount || 0;
    const target = 15;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Sleek animated Skeleton Screen component
  const TableSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded-full w-2/3" />
      <div className="h-10 bg-gray-200 rounded-2xl w-full" />
      <div className="h-10 bg-gray-200 rounded-2xl w-full" />
    </div>
  );

  return (
    <div id="homepage-feed" className="bg-[#F7F8FA] min-h-screen pb-12 text-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4 md:px-10 pt-4">
        
        {/* Welcome greeting card banner */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm"
        >
          <div>
            <h1 id="feed-greeting" className="text-2xl font-black text-[#0D0D0D] tracking-tight">
              Aandwene, {user.name ? user.name.split(' ')[0] : 'Student'}! 👋
            </h1>
            <p className="text-xs text-[#6B7280] mt-1 font-semibold">
              TTU Student Hub Wallet Active: <span className="text-[#0F6E56] font-bold">GHS {user.earnedGHS ? user.earnedGHS.toFixed(2) : '0.00'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F6E56]/10 text-[#0F6E56] rounded-xl text-[10px] font-bold border border-[#0F6E56]/20">
            <UserCheck className="w-4 h-4 text-[#0F6E56]" />
            <span>{user.isVerified ? 'TTU Registrar Approved ✓' : 'ID Pending Approvals'}</span>
          </div>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="mb-10 block max-w-xl">
          <div className="relative">
            <input 
              id="feed-search-input"
              type="text"
              placeholder="Search IT installation, laundry, food, exam tutoring..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl py-3.5 pl-12 pr-28 text-sm focus:outline-none focus:border-[#0F6E56] shadow-sm transition-all text-[#0D0D0D] glass-input"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
            <button 
              id="feed-search-btn"
              type="submit" 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0F6E56] hover:bg-[#0b5441] text-white px-5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
            >
              Search
            </button>
          </div>
        </form>

        {/* URGENT GIGS GRID */}
        <div id="urgent-needs-section" className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-extrabold text-[#0D0D0D] flex items-center gap-2 tracking-tight">
              <Zap className="w-5 h-5 text-[#EF9F27] fill-[#EF9F27]" />
              <span>Urgent Gigs / SOS Requests</span>
            </h2>
            <button 
              id="view-all-gigs-btn"
              onClick={onViewAllUrgent}
              className="text-xs font-bold text-[#0F6E56] hover:text-[#0b5441] hover:underline"
            >
              See all
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-10 bg-gray-200 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div id="urgent-needs-slider" className="flex gap-4 overflow-x-auto pb-3 scrollbar-none hide-scrollbar snap-x">
              {dbUrgentNeeds.filter(req => !req.accepted).length === 0 ? (
                <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center text-xs text-[#6B7280] font-medium shadow-sm">
                  No active urgent SOS requests currently posted. Broadcast one in the Post tab!
                </div>
              ) : (
                dbUrgentNeeds.filter(req => !req.accepted).map((need) => (
                  <motion.div 
                    key={need.id}
                    layoutId={`urgent-${need.id}`}
                    className="flex-shrink-0 snap-center w-72 sm:w-80 bg-white border border-[#EF9F27]/30 shadow-md hover:shadow-lg p-5 rounded-2xl relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-[#EF9F27]/10 text-[#EF9F27] border border-[#EF9F27]/25 px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest leading-none">
                          Urgent SOS
                        </span>
                        <div className="flex items-center gap-1 text-[#EF9F27] text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{need.timeLeftText || '24h left'}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-[#0D0D0D] line-clamp-1 mb-1 tracking-tight">
                        {need.title}
                      </h3>
                      <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed mb-4">
                        {need.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E5E7EB]">
                      <div>
                        <span className="text-[10px] text-[#6B7280] block uppercase tracking-wide font-semibold">Budget</span>
                        <span className="text-base font-extrabold text-[#EF9F27]">
                          GHS {parseFloat(need.budget || 0).toFixed(2)}
                        </span>
                      </div>
                      <button 
                        id={`accept-gig-btn-${need.id}`}
                        onClick={() => handleAcceptClick(need.id)}
                        disabled={acceptedAnimId === need.id || !user.isVerified}
                        className="bg-[#0F6E56] hover:bg-[#0b5441] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title={!user.isVerified ? 'Verified students only' : 'Accept gig'}
                      >
                        {acceptedAnimId === need.id ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            <span>Booking...</span>
                          </>
                        ) : (
                          <span>Accept Job</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Featured list and sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-[#0D0D0D] tracking-tight">Active Student Offers</h2>
              <button 
                onClick={onViewAllUrgent}
                className="p-2 bg-white rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#0D0D0D] hover:bg-slate-50 transition-all shadow-sm"
                title="Filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4 animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-xl w-full" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div id="services-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {dbServices.length === 0 ? (
                  <div className="col-span-full bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-[#6B7280] font-medium">
                    No active student services currently listed. Be the first to publish a portfolio!
                  </div>
                ) : (
                  dbServices.slice(0, 4).map((service) => (
                    <div 
                      key={service.id}
                      id={`service-card-${service.id}`}
                      onClick={() => onSelectService(service)}
                      className="bg-white border border-[#E5E7EB] shadow-sm hover:shadow-md rounded-2xl hover:scale-[1.01] overflow-hidden group cursor-pointer transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="h-44 bg-[#F7F8FA] relative overflow-hidden">
                        <img 
                          src={service.imageUrl || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150'} 
                          alt={service.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div id={`price-badge-${service.id}`} className="absolute top-3 right-3 bg-[#0F6E56] text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight shadow">
                          GHS {service.price}
                          {service.priceType === 'hourly' ? '/hr' : ''}
                        </div>
                      </div>

                      <div className="p-4 flex-grow flex flex-col justify-between bg-white">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <img 
                              src={service.sellerImage || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'} 
                              alt={service.sellerName}
                              className="w-5 h-5 rounded-full object-cover" 
                            />
                            <span className="text-[10px] font-semibold text-[#6B7280] line-clamp-1">
                              {service.sellerName} • {service.sellerDept || 'Student'}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-[#0D0D0D] mb-1.5 tracking-tight group-hover:text-[#0F6E56] transition-colors line-clamp-2">
                            {service.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 text-[#EF9F27] mt-3">
                          <Star className="w-3.5 h-3.5 fill-[#EF9F27] text-[#EF9F27]" />
                          <span className="text-xs font-bold text-[#0D0D0D]">{parseFloat(service.rating || 5).toFixed(1)}</span>
                          <span className="text-[10px] text-[#6B7280] font-semibold">({service.reviewsCount || 0} reviews)</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Leaderboard earning statistics widgets */}
          <div id="sidebar-column" className="space-y-6">
            
            <div id="leaderboard-card" className="bg-white text-[#0D0D0D] p-6 rounded-3xl border border-[#E5E7EB] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0F6E56]/5 rounded-full pointer-events-none translate-x-4 -translate-y-4"></div>
              
              <h3 className="text-sm font-extrabold mb-4 tracking-tight flex items-center gap-2 uppercase">
                <Award className="w-5 h-5 text-[#EF9F27]" />
                <span>Top Weekly Earners</span>
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <TableSkeleton />
                ) : dbTopEarners.length === 0 ? (
                  <p className="text-center text-xs text-[#6B7280] py-4">No active earmers listed yet.</p>
                ) : (
                  dbTopEarners.map((earner, idx) => (
                    <div key={earner.id || idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border ${
                          idx === 0 
                            ? 'bg-[#EF9F27] text-white border-[#EF9F27] shadow' 
                            : 'bg-slate-50 text-[#6B7280]'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold line-clamp-1 text-[#0D0D0D]">{earner.name}</div>
                          <div className="text-[10px] text-[#6B7280] line-clamp-1">{earner.department}</div>
                        </div>
                      </div>
                      <div className="text-xs font-black tracking-tight text-[#0F6E56]">
                        GHS {parseFloat(earner.earned_ghs || 0).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                id="sidebar-leaderboard-btn"
                onClick={onViewAllUrgent}
                className="w-full mt-5 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all text-[#0F6E56] hover:text-[#0b5441] border border-[#E5E7EB]"
              >
                View Complete Leaderboard
              </button>
            </div>

            {/* Hustle Target Metric */}
            <div id="hustle-stats-card" className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm text-[#0D0D0D]">
              <h3 className="text-[11px] font-bold text-[#6B7280] mb-4 uppercase tracking-wider">Your Campus Progression</h3>
              
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-[#6B7280] font-semibold">Jobs Completed</span>
                <span className="text-xs font-extrabold text-[#0D0D0D]">{user.completedJobsCount || 0} gigs</span>
              </div>
              
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                <div 
                  className="bg-[#0F6E56] h-full rounded-full transition-all duration-1000"
                  style={{ width: `${getHustleProgressPercentage()}%` }}
                ></div>
              </div>

              <p className="text-[10px] text-[#6B7280] leading-relaxed">
                Reach <strong className="text-[#0F6E56] font-bold">15 completed gigs</strong> to claim your peer trusted certification status as campus elite student contractor.
              </p>
            </div>
            
          </div>

        </div>

      </div>
    </div>
  );
}
