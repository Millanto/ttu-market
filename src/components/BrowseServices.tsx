import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Laptop, 
  BookOpen, 
  Utensils, 
  Shirt, 
  Printer, 
  Wrench, 
  Search, 
  Star, 
  AlertCircle
} from 'lucide-react';
import { Service } from '../types';
import { CATEGORIES } from '../mockData';

interface BrowseServicesProps {
  services: Service[];
  initialCategory: string; // 'all' or specific id
  onSelectService: (service: Service) => void;
}

export default function BrowseServices({
  services,
  initialCategory,
  onSelectService,
}: BrowseServicesProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  const getCategoryIcon = (iconName: string, active: boolean) => {
    const cls = `w-4 h-4 ${active ? 'text-white' : 'text-[#0F6E56]'}`;
    switch (iconName) {
      case 'Laptop': return <Laptop className={cls} />;
      case 'BookOpen': return <BookOpen className={cls} />;
      case 'Utensils': return <Utensils className={cls} />;
      case 'Shirt': return <Shirt className={cls} />;
      case 'Printer': return <Printer className={cls} />;
      case 'Wrench': return <Wrench className={cls} />;
      default: return <Laptop className={cls} />;
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    const matchesKeyword = 
      service.title.toLowerCase().includes(searchText.toLowerCase()) ||
      service.description.toLowerCase().includes(searchText.toLowerCase()) ||
      service.sellerName.toLowerCase().includes(searchText.toLowerCase()) ||
      service.sellerDept.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesKeyword;
  });

  const sortedAndFilteredServices = [...filteredServices].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.price - b.price;
    }
    if (sortBy === 'price-desc') {
      return b.price - a.price;
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  return (
    <div id="browse-services-tab" className="bg-[#F7F8FA] min-h-screen pb-20 text-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        
        {/* Header Title */}
        <div className="mb-6">
          <h1 id="browse-title" className="text-xl sm:text-2xl font-black text-[#0D0D0D] tracking-tight">
            Browse Student Economy
          </h1>
          <p className="text-sm text-[#6B7280] mt-1 font-medium">
            Find peer services offered by talented Takoradi Technical University students.
          </p>
        </div>

        {/* Search Input & Sort Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative md:col-span-3">
            <input 
              id="browse-keyword-input"
              type="text" 
              placeholder="Type keywords (e.g., installation, tutoring, hoodies)..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-[#0F6E56] focus:ring-0 shadow-sm transition-all text-[#0D0D0D] glass-input"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 text-[#6B7280]" />
          </div>
          <div className="relative">
            <select
              id="sort-selector"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl py-3.5 px-4 text-xs font-bold text-[#6B7280] focus:outline-none focus:border-[#0F6E56] transition-all cursor-pointer shadow-sm"
            >
              <option value="newest">🕒 Sort: Newest First</option>
              <option value="price-asc">📈 Price: Low to High</option>
              <option value="price-desc">📉 Price: High to Low</option>
              <option value="rating">⭐️ High Rated First</option>
            </select>
          </div>
        </div>

        {/* Scrollable Categories Row */}
        <div id="browse-categories-row" className="flex gap-2 overflow-x-auto pb-4 scrollbar-none hide-scrollbar">
          <button 
            id="cat-tab-all"
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
              activeCategory === 'all' 
                ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/15' 
                : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0D0D0D]'
            }`}
          >
            <span>All Categories</span>
          </button>
          
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button 
                key={cat.id}
                id={`cat-tab-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/15' 
                    : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0D0D0D]'
                }`}
              >
                {getCategoryIcon(cat.icon, isSelected)}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between mb-6 text-xs text-[#6B7280] border-b border-[#E5E7EB] pb-3">
          <div>
            Showing <strong className="text-[#0D0D0D] font-bold">{sortedAndFilteredServices.length}</strong> services
          </div>
          {(searchText || activeCategory !== 'all') && (
            <button 
              id="clear-filters-btn"
              onClick={() => {
                setSearchText('');
                setActiveCategory('all');
                setSortBy('newest');
              }}
              className="text-[#0F6E56] font-bold hover:text-[#0b5441] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Listing Cards Grid */}
        <div id="browse-services-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedAndFilteredServices.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-[#6B7280] mb-3" />
              <h3 className="text-sm font-bold text-[#0D0D0D]">No Match Found</h3>
              <p className="text-xs text-[#6B7280] max-w-xs mt-1 leading-relaxed">
                We couldn't find any services matching "{searchText || activeCategory}". Try searching something else or posting a gig request!
              </p>
            </div>
          ) : (
            sortedAndFilteredServices.map((service, idx) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                onClick={() => onSelectService(service)}
                className="bg-white border border-[#E5E7EB] shadow-sm rounded-2xl hover:scale-[1.01] overflow-hidden group cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-[#F7F8FA] relative overflow-hidden">
                    <img 
                      src={service.imageUrl} 
                      alt={service.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-[#0F6E56] text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight shadow">
                      GHS {service.price}
                      {service.priceType === 'hourly' ? '/hr' : ''}
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={service.sellerImage} 
                        alt={service.sellerName}
                        className="w-5 h-5 rounded-full object-cover" 
                      />
                      <span className="text-[11px] font-semibold text-[#6B7280] line-clamp-1">
                        {service.sellerName} • {service.sellerDept}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#0D0D0D] mb-2 tracking-tight group-hover:text-[#0F6E56] transition-colors line-clamp-2">
                      {service.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 bg-white">
                  <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3 mt-2">
                    <div className="flex items-center gap-1 text-[#EF9F27]">
                      <Star className="w-3.5 h-3.5 fill-[#EF9F27] text-[#EF9F27]" />
                      <span className="text-xs font-bold text-[#0D0D0D]">{service.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-[#6B7280]">({service.reviewsCount})</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#0F6E56] bg-[#0F6E56]/10 border border-[#0F6E56]/20 px-2.5 py-1 rounded-lg">
                      {CATEGORIES.find(c => c.id === service.category)?.name || 'Service'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
