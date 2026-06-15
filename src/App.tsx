import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  PlusCircle, 
  Receipt, 
  User as UserIcon, 
  LogIn, 
  Sparkles, 
  Bell, 
  X, 
  ShieldCheck, 
  Star, 
  CheckCircle,
  MessageSquare,
  Utensils,
  BookOpen,
  Laptop,
  ShieldAlert
} from 'lucide-react';

import { 
  User, 
  Service, 
  UrgentNeed, 
  Order, 
  TopEarner 
} from './types';

import { DbService } from './lib/db';
import { supabase } from './lib/supabase';

import { 
  INITIAL_USER, 
  INITIAL_SERVICES, 
  INITIAL_URGENT_NEEDS, 
  INITIAL_ORDERS, 
  TOP_EARNERS 
} from './mockData';

import LandingPage from './components/LandingPage';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import CheckEmailPage from './components/CheckEmailPage';
import HomeFeed from './components/HomeFeed';
import BrowseServices from './components/BrowseServices';
import PostService from './components/PostService';
import OrdersView from './components/OrdersView';
import ProfileView from './components/ProfileView';
import AdminDashboard from './components/AdminDashboard';
import PeerChat from './components/PeerChat';

export const getBetterProfileImage = (remoteImage: string | undefined, localImage: string | undefined): string => {
  if (!remoteImage) return localImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150';
  const isRemotePlaceholder = remoteImage.includes('unsplash.com') || remoteImage.includes('dicebear.com') || remoteImage.includes('placeholder');
  const isLocalCustom = localImage && (localImage.startsWith('data:') || (!localImage.includes('unsplash.com') && !localImage.includes('dicebear.com')));
  if (isRemotePlaceholder && isLocalCustom) {
    return localImage;
  }
  return remoteImage;
};

// Helper to check for active auth token in local storage on page boot
const hasActiveSupabaseSession = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('-auth-token')) {
        return true;
      }
    }
  } catch (e) {}
  return false;
};

