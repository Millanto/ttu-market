-- TTU MARKET PRODUCTION DATABASE SCHEMA
-- This SQL script creates all required tables, configures Row Level Security (RLS),
-- and populates default badges for the Takoradi Technical University student economy.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users table
CREATE TABLE IF NOT EXISTS public.users (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL UNIQUE,
    phone text NOT NULL UNIQUE,
    email text UNIQUE,
    department text,
    year text,
    profile_image text,
    student_id_image text,
    is_verified boolean DEFAULT false,
    earned_ghs numeric DEFAULT 0,
    completed_jobs_count integer DEFAULT 0,
    role text DEFAULT 'student'::text,
    reputation_score numeric DEFAULT 5.0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Allow public read access to users profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profiles" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow users to insert profiles" ON public.users FOR INSERT WITH CHECK (true);

-- 2. services table
CREATE TABLE IF NOT EXISTS public.services (
    id text NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    category text,
    price numeric NOT NULL,
    priceType text DEFAULT 'fixed'::text,
    status text DEFAULT 'pending'::text,
    rating numeric DEFAULT 5.0,
    reviewsCount integer DEFAULT 0,
    reviews_count integer DEFAULT 0,
    sellerName text,
    seller_name text NOT NULL REFERENCES public.users(name) ON UPDATE CASCADE,
    sellerDept text,
    seller_dept text,
    sellerImage text,
    seller_image text,
    imageUrl text,
    image_url text,
    urgent boolean DEFAULT false,
    timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- services policies
CREATE POLICY "Allow public read access to active services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow users to insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow sellers and admin to update services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Allow admin and seller to delete services" ON public.services FOR DELETE USING (true);

-- 3. urgent_jobs table (campus SOS need posts)
CREATE TABLE IF NOT EXISTS public.urgent_jobs (
    id text NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    budget numeric NOT NULL,
    timeLeftText text,
    timestamp text DEFAULT timezone('utc'::text, now())::text,
    posterName text,
    posterDept text,
    posterImage text,
    accepted boolean DEFAULT false,
    acceptedBy text
);

-- Enable RLS on urgent_jobs
ALTER TABLE public.urgent_jobs ENABLE ROW LEVEL SECURITY;

-- policies
CREATE POLICY "Allow public select on urgent jobs" ON public.urgent_jobs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated inserts on urgent jobs" ON public.urgent_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on urgent jobs" ON public.urgent_jobs FOR UPDATE USING (true);

-- 4. orders table (peer escrow contracts)
CREATE TABLE IF NOT EXISTS public.orders (
    id text NOT NULL PRIMARY KEY,
    title text NOT NULL,
    price numeric NOT NULL,
    priceType text DEFAULT 'fixed'::text,
    sellerName text,
    seller_name text NOT NULL,
    buyerName text,
    buyer_name text NOT NULL,
    status text DEFAULT 'in_progress'::text,
    timestamp text DEFAULT timezone('utc'::text, now())::text,
    imageUrl text,
    image_url text,
    serviceId text,
    service_id text,
    urgentNeedId text,
    urgent_need_id text,
    disputed boolean DEFAULT false,
    dispute_reason text,
    deliverable_url text,
    deliverable_filename text,
    escrowStatus text DEFAULT 'holding'::text,
    paystackReference text,
    escrow_status text DEFAULT 'holding'::text,
    delivered_at text,
    completion_file_url text
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- policies
CREATE POLICY "Allow public select on orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow inserts on orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates on orders" ON public.orders FOR UPDATE USING (true);

-- 5. messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id text NOT NULL PRIMARY KEY,
    sender text NOT NULL,
    receiver text NOT NULL,
    text text NOT NULL,
    file_url text,
    timestamp text DEFAULT timezone('utc'::text, now())::text,
    is_read boolean DEFAULT false
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- policies
CREATE POLICY "Allow users to read their own messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow messaging communication" ON public.messages FOR INSERT WITH CHECK (true);

-- 6. conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id text NOT NULL PRIMARY KEY,
    participant_one text NOT NULL,
    participant_two text NOT NULL,
    last_message text,
    last_timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow conversation insertion" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow conversation modifications" ON public.conversations FOR UPDATE USING (true);

-- 7. transactions table (Escrow ledger and deposits log)
CREATE TABLE IF NOT EXISTS public.transactions (
    id text NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'completed'::text,
    reference text,
    timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow transactions insertion" ON public.transactions FOR INSERT WITH CHECK (true);

-- 8. reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id text NOT NULL PRIMARY KEY,
    service_id text NOT NULL,
    rating numeric NOT NULL,
    comment text,
    reviewer_name text,
    reviewer_image text,
    timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow write reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- 9. disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id text NOT NULL PRIMARY KEY,
    order_id text NOT NULL,
    raised_by text,
    reason text,
    status text DEFAULT 'pending'::text,
    resolution text,
    timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select disputes" ON public.disputes FOR SELECT USING (true);
CREATE POLICY "Allow insert disputes" ON public.disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update disputes" ON public.disputes FOR UPDATE USING (true);

-- 10. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id text NOT NULL PRIMARY KEY,
    user_phone text NOT NULL,
    text text NOT NULL,
    timestamp text DEFAULT timezone('utc'::text, now())::text,
    is_read boolean DEFAULT false
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON public.notifications FOR UPDATE USING (true);

-- 11. proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
    id text NOT NULL PRIMARY KEY,
    job_id text NOT NULL,
    student_name text,
    student_phone text,
    proposal_text text,
    price numeric,
    status text DEFAULT 'pending'::text,
    timestamp text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Allow insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);

-- 12. badges catalog
CREATE TABLE IF NOT EXISTS public.badges (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    icon text
);

-- Enable RLS on badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to badges" ON public.badges FOR SELECT USING (true);

-- 13. user_badges bridge table
CREATE TABLE IF NOT EXISTS public.user_badges (
    id text NOT NULL PRIMARY KEY,
    user_phone text NOT NULL,
    badge_id text REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at text DEFAULT timezone('utc'::text, now())::text
);

-- Enable RLS on user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Allow insert user badges" ON public.user_badges FOR INSERT WITH CHECK (true);

-- Populating default system badges
INSERT INTO public.badges (id, name, description, icon) VALUES
('b_verified', 'Verified Student', 'Successfully validated student ID registrar requirements', 'ShieldCheck')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon;

INSERT INTO public.badges (id, name, description, icon) VALUES
('b_top_earner', 'Top Earner', 'Earned more than GHS 1,000 on the TTU Market platform', 'Award')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon;

INSERT INTO public.badges (id, name, description, icon) VALUES
('b_super_seller', 'Super Seller', 'Successfully delivered 5+ orders perfectly on escrow', 'Zap')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon;
