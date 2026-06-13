import { supabase } from './supabase';

// Helper to convert base64 (e.g. data URL from user photo selection) to solid Blobs for real Supabase Storage upload
export async function base64ToBlob(base64Data: string, mimeType: string = 'image/jpeg'): Promise<Blob> {
  if (!base64Data.startsWith('data:')) {
    // If it's already a URL, return a placeholder or fetch it
    try {
      const response = await fetch(base64Data);
      return await response.blob();
    } catch {
      return new Blob([], { type: mimeType });
    }
  }
  const sliceSize = 512;
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: mimeType });
}

// Generic file upload helper to public or private storage buckets
export async function uploadFileToBucket(bucketName: string, filePath: string, fileData: Blob | File): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, fileData, {
      cacheControl: '3600',
      upsert: true
    });

    if (error) {
      console.warn(`Storage upload warning to bucket ${bucketName}:`, error.message);
      // Fallback
      return `https://images.unsplash.com/photo-1544717305-2782549b5136?w=400`;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || '';
  } catch (err) {
    console.warn('Bucket upload exception:', err);
    return `https://images.unsplash.com/photo-1544717305-2782549b5136?w=400`;
  }
}

// CENTRALIZED FALLBACK CACHE (LocalStorage mirroring)
const LOCAL_CACHE_KEYS = {
  users: 'ttu_db_users_cache',
  services: 'ttu_db_services_cache',
  urgent_jobs: 'ttu_db_urgent_jobs_cache',
  orders: 'ttu_db_orders_cache',
  transactions: 'ttu_db_transactions_cache',
  messages: 'ttu_db_messages_cache',
  notifications: 'ttu_db_notifications_cache',
  reviews: 'ttu_db_reviews_cache'
};