export default function App() {
  // Navigation Route State
  // 'landing' | 'signup' | 'login' | 'app' | 'check-email'
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'signup' | 'login' | 'app' | 'check-email'>(() => {
    if (hasActiveSupabaseSession()) {
      return 'app';
    }
    return 'landing';
  });
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'post' | 'orders' | 'profile' | 'admin'>('home');
  const [browseInitialCategory, setBrowseInitialCategory] = useState<string>('all');

  // Application Stateful Database
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('ttu_market_user_v1');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('ttu_market_services_v1');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  const [urgentNeeds, setUrgentNeeds] = useState<UrgentNeed[]>(() => {
    const saved = localStorage.getItem('ttu_market_needs_v1');
    return saved ? JSON.parse(saved) : INITIAL_URGENT_NEEDS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('ttu_market_orders_v1');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [isGuestMode, setIsGuestMode] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [notifications, setNotifications] = useState<string[]>([
    "Welcome to TTU Market! Earn by delivering or tutoring.",
    "Your student status was automatically verified by CS department registrar."
  ]);
  const [showNotificationsToast, setShowNotificationsToast] = useState(false);
  const [hudMessage, setHudMessage] = useState('');

  // Peer to peer chat selectors (Task 10)
  const [chatPartnerPhone, setChatPartnerPhone] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState('');

  // Sync state to local storage on changes
  useEffect(() => {
    localStorage.setItem('ttu_market_user_v1', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ttu_market_services_v1', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('ttu_market_needs_v1', JSON.stringify(urgentNeeds));
  }, [urgentNeeds]);

  useEffect(() => {
    localStorage.setItem('ttu_market_orders_v1', JSON.stringify(orders));
  }, [orders]);

  // Handle post-verification link auto-login and routing
  useEffect(() => {
    const handleAuthSession = async (session: any) => {
      if (session?.user) {
        try {
          let userRecord = await DbService.syncUserSessionById(session.user.id);
          if (!userRecord && session.user.email) {
            userRecord = await DbService.syncUserSessionByEmail(session.user.email);
          }

          // If STILL no userRecord in the database, self-heal by auto-creating it using verified auth metadata
          if (!userRecord) {
            console.log("Profile not found in users table, auto-creating from session metadata...");
            const authMeta = session.user.user_metadata || {};
            try {
              userRecord = await DbService.createUserProfile({
                id: session.user.id,
                name: authMeta.full_name || session.user.email?.split('@')[0] || 'Student Partner',
                phone: authMeta.phone || '050 ' + Math.floor(1000000 + Math.random() * 9000000).toString(),
                email: session.user.email || '',
                department: 'Computer Science',
                year: 'Year 3',
                profile_image: authMeta.profile_image || authMeta.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authMeta.full_name || 'Student')}`,
                is_verified: true,
                earned_ghs: 0,
                completed_jobs_count: 0
              });
            } catch (createErr) {
              console.warn("Failed to create profile row, falling back to layout auto-fill:", createErr);
            }
          }

          if (userRecord) {
            // Automatically make sure they are active and verified
            if (!userRecord.is_verified) {
              await DbService.syncUserSessionById(session.user.id, { is_verified: true });
              userRecord.is_verified = true;
            }
          }

          const finalRecord = userRecord || {
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student Partner',
            phone: session.user.user_metadata?.phone || '',
            email: session.user.email || '',
            department: 'Computer Science',
            year: 'Year 3',
            profile_image: session.user.user_metadata?.profile_image || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.user_metadata?.full_name || 'Student')}`,
            is_verified: true,
            earned_ghs: 0,
            completed_jobs_count: 0
          };

          const updatedUser: User = {
            name: finalRecord.name || 'Student Partner',
            phone: finalRecord.phone || '',
            email: finalRecord.email || session.user.email || '',
            department: finalRecord.department || 'Computer Science',
            year: finalRecord.year || 'Year 2',
            profileImage: getBetterProfileImage(finalRecord.profile_image, user.profileImage),
            isVerified: true,
            earnedGHS: parseFloat(finalRecord.earned_ghs || 0),
            completedJobsCount: parseInt(finalRecord.completed_jobs_count || 0)
          };

          setUser(updatedUser);
          setIsGuestMode(false);
          setCurrentRoute('app');
          setActiveTab('home');
          showHUD(`Email Verified! Welcome back, ${updatedUser.name}!`);
        } catch (err) {
          console.error("Error setting user session on auth shift:", err);
        }
      }
    };

    // 1. Immediately check for an active startup session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log("Restored active Supabase startup session successfully");
        handleAuthSession(session);
      }
    });

    // 2. Setup subscription to future state changes (email code clicks, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth State changed in App.tsx:", event, session);
      if (session?.user) {
        handleAuthSession(session);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Seamless handling of the Resend /auth/confirm?email=... verification url landing
  useEffect(() => {
    const processEmailVerification = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get('email');
      
      if ((window.location.pathname.includes('/auth/confirm') || window.location.pathname.includes('/confirm')) && emailParam) {
        console.log('[Resend Landing] Activating user profile for email confirmation:', emailParam);
        try {
          showHUD(`Activating account for ${emailParam}...`);
          
          // Force activation state to verified
          let userRecord = await DbService.syncUserSessionByEmail(emailParam, { is_verified: true });
          
          // Auto create a profile in the users table if first-time signup configuration
          if (!userRecord) {
            userRecord = await DbService.createUserProfile({
              id: `user_${Date.now()}`,
              name: emailParam.split('@')[0] || 'Student Partner',
              phone: '050 ' + Math.floor(1000000 + Math.random() * 9000000).toString(),
              email: emailParam,
              department: 'Computer Science',
              year: 'Year 3',
              profile_image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emailParam.split('@')[0] || 'Student')}`,
              is_verified: true,
              earned_ghs: 0,
              completed_jobs_count: 0
            });
          }
          
          const verifiedUser: User = {
            name: userRecord.name || emailParam.split('@')[0] || 'Student Partner',
            phone: userRecord.phone || '',
            email: userRecord.email || emailParam,
            department: userRecord.department || 'Computer Science',
            year: userRecord.year || 'Year 3',
            profileImage: getBetterProfileImage(userRecord.profile_image, ''),
            isVerified: true,
            earnedGHS: parseFloat(userRecord.earned_ghs || 0),
            completedJobsCount: parseInt(userRecord.completed_jobs_count || 0)
          };
          
          setUser(verifiedUser);
          setIsGuestMode(false);
          setCurrentRoute('app');
          setActiveTab('home');
          showHUD(`Thank you, ${verifiedUser.name}! Your email is successfully verified.`);
          
          // Purge the address parameters from the visible browser URL bar safely
          window.history.replaceState({}, document.title, window.location.origin);
        } catch (err: any) {
          console.error('[Resend Landing] Direct activation failed:', err);
        }
      }
    };
    processEmailVerification();
  }, []);

  const showHUD = (msg: string) => {
    setHudMessage(msg);
    setTimeout(() => setHudMessage(''), 3000);
  };

  // Real-time Database polling and event subscriptions (Task 3, 5, 8, 10, 11)
  const refreshDatabaseFeed = async () => {
    if (!user.phone) return;
    try {
      const [liveServices, liveNeeds, liveOrders] = await Promise.all([
        DbService.queryServices(),
        DbService.queryUrgentJobs(),
        DbService.queryOrders(user.name)
      ]);
      
      if (liveServices && liveServices.length > 0) {
        setServices(liveServices);
      }
      if (liveNeeds && liveNeeds.length > 0) {
        setUrgentNeeds(liveNeeds);
      }
      if (liveOrders) {
        setOrders(liveOrders);
      }

      // Sync specific profile wallet attributes from Supabase
      const liveProfile = await DbService.syncUserSession(user.phone);
      if (liveProfile) {
        setUser(prev => ({
          ...prev,
          name: liveProfile.name || prev.name,
          department: liveProfile.department || prev.department,
          year: liveProfile.year || prev.year,
          isVerified: liveProfile.is_verified === true,
          profileImage: getBetterProfileImage(liveProfile.profile_image, prev.profileImage),
          earnedGHS: parseFloat(liveProfile.earned_ghs || 0),
          completedJobsCount: parseInt(liveProfile.completed_jobs_count || 0)
        }));
      }
    } catch (err) {
      console.warn("Offline database local storage mirrored sandbox sync active:", err);
    }
  };

  useEffect(() => {
    if (currentRoute === 'app' && user.phone) {
      refreshDatabaseFeed();

      // Realtime subscription listeners (Task 11)
      const unsubscribeNotifs = DbService.subscribeToNotifications(user.phone, (incoming) => {
        setNotifications(prev => [
          `🔔 ALERT: ${incoming.text}`,
          ...prev
        ]);
        refreshDatabaseFeed();
      });

      return () => {
        unsubscribeNotifs();
      };
    }
  }, [currentRoute, user.phone]);

  // Auth handshakes (Task 2)
  const handleSignupSubmit = async (formData: { name: string; phone: string; email: string; department: string; year: string; studentIdImage?: string; profileImage: string }) => {
    // Save registered email to display on CheckEmailPage
    setRegisteredEmail(formData.email);
    setCurrentRoute('check-email');
    showHUD(`Check your email! Activation link sent to ${formData.email}`);
  };

  const handleLoginSubmit = async (emailOrPhone: string, userData: any) => {
    setIsGuestMode(false);
    
    setUser({
      name: userData?.name || 'Student Partner',
      phone: userData?.phone || '',
      email: userData?.email || (emailOrPhone.includes('@') ? emailOrPhone : ''),
      department: userData?.department || 'Computer Science',
      year: userData?.year || 'Year 2',
      profileImage: getBetterProfileImage(userData?.profile_image, user.profileImage),
      isVerified: userData?.is_verified === true,
      earnedGHS: parseFloat(userData?.earned_ghs || 0),
      completedJobsCount: parseInt(userData?.completed_jobs_count || 0)
    });

    setCurrentRoute('app');
    setActiveTab('home');
    showHUD("Welcome back! Campus feeds synchronized.");
  };

  const handleGuestBrowse = () => {
    setIsGuestMode(true);
    setCurrentRoute('app');
    setActiveTab('browse');
    setBrowseInitialCategory('all');
    showHUD("Browsing in Student Guest Mode.");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error signing out from Supabase auth:", err);
    }
    setUser(INITIAL_USER);
    setCurrentRoute('landing');
    setIsGuestMode(false);
  };

  // Navigation handlers from components
  const selectCategoryFromLandingOrFeed = (catId: string) => {
    setBrowseInitialCategory(catId);
    setActiveTab('browse');
    if (currentRoute !== 'app') {
      setCurrentRoute('app');
    }
  };

  // Add listings handlers
  const handleAddService = (data: { title: string; description: string; category: string; price: number; priceType: 'fixed' | 'hourly' | 'item'; imageUrl: string }) => {
    if (isGuestMode) {
      showHUD("Please register or login to list your services.");
      setCurrentRoute('signup');
      return;
    }
    const newService: Service = {
      id: `s_user_${Date.now()}`,
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      priceType: data.priceType,
      rating: 5.0,
      reviewsCount: 0,
      sellerName: user.name,
      sellerDept: user.department,
      sellerImage: user.profileImage,
      imageUrl: data.imageUrl,
      urgent: false,
      timestamp: new Date().toISOString()
    };

    setServices(prev => [newService, ...prev]);
    showHUD("Student skill published live!");
  };

  const handleAddUrgentNeed = (data: { title: string; description: string; budget: number; timeLeftText: string }) => {
    if (isGuestMode) {
      showHUD("Please sign up to broadcast SOS requests.");
      setCurrentRoute('signup');
      return;
    }
    const newNeed: UrgentNeed = {
      id: `u_user_${Date.now()}`,
      title: data.title,
      description: data.description,
      budget: data.budget,
      timeLeftText: data.timeLeftText,
      timestamp: new Date().toISOString(),
      posterName: user.name,
      posterDept: user.department,
      posterImage: user.profileImage,
      accepted: false,
      acceptedBy: null
    };

    setUrgentNeeds(prev => [newNeed, ...prev]);
    showHUD("SOS request broadcasted across campus feed!");
  };

  // Accept / Hire actions
  const handleAcceptUrgentNeed = (needId: string) => {
    if (isGuestMode) {
      showHUD("Create a student account to accept gigs & make money!");
      setCurrentRoute('signup');
      return;
    }

    const need = urgentNeeds.find(n => n.id === needId);
    if (!need) return;

    // Remove or flag as accepted
    setUrgentNeeds(prev => prev.map(item => {
      if (item.id === needId) {
        return { ...item, accepted: true, acceptedBy: user.name };
      }
      return item;
    }));

    // Create a selling order for Emmanuel
    const newOrder: Order = {
      id: `o_sos_${Date.now()}`,
      title: `SOS: ${need.title}`,
      price: need.budget,
      priceType: 'fixed',
      sellerName: user.name, // Emmanuel is working to deliver
      buyerName: need.posterName, // Poster is paying
      status: 'in_progress',
      timestamp: new Date().toISOString(),
      imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150', // activity stock
      urgentNeedId: needId
    };

    setOrders(prev => [newOrder, ...prev]);
    
    // Notify
    setNotifications(prev => [
      `You accepted the gig "${need.title}"! Open orders to align with ${need.posterName}.`,
      ...prev
    ]);

    setActiveTab('orders');
    showHUD("Sos Gig Accepted! Match created in your Gigs tab.");
  };

  const handleHireStudent = (service: Service) => {
    if (isGuestMode) {
      showHUD("Join TTU Market to book this service!");
      setSelectedService(null);
      setCurrentRoute('signup');
      return;
    }

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
    const email = `${user.phone.replace(/\s+/g, '')}@student.ttu.edu.gh`;

    try {
      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email: email,
        amount: Math.round(service.price * 100), // convert to Ghanaian Pesewas
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        callback: async (response: any) => {
          // Success Callback: Create Escrow order!
          const newOrder: Order = {
            id: `o_hire_${Date.now()}`,
            title: service.title,
            price: service.price,
            priceType: service.priceType,
            sellerName: service.sellerName, // student talent
            buyerName: user.name, // Client buyer
            status: 'in_progress',
            timestamp: new Date().toISOString(),
            imageUrl: service.imageUrl,
            serviceId: service.id
          };

          // Save order to Supabase table
          await DbService.createDirectOrder(newOrder);
          
          // Log Escrow Outflow track inside transactional ledger
          const txn = {
            id: `txn_esc_${Date.now()}`,
            user_id: user.phone,
            amount: service.price,
            type: 'withdrawal',
            status: 'completed',
            reference: `escrow_lock_${newOrder.id.slice(-4)}`,
            timestamp: new Date().toISOString()
          };
          await DbService.addManualTransaction(txn);

          // Update local state orders list
          setOrders(prev => [newOrder, ...prev]);
          setSelectedService(null);

          setNotifications(prev => [
            `🔒 GHS ${service.price} locked in Escrow ledger for ${service.sellerName}! Reach out to align materials.`,
            ...prev
          ]);

          setActiveTab('orders');
          showHUD("Escrow Locked! Student contractor notified.");
          refreshDatabaseFeed();
        },
        onClose: () => {
          showHUD("Booking Escrow payment cancelled by buyer.");
        }
      });
      handler.openIframe();
    } catch (err: any) {
      console.error("Paystack checkout loading failed:", err);
      showHUD("Paystack checkout fails to load. Please configure NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your env.");
      alert("Paystack secure payment gateway fails to find proper configs. Ensure NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is set in your environment file.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status'], extraFields?: any) => {
    try {
      const matchedOrder = orders.find(o => o.id === orderId);
      if (!matchedOrder) return;

      if (status === 'delivered') {
        const fileLink = extraFields?.deliverable_url || '';
        await DbService.markOrderDelivered(orderId, fileLink);
        showHUD("Deliverables submitted! Pending contractor confirmation.");
      } else if (status === 'completed') {
        await DbService.confirmEscrowRelease(orderId, matchedOrder.sellerName, matchedOrder.price);
        
        // If current active user screen is the seller, credit active state variables as well
        if (matchedOrder.sellerName === user.name) {
          setUser(currentUser => ({
            ...currentUser,
            earnedGHS: currentUser.earnedGHS + matchedOrder.price,
            completedJobsCount: (currentUser.completedJobsCount || 0) + 1
          }));
        }
        showHUD(`Escrow Released! GHS ${matchedOrder.price.toFixed(2)} credited to ${matchedOrder.sellerName}.`);
      } else if (status === 'cancelled') {
        if (extraFields?.disputed) {
          await DbService.raiseDisputeOnOrder(orderId, extraFields?.dispute_reason || "Dispute requested.");
          showHUD("Dispute flagged! Ticket routed to official registers.");
        } else {
          await DbService.adminResolveDispute(orderId, 'refund');
          if (matchedOrder.buyerName === user.name) {
            setUser(currentUser => ({
              ...currentUser,
              earnedGHS: currentUser.earnedGHS + matchedOrder.price
            }));
          }
          showHUD(`Escrow Refunded! GHS ${matchedOrder.price.toFixed(2)} restored to ${matchedOrder.buyerName}.`);
        }
      } else {
        await supabase.from('orders').update({ status, ...extraFields }).eq('id', orderId);
      }

      await refreshDatabaseFeed();
    } catch (err) {
      console.warn("Offline fallback status updater:", err);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, ...extraFields } : o));
    }
  };

  const handleAddReview = async (serviceId: string, rating: number) => {
    try {
      await DbService.addReview(serviceId, rating, "Highly recommended student partner!", user.name, user.profileImage);
    } catch (err) {
      console.warn(err);
    }

    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        const totalRatingPoints = s.rating * s.reviewsCount + rating;
        const newReviewsCount = s.reviewsCount + 1;
        return {
          ...s,
          reviewsCount: newReviewsCount,
          rating: parseFloat((totalRatingPoints / newReviewsCount).toFixed(1))
        };
      }
      return s;
    }));
    showHUD("Thank you! Star reviews published to contractor's portfolio.");
  };

  const handleUserProfileUpdate = async (data: { department: string; year: string; profileImage?: string }) => {
    try {
      const updateData: any = {
        department: data.department,
        year: data.year
      };
      if (data.profileImage) {
        updateData.profile_image = data.profileImage;
      }
      await DbService.syncUserSession(user.phone, updateData);
    } catch (err) {
      console.warn(err);
    }

    setUser(current => ({
      ...current,
      department: data.department,
      year: data.year,
      ...(data.profileImage ? { profileImage: data.profileImage } : {})
    }));
    showHUD("Profile credentials synced inside campus directory!");
  };

  const handleRemoveService = (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    showHUD("Service removed from catalog.");
  };

  // Filtering user's listed services on Profile
  const myServices = services.filter(s => s.sellerName === user.name);

  return (
    <div className="bg-[#F7F8FA] text-[#0D0D0D] min-h-screen font-sans relative overflow-x-hidden">
      
      {/* Toast Alert MessageHUD */}
      <AnimatePresence>
        {hudMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-20 right-4 max-w-sm bg-white/95 text-[#0D0D0D] text-xs font-bold px-4 py-3.5 rounded-xl z-[9999] shadow-2xl flex items-center gap-2 border border-[#E5E7EB] backdrop-blur-lg"
          >
            <Sparkles className="w-4 h-4 text-[#0F6E56]" />
            <span>{hudMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER PAGES ACCORDING TO STATEFUL ROUTING */}
      {currentRoute === 'landing' && (
        <LandingPage 
          onJoinNow={() => setCurrentRoute('signup')}
          onLogin={() => setCurrentRoute('login')}
          onBrowseServices={handleGuestBrowse}
          onSelectCategory={selectCategoryFromLandingOrFeed}
        />
      )}

      {currentRoute === 'signup' && (
        <SignupPage 
          onSignup={handleSignupSubmit}
          onLogin={() => setCurrentRoute('login')}
          onBack={() => setCurrentRoute('landing')}
        />
      )}

      {currentRoute === 'login' && (
        <LoginPage 
          onLoginSuccess={handleLoginSubmit}
          onSignup={() => setCurrentRoute('signup')}
          onBack={() => setCurrentRoute('landing')}
        />
      )}

      {currentRoute === 'check-email' && (
        <CheckEmailPage 
          email={registeredEmail}
          onBack={() => setCurrentRoute('login')}
          onVerifySuccess={(userData) => {
            handleLoginSubmit(userData.email || registeredEmail, userData);
          }}
        />
      )}

      {/* MAIN LOGGED-IN APPLICATION ENVIRONMENT */}
      {currentRoute === 'app' && (
        <div className="min-h-screen flex flex-col justify-between">
          
          {/* Global Logged-in Header */}
          <header className="sticky top-0 w-full z-50 flex justify-between items-center px-4 md:px-10 h-16 bg-white/95 backdrop-blur-xl border-b border-[#E5E7EB] shadow-sm">
            <div 
              onClick={() => setActiveTab('home')}
              className="text-lg md:text-xl font-black text-[#0F6E56] tracking-tight cursor-pointer uppercase flex items-center gap-1.5"
            >
              <span>TTU Market</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {isGuestMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-[#6B7280] bg-[#F7F8FA] px-3 py-1 rounded-full border border-[#E5E7EB]">
                    Guest Mode
                  </span>
                  <button 
                    id="header-join-now-btn"
                    onClick={() => setCurrentRoute('signup')}
                    className="glass-btn-primary text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                  >
                    Join Now
                  </button>
                </div>
              ) : (
                <>
                  {/* Notifications bell */}
                  <div className="relative">
                    <button 
                      id="notifications-bell-btn"
                      onClick={() => setShowNotificationsToast(prev => !prev)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#6B7280] relative transition-transform active:scale-95 cursor-pointer"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>

                    {/* Notification dropdown overlay */}
                    <AnimatePresence>
                      {showNotificationsToast && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl p-4 z-50 text-left backdrop-blur-2xl text-[#0D0D0D]"
                        >
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#E5E7EB]">
                            <span className="text-xs font-bold text-[#0D0D0D]">Campus Alerts</span>
                            <button 
                              onClick={() => setNotifications([])}
                              className="text-[10px] text-[#0F6E56] font-bold hover:underline"
                            >
                              Clear all
                            </button>
                          </div>
                          
                          <div className="space-y-3 max-h-56 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <p className="text-[11px] text-[#6B7280] text-center py-4">No new notifications.</p>
                            ) : (
                              notifications.map((notif, index) => (
                                <div key={index} className="flex gap-2 text-xs text-[#6B7280] border-b border-[#E5E7EB] pb-2 last:border-00">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF9F27] mt-1.5 flex-shrink-0"></div>
                                  <p className="leading-relaxed">{notif}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Profile quick stats pill */}
                  <div 
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 cursor-pointer bg-[#F7F8FA] hover:bg-slate-100 rounded-full p-1 pr-3 border border-[#E5E7EB] transition-colors"
                  >
                    <img 
                      src={user.profileImage} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover border border-[#0F6E56]"
                    />
                    <div className="hidden sm:block text-left">
                      <div className="text-[10px] font-bold text-[#0D0D0D] line-clamp-1">{user.name}</div>
                      <div className="text-[9px] font-semibold text-[#0F6E56] leading-none">GHS {user.earnedGHS.toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* ACTIVE MIDDLE SCREEN BODY */}
          <main className="flex-grow pb-24">
            {activeTab === 'home' && (
              <HomeFeed 
                user={user}
                onSelectCategory={selectCategoryFromLandingOrFeed}
                onSelectService={(service) => {
                  setSelectedService(service);
                }}
                onAcceptUrgentNeed={handleAcceptUrgentNeed}
                onViewAllUrgent={() => {
                  setActiveTab('browse');
                  setBrowseInitialCategory('all');
                }}
                onSearchChange={(search) => {
                  setActiveTab('browse');
                  setBrowseInitialCategory('all');
                }}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseServices 
                services={services}
                initialCategory={browseInitialCategory}
                onSelectService={(service) => {
                  setSelectedService(service);
                }}
              />
            )}

            {activeTab === 'post' && (
              <PostService 
                user={user}
                onAddService={handleAddService}
                onAddUrgentNeed={handleAddUrgentNeed}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView 
                orders={orders}
                onUpdateStatus={handleUpdateOrderStatus}
                onAddReview={handleAddReview}
                loginUserName={user.name}
                loginUserPhone={user.phone}
                onOpenPeerChat={(partnerPhone, partnerName) => {
                  setChatPartnerPhone(partnerPhone);
                  setChatPartnerName(partnerName);
                }}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView 
                user={user}
                onLogout={handleLogout}
                myServices={myServices}
                onDeleteService={handleRemoveService}
                onUpdateSchoolInfo={handleUserProfileUpdate}
                onWalletUpdated={() => {
                  refreshDatabaseFeed();
                }}
              />
            )}

            {activeTab === 'admin' && (
              <AdminDashboard onNotifyUpdate={() => {
                refreshDatabaseFeed();
              }} />
            )}
          </main>

          {/* BOTTOM NAVIGATION BAR */}
          <nav className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-[#E5E7EB] h-20 shadow-lg flex justify-around items-center px-4 pb-safe">
            
            {/* HOME TABS BTN */}
            <button 
              id="tab-btn-home"
              onClick={() => { setActiveTab('home'); setBrowseInitialCategory('all'); }}
              className={`flex flex-col items-center justify-center py-1 transition-all w-16 cursor-pointer ${
                activeTab === 'home' 
                  ? 'text-[#0F6E56] font-bold scale-105' 
                  : 'text-[#6B7280] hover:text-[#0F6E56]'
              }`}
            >
              <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5px] fill-[#0F6E56]/10 text-[#0F6E56]' : 'text-[#6B7280]'}`} />
              <span className="text-[10px] mt-1 font-semibold">Home</span>
            </button>

            {/* BROWSE TABS BTN */}
            <button 
              id="tab-btn-browse"
              onClick={() => { setActiveTab('browse'); setBrowseInitialCategory('all'); }}
              className={`flex flex-col items-center justify-center py-1 transition-all w-16 cursor-pointer ${
                activeTab === 'browse' 
                  ? 'text-[#0F6E56] font-bold scale-105' 
                  : 'text-[#6B7280] hover:text-[#0F6E56]'
              }`}
            >
              <Search className={`w-5 h-5 ${activeTab === 'browse' ? 'stroke-[2.5px] text-[#0F6E56]' : 'text-[#6B7280]'}`} />
              <span className="text-[10px] mt-1 font-semibold">Browse</span>
            </button>

            {/* BIG ROUND ACCENTED POST BTN */}
            <button 
              id="tab-btn-post"
              onClick={() => setActiveTab('post')}
              className={`flex flex-col items-center justify-center transform active:scale-90 transition-transform cursor-pointer -translate-y-2 relative`}
              title="Post Service"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl shadow-[#0F6E56]/20 transition-all ${
                activeTab === 'post' ? 'bg-[#0F6E56] rotate-45 scale-105' : 'bg-[#0F6E56] hover:bg-[#0b5441]'
              }`}>
                <PlusCircle className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <span className="text-[10px] mt-1 font-bold text-[#6B7280]">Post</span>
            </button>

            {/* ORDERS TABS BTN */}
            <button 
              id="tab-btn-orders"
              onClick={() => setActiveTab('orders')}
              className={`flex flex-col items-center justify-center py-1 transition-all w-16 cursor-pointer ${
                activeTab === 'orders' 
                  ? 'text-[#0F6E56] font-bold scale-105' 
                  : 'text-[#6B7280] hover:text-[#0F6E56]'
              }`}
            >
              <Receipt className={`w-5 h-5 ${activeTab === 'orders' ? 'stroke-[2.5px] fill-[#0F6E56]/10 text-[#0F6E56]' : 'text-[#6B7280]'}`} />
              <span className="text-[10px] mt-1 font-semibold">Orders</span>
            </button>

            {/* PROFILE TABS BTN */}
            <button 
              id="tab-btn-profile"
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center py-1 transition-all w-16 cursor-pointer ${
                activeTab === 'profile' 
                  ? 'text-[#0F6E56] font-bold scale-105' 
                  : 'text-[#6B7280] hover:text-[#0F6E56]'
              }`}
            >
              <UserIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5px] fill-[#0F6E56]/10 text-[#0F6E56]' : 'text-[#6B7280]'}`} />
              <span className="text-[10px] mt-1 font-semibold">Profile</span>
            </button>

            {/* REGISTER-ADMIN TABS BTN */}
            {(user.phone === '050 000 1337' || user.phone === '0500001337') && (
              <button 
                id="tab-btn-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center justify-center py-1 transition-all w-16 cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'text-red-600 font-bold scale-105' 
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <ShieldAlert className={`w-5 h-5 ${activeTab === 'admin' ? 'stroke-[2.5px] text-red-600' : 'text-gray-500'}`} />
                <span className="text-[10px] mt-1 font-semibold">Admin</span>
              </button>
            )}

          </nav>

        </div>
      )}

      {/* PEER TO PEER CHAT BOX DRAWER */}
      <AnimatePresence>
        {chatPartnerPhone && (
          <PeerChat 
            user={user}
            partnerPhone={chatPartnerPhone}
            partnerName={chatPartnerName || "Student Contractor"}
            onClose={() => {
              setChatPartnerPhone('');
              setChatPartnerName('');
            }}
          />
        )}
      </AnimatePresence>

      {/* SERVICE OVERVIEW DETAIL MODAL DIRECT ACCORDING TO VIEW SELECTIONS */}
      <AnimatePresence>
        {selectedService && (
          <div id="service-overview-modal" className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E5E7EB] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col justify-between text-[#0D0D0D]"
            >
              
              {/* Image banner */}
              <div className="h-56 relative bg-[#F7F8FA] flex-shrink-0">
                <img 
                  src={selectedService.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                
                {/* Back / Close button */}
                <button 
                  id="close-overview-btn"
                  onClick={() => setSelectedService(null)}
                  className="absolute top-4 right-4 bg-white/95 hover:bg-white text-[#0D0D0D] p-2 rounded-full cursor-pointer transition-all border border-[#E5E7EB] shadow"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Information body Scroll area */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div>
                  <span className="text-[10px] bg-[#0F6E56]/10 text-[#0F6E56] px-3 py-1 rounded-full uppercase tracking-wider font-bold border border-[#0F6E56]/20">
                    {selectedService.category} Service
                  </span>
                  
                  <h2 id="overview-title" className="text-xl font-extrabold text-[#0D0D0D] mt-2 mb-1 tracking-tight leading-snug">
                    {selectedService.title}
                  </h2>
                  
                  <div className="text-base font-black text-[#EF9F27]">
                    GHS {selectedService.price}
                    {selectedService.priceType === 'hourly' ? '/hr' : ''}
                  </div>
                </div>

                {/* Seller snippet */}
                <div className="bg-[#F7F8FA] p-4 rounded-2xl border border-[#E5E7EB] flex items-center gap-3">
                  <img 
                    src={selectedService.sellerImage} 
                    alt={selectedService.sellerName}
                    className="w-10 h-10 rounded-full object-cover border border-[#0F6E56]" 
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#0D0D0D]">Listed by {selectedService.sellerName}</h4>
                    <p className="text-[10px] text-[#6B7280]">{selectedService.sellerDept}</p>
                    <div className="flex items-center gap-1.5 text-[#EF9F27] mt-0.5">
                      <Star className="w-3 h-3 fill-[#EF9F27] text-[#EF9F27]" />
                      <span className="text-[10px] font-bold text-[#6B7280]">{selectedService.rating.toFixed(1)} Rating</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">Description</h4>
                  <p className="text-xs text-[#0D0D0D] leading-relaxed whitespace-pre-wrap">
                    {selectedService.description}
                  </p>
                </div>
              </div>

              {/* Action checkout row */}
              <div className="p-4 bg-white border-t border-[#E5E7EB] flex gap-3 flex-shrink-0">
                <button 
                  id="hire-partner-btn"
                  onClick={() => handleHireStudent(selectedService)}
                  className="flex-grow glass-btn-primary py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider text-center cursor-pointer shadow-md transform hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Hire Student Partner
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