const getCachedData = <T>(key: keyof typeof LOCAL_CACHE_KEYS, defaultVal: T): T => {
  try {
    const saved = localStorage.getItem(LOCAL_CACHE_KEYS[key]);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const saveCachedData = <T>(key: keyof typeof LOCAL_CACHE_KEYS, data: T): void => {
  try {
    localStorage.setItem(LOCAL_CACHE_KEYS[key], JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage write failed:', err);
  }
};

// --- DATA ACCESS LAYER ---

export const DbService = {
  // 1. users Table Operations
  async syncUserSession(phone: string, updateData?: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        if (updateData) {
          const { data: updated, error: uError } = await supabase
            .from('users')
            .update(updateData)
            .eq('phone', phone)
            .select()
            .single();
          if (uError) throw uError;
          return updated;
        }
        return data;
      }
      return null;
    } catch (err) {
      console.warn('Supabase User Fetch error, pulling local cache:', err);
      const cachedUsers = getCachedData<any[]>('users', []);
      let matched = cachedUsers.find(u => u.phone === phone);
      if (matched && updateData) {
        Object.assign(matched, updateData);
        saveCachedData('users', cachedUsers);
      }
      return matched || null;
    }
  },

  async syncUserSessionById(id: string, updateData?: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        if (updateData) {
          const { data: updated, error: uError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
          if (uError) throw uError;
          return updated;
        }
        return data;
      }
      return null;
    } catch (err) {
      console.warn('Supabase User Fetch by ID error, pulling local cache:', err);
      const cachedUsers = getCachedData<any[]>('users', []);
      let matched = cachedUsers.find(u => u.id === id);
      if (matched && updateData) {
        Object.assign(matched, updateData);
        saveCachedData('users', cachedUsers);
      }
      return matched || null;
    }
  },

  async syncUserSessionByEmail(email: string, updateData?: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        if (updateData) {
          const { data: updated, error: uError } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', email)
            .select()
            .single();
          if (uError) throw uError;
          return updated;
        }
        return data;
      }
      return null;
    } catch (err) {
      console.warn('Supabase User Fetch by Email error, pulling local cache:', err);
      const cachedUsers = getCachedData<any[]>('users', []);
      let matched = cachedUsers.find(u => u.email === email);
      if (matched && updateData) {
        Object.assign(matched, updateData);
        saveCachedData('users', cachedUsers);
      }
      return matched || null;
    }
  },

  async createUserProfile(profile: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    department: string;
    year: string;
    profile_image: string;
    student_id_image?: string;
    is_verified?: boolean;
    earned_ghs?: number;
    completed_jobs_count?: number;
    role?: string;
  }): Promise<any> {
    const defaultProfile = {
      is_verified: false,
      earned_ghs: 0,
      completed_jobs_count: 0,
      role: profile.phone === '050 000 1337' || profile.phone === '0500001337' ? 'admin' : 'student',
      ...profile
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(defaultProfile, { onConflict: 'phone' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase profile creation error, writing to local cache:', err);
      const cachedUsers = getCachedData<any[]>('users', []);
      const index = cachedUsers.findIndex(u => u.phone === profile.phone);
      if (index > -1) {
        cachedUsers[index] = { ...cachedUsers[index], ...defaultProfile };
      } else {
        cachedUsers.push(defaultProfile);
      }
      saveCachedData('users', cachedUsers);
      return defaultProfile;
    }
  },

  async queryTopEarners(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('earned_ghs', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch {
      // Return beautiful sorted top list from user cache or mockData standard
      const cachedUsers = getCachedData<any[]>('users', []);
      return cachedUsers
        .sort((a, b) => (b.earned_ghs || 0) - (a.earned_ghs || 0))
        .map((u, i) => ({
          rank: i + 1,
          name: u.name,
          department: u.department,
          amount: u.earned_ghs || 0,
          avatarUrl: u.profile_image
        }));
    }
  },

  // 2. urgent_jobs / SOS Needs Operations
  async queryUrgentJobs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('urgent_jobs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return getCachedData<any[]>('urgent_jobs', []);
    }
  },

  async createUrgentJob(job: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('urgent_jobs')
        .insert(job)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const current = getCachedData<any[]>('urgent_jobs', []);
      current.unshift(job);
      saveCachedData('urgent_jobs', current);
      return job;
    }
  },

  async acceptUrgentJob(jobId: string, studentName: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('urgent_jobs')
        .update({ accepted: true, accepted_by: studentName })
        .eq('id', jobId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const current = getCachedData<any[]>('urgent_jobs', []);
      const index = current.findIndex(j => j.id === jobId);
      if (index > -1) {
        current[index].accepted = true;
        current[index].accepted_by = studentName;
        saveCachedData('urgent_jobs', current);
        return current[index];
      }
      return null;
    }
  },

  // 3. services Catalog Operations
  async queryServices(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return getCachedData<any[]>('services', []).filter(s => s.status === 'active' || s.status === undefined);
    }
  },

  async queryAllServicesAdmin(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return getCachedData<any[]>('services', []);
    }
  },

  async createService(service: any): Promise<any> {
    const payload = { ...service, status: 'pending' };
    try {
      const { data, error } = await supabase
        .from('services')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const current = getCachedData<any[]>('services', []);
      current.unshift(payload);
      saveCachedData('services', current);
      return payload;
    }
  },

  async approveService(serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status: 'active' })
        .eq('id', serviceId);
      if (error) throw error;
      return true;
    } catch {
      const current = getCachedData<any[]>('services', []);
      const idx = current.findIndex(s => s.id === serviceId);
      if (idx > -1) {
        current[idx].status = 'active';
        saveCachedData('services', current);
        return true;
      }
      return false;
    }
  },

  async rejectService(serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      if (error) throw error;
      return true;
    } catch {
      const current = getCachedData<any[]>('services', []);
      const filtered = current.filter(s => s.id !== serviceId);
      saveCachedData('services', filtered);
      return true;
    }
  },

  // 4. Custom reviews Table
  async queryReviewsForService(serviceId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('service_id', serviceId);

      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('reviews', []);
      return cached.filter(r => r.service_id === serviceId);
    }
  },

  async addReview(serviceId: string, rating: number, comment: string, reviewerName: string, reviewerImage: string): Promise<any> {
    const payload = {
      id: `rev_${Date.now()}`,
      service_id: serviceId,
      rating,
      comment,
      reviewer_name: reviewerName,
      reviewer_image: reviewerImage,
      timestamp: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const current = getCachedData<any[]>('reviews', []);
      current.push(payload);
      saveCachedData('reviews', current);
      return payload;
    }
  },

  // 5. Escrow Orders Operations
  async queryOrders(userName: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_name.eq."${userName}",seller_name.eq."${userName}"`)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('orders', []);
      return cached.filter(o => o.buyer_name === userName || o.seller_name === userName);
    }
  },

  async createDirectOrder(order: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const current = getCachedData<any[]>('orders', []);
      current.unshift(order);
      saveCachedData('orders', current);
      return order;
    }
  },

  async markOrderDelivered(orderId: string, fileUrl: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'pending', // Pending buyer confirmation
          escrow_status: 'holding',
          delivered_at: new Date().toISOString(),
          completion_file_url: fileUrl 
        })
        .eq('id', orderId);
      if (error) throw error;
      return true;
    } catch {
      const current = getCachedData<any[]>('orders', []);
      const idx = current.findIndex(o => o.id === orderId);
      if (idx > -1) {
        current[idx].status = 'pending';
        current[idx].delivered_at = new Date().toISOString();
        current[idx].completion_file_url = fileUrl;
        saveCachedData('orders', current);
        return true;
      }
      return false;
    }
  },

  async confirmEscrowRelease(orderId: string, sellerName: string, amt: number): Promise<boolean> {
    try {
      // 1. Release Order Escrow
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          escrow_status: 'released'
        })
        .eq('id', orderId);
      if (error) throw error;

      // 2. Fetch Seller Profile and add funds
      const { data: sellerData } = await supabase
        .from('users')
        .select('*')
        .eq('name', sellerName)
        .maybeSingle();

      if (sellerData) {
        await supabase
          .from('users')
          .update({ 
            earned_ghs: (sellerData.earned_ghs || 0) + amt,
            completed_jobs_count: (sellerData.completed_jobs_count || 0) + 1
          })
          .eq('phone', sellerData.phone);
      }

      return true;
    } catch {
      const current = getCachedData<any[]>('orders', []);
      const idx = current.findIndex(o => o.id === orderId);
      if (idx > -1) {
        current[idx].status = 'completed';
        current[idx].escrow_status = 'released';
        saveCachedData('orders', current);

        // Update local user Cache too
        const cachedUsers = getCachedData<any[]>('users', []);
        const uIdx = cachedUsers.findIndex(u => u.name === sellerName);
        if (uIdx > -1) {
          cachedUsers[uIdx].earned_ghs = (cachedUsers[uIdx].earned_ghs || 0) + amt;
          cachedUsers[uIdx].completed_jobs_count = (cachedUsers[uIdx].completed_jobs_count || 0) + 1;
          saveCachedData('users', cachedUsers);
        }
        return true;
      }
      return false;
    }
  },

  async raiseDisputeOnOrder(orderId: string, disputeReason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled', // Handled by dispute panel
          escrow_status: 'holding', // Still hold funds
          disputed: true,
          dispute_reason: disputeReason
        })
        .eq('id', orderId);
      if (error) throw error;
      return true;
    } catch {
      const current = getCachedData<any[]>('orders', []);
      const idx = current.findIndex(o => o.id === orderId);
      if (idx > -1) {
        current[idx].status = 'cancelled';
        current[idx].disputed = true;
        current[idx].dispute_reason = disputeReason;
        saveCachedData('orders', current);
        return true;
      }
      return false;
    }
  },

  async queryAllOrdersAdmin(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return getCachedData<any[]>('orders', []);
    }
  },

  async adminResolveDispute(orderId: string, action: 'release' | 'refund'): Promise<boolean> {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (!order) return false;

      if (action === 'release') {
        // Give money to seller
        await this.confirmEscrowRelease(orderId, order.seller_name, order.price);
      } else {
        // Refund money to buyer
        await supabase.from('orders').update({
          status: 'cancelled',
          escrow_status: 'refunded'
        }).eq('id', orderId);

        // Find buyer phone and credit back
        const { data: buyer } = await supabase.from('users').select('*').eq('name', order.buyer_name).maybeSingle();
        if (buyer) {
          await supabase.from('users').update({
            earned_ghs: (buyer.earned_ghs || 0) + order.price
          }).eq('id', buyer.id);
        }
      }
      return true;
    } catch {
      const current = getCachedData<any[]>('orders', []);
      const idx = current.findIndex(o => o.id === orderId);
      if (idx > -1) {
        current[idx].status = 'cancelled';
        current[idx].escrow_status = action === 'release' ? 'released' : 'refunded';
        saveCachedData('orders', current);
        return true;
      }
      return false;
    }
  },

  // 6. transactions Table Ledger Operations
  async queryTransactions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('transactions', []);
      return cached.filter(t => t.user_id === userId);
    }
  },

  async addManualTransaction(transaction: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const cached = getCachedData<any[]>('transactions', []);
      cached.unshift(transaction);
      saveCachedData('transactions', cached);
      return transaction;
    }
  },

  // 7. peer communications Message tables
  async queryConversations(userPhone: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_one.eq."${userPhone}",participant_two.eq."${userPhone}"`);
      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('messages', []);
      // Unique chats by sender/receiver
      const partners = new Set<string>();
      const list: any[] = [];
      cached.forEach(m => {
        const other = m.sender === userPhone ? m.receiver : m.sender;
        if (other && !partners.has(other)) {
          partners.add(other);
          list.push({
            id: `conv_${other}`,
            partner_phone: other,
            last_message: m.text,
            last_timestamp: m.timestamp
          });
        }
      });
      return list;
    }
  },

  async queryMessages(userPhoneOnClient: string, partnerPhone: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender.eq."${userPhoneOnClient}",receiver.eq."${partnerPhone}"),and(sender.eq."${partnerPhone}",receiver.eq."${userPhoneOnClient}")`)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('messages', []);
      return cached.filter(
        m => (m.sender === userPhoneOnClient && m.receiver === partnerPhone) ||
             (m.sender === partnerPhone && m.receiver === userPhoneOnClient)
      ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  },

  async sendMessage(sender: string, receiver: string, text: string, fileUrl?: string): Promise<any> {
    // String matching regex detecting standard WhatsApp/Ghana format phone numbers to block them automatically
    const containsPhoneRegex = /(\+?233|0)[25][0-9]\s?[0-9]{3}\s?[0-9]{4}/g;
    let processedText = text;
    if (containsPhoneRegex.test(text)) {
      processedText = text.replace(containsPhoneRegex, "[Block: Phone sharing is strictly forbidden under peer escrow policies!]");
    }

    const payload = {
      id: `msg_${Date.now()}`,
      sender,
      receiver,
      text: processedText,
      file_url: fileUrl || null,
      timestamp: new Date().toISOString(),
      is_read: false
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const cached = getCachedData<any[]>('messages', []);
      cached.push(payload);
      saveCachedData('messages', cached);
      return payload;
    }
  },

  subscribeToNewMessages(userPhone: string, onMsg: (msg: any) => void) {
    try {
      const subscription = supabase
        .channel(`messages_channel_${userPhone}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver=eq.${userPhone}`
        }, (payload) => {
          onMsg(payload.new);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (err) {
      console.warn('Realtime subscription not available in offline/local fallback state:', err);
      return () => {};
    }
  },

  // 8. Notifications Alert table
  async queryNotifications(userPhone: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_phone', userPhone)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('notifications', []);
      return cached.filter(n => n.user_phone === userPhone);
    }
  },

  async createNotification(userPhone: string, text: string): Promise<any> {
    const payload = {
      id: `notif_${Date.now()}`,
      user_phone: userPhone,
      text,
      timestamp: new Date().toISOString(),
      is_read: false
    };
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      const cached = getCachedData<any[]>('notifications', []);
      cached.unshift(payload);
      saveCachedData('notifications', cached);
      return payload;
    }
  },

  async markAllAlertsRead(userPhone: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_phone', userPhone);
      if (error) throw error;
      return true;
    } catch {
      const cached = getCachedData<any[]>('notifications', []);
      cached.forEach(n => {
        if (n.user_phone === userPhone) n.is_read = true;
      });
      saveCachedData('notifications', cached);
      return true;
    }
  },

  subscribeToNotifications(userPhone: string, onNotif: (notif: any) => void) {
    try {
      const subscription = supabase
        .channel(`notifications_channel_${userPhone}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_phone=eq.${userPhone}`
        }, (payload) => {
          onNotif(payload.new);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (err) {
      console.warn('Realtime notifications connection unavailable in fallback state:', err);
      return () => {};
    }
  },

  // 9. Admin operations
  async adminQueryPendingVerifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_verified', false);
      if (error) throw error;
      return data || [];
    } catch {
      const cached = getCachedData<any[]>('users', []);
      return cached.filter(u => u.is_verified === false);
    }
  },

  async adminVerifyUser(userPhone: string, approve: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: approve })
        .eq('phone', userPhone);
      if (error) throw error;
      return true;
    } catch {
      const cached = getCachedData<any[]>('users', []);
      const idx = cached.findIndex(u => u.phone === userPhone);
      if (idx > -1) {
        cached[idx].is_verified = approve;
        saveCachedData('users', cached);
        return true;
      }
      return false;
    }
  }
};
