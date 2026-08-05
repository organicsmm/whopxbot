-- ============================================================
-- target-schema.sql  (auto-generated from live source catalogs)
-- Re-runnable: IF NOT EXISTS / DROP..IF EXISTS everywhere.
-- ============================================================
SET statement_timeout = 0;
SET check_function_bodies = off;

-- ---------- extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ---------- enum types ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- sequences ----------
CREATE SEQUENCE IF NOT EXISTS public.engagement_orders_order_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;

-- ---------- tables ----------
CREATE TABLE IF NOT EXISTS public.apify_call_log (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "username" text,
  "scrape_type" text,
  "source" text DEFAULT 'refresh'::text,
  "results_count" integer,
  "success" boolean DEFAULT true,
  "error_message" text,
  "duration_ms" integer,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "scrape_type" text;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'refresh'::text;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "results_count" integer;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "success" boolean DEFAULT true;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "duration_ms" integer;
ALTER TABLE public.apify_call_log ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.bundle_items (
  "id" uuid DEFAULT gen_random_uuid(),
  "bundle_id" uuid,
  "service_id" uuid,
  "engagement_type" text,
  "ratio_percent" numeric DEFAULT 100,
  "is_base" boolean DEFAULT false,
  "default_drip_qty_per_run" integer DEFAULT 500,
  "default_drip_interval" integer DEFAULT 1,
  "default_drip_interval_unit" text DEFAULT 'hours'::text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "price_per_k" numeric(12,4)
);
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "bundle_id" uuid;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "service_id" uuid;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "engagement_type" text;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "ratio_percent" numeric DEFAULT 100;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "is_base" boolean DEFAULT false;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "default_drip_qty_per_run" integer DEFAULT 500;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "default_drip_interval" integer DEFAULT 1;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "default_drip_interval_unit" text DEFAULT 'hours'::text;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.bundle_items ADD COLUMN IF NOT EXISTS "price_per_k" numeric(12,4);
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "user_email" text,
  "user_name" text,
  "status" text DEFAULT 'open'::text,
  "last_message_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "user_email" text;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "user_name" text;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open'::text;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "last_message_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.chat_messages (
  "id" uuid DEFAULT gen_random_uuid(),
  "conversation_id" uuid,
  "sender_id" uuid,
  "sender_role" text,
  "message" text,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "conversation_id" uuid;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "sender_id" uuid;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "sender_role" text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.deposits (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "amount" numeric,
  "currency" text DEFAULT 'USDT'::text,
  "payment_method" text DEFAULT 'usdt'::text,
  "proof_url" text,
  "status" text DEFAULT 'pending'::text,
  "admin_notes" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "amount" numeric;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USDT'::text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'usdt'::text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "proof_url" text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "admin_notes" text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.drip_feed_campaigns (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "name" text,
  "link" text,
  "service_id" uuid,
  "qty_per_run" integer,
  "interval_minutes" integer DEFAULT 60,
  "total_runs" integer,
  "runs_done" integer DEFAULT 0,
  "runs_failed" integer DEFAULT 0,
  "next_run_at" timestamp with time zone DEFAULT now(),
  "is_active" boolean DEFAULT true,
  "last_order_id" uuid,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "service_id" uuid;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "qty_per_run" integer;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "interval_minutes" integer DEFAULT 60;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "total_runs" integer;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "runs_done" integer DEFAULT 0;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "runs_failed" integer DEFAULT 0;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "next_run_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "last_order_id" uuid;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.drip_feed_campaigns ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.engagement_bundles (
  "id" uuid DEFAULT gen_random_uuid(),
  "name" text,
  "platform" text,
  "provider_id" text,
  "description" text,
  "icon" text DEFAULT 'rocket'::text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "use_custom_ratios" boolean DEFAULT false,
  "ai_organic_enabled" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "platform" text;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "icon" text DEFAULT 'rocket'::text;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "use_custom_ratios" boolean DEFAULT false;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "ai_organic_enabled" boolean DEFAULT true;
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_bundles ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.engagement_health_history (
  "id" uuid DEFAULT gen_random_uuid(),
  "engagement_order_id" uuid,
  "health_score" numeric DEFAULT 0,
  "botting_percent" numeric DEFAULT 0,
  "views_count" integer DEFAULT 0,
  "likes_count" integer DEFAULT 0,
  "comments_count" integer DEFAULT 0,
  "shares_count" integer DEFAULT 0,
  "saves_count" integer DEFAULT 0,
  "followers_count" integer DEFAULT 0,
  "ratios" jsonb,
  "warnings" jsonb,
  "recorded_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "engagement_order_id" uuid;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "health_score" numeric DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "botting_percent" numeric DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "views_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "likes_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "comments_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "shares_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "saves_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "followers_count" integer DEFAULT 0;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "ratios" jsonb;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "warnings" jsonb;
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "recorded_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_health_history ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.engagement_order_items (
  "id" uuid DEFAULT gen_random_uuid(),
  "engagement_order_id" uuid,
  "engagement_type" text,
  "service_id" uuid,
  "quantity" integer,
  "price" numeric,
  "drip_qty_per_run" integer,
  "drip_interval" integer,
  "drip_interval_unit" text DEFAULT 'hours'::text,
  "speed_preset" text DEFAULT 'natural'::text,
  "is_enabled" boolean DEFAULT true,
  "status" text DEFAULT 'pending'::text,
  "provider_order_id" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "auto_refill_enabled" boolean DEFAULT false,
  "auto_refill_threshold_pct" integer DEFAULT 10,
  "auto_refill_count" integer DEFAULT 0,
  "auto_refill_max" integer DEFAULT 3,
  "last_refill_at" timestamp with time zone
);
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "engagement_order_id" uuid;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "engagement_type" text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "service_id" uuid;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "price" numeric;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "drip_qty_per_run" integer;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "drip_interval" integer;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "drip_interval_unit" text DEFAULT 'hours'::text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "speed_preset" text DEFAULT 'natural'::text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT true;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "provider_order_id" text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "auto_refill_enabled" boolean DEFAULT false;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "auto_refill_threshold_pct" integer DEFAULT 10;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "auto_refill_count" integer DEFAULT 0;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "auto_refill_max" integer DEFAULT 3;
ALTER TABLE public.engagement_order_items ADD COLUMN IF NOT EXISTS "last_refill_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS public.engagement_orders (
  "id" uuid DEFAULT gen_random_uuid(),
  "order_number" integer DEFAULT nextval('engagement_orders_order_number_seq'::regclass),
  "user_id" uuid,
  "bundle_id" uuid,
  "link" text,
  "base_quantity" integer,
  "total_price" numeric,
  "is_organic_mode" boolean DEFAULT true,
  "variance_percent" integer DEFAULT 25,
  "peak_hours_enabled" boolean DEFAULT true,
  "status" text DEFAULT 'pending'::text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "completed_at" timestamp with time zone,
  "current_botting_percent" numeric DEFAULT 0,
  "current_health_score" numeric DEFAULT 100,
  "last_health_check_at" timestamp with time zone,
  "campaign_name" text
);
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "order_number" integer DEFAULT nextval('engagement_orders_order_number_seq'::regclass);
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "bundle_id" uuid;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "base_quantity" integer;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "total_price" numeric;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "is_organic_mode" boolean DEFAULT true;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "variance_percent" integer DEFAULT 25;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "peak_hours_enabled" boolean DEFAULT true;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "current_botting_percent" numeric DEFAULT 0;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "current_health_score" numeric DEFAULT 100;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "last_health_check_at" timestamp with time zone;
ALTER TABLE public.engagement_orders ADD COLUMN IF NOT EXISTS "campaign_name" text;
CREATE TABLE IF NOT EXISTS public.engagement_presets (
  "user_id" uuid,
  "views" integer DEFAULT 0,
  "likes" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "drip_minutes" integer DEFAULT 0,
  "mode" text DEFAULT 'manual'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "default_link" text,
  "saves" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "reposts" integer DEFAULT 0
);
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "likes" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "comments" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "drip_minutes" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "mode" text DEFAULT 'manual'::text;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "default_link" text;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "saves" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "shares" integer DEFAULT 0;
ALTER TABLE public.engagement_presets ADD COLUMN IF NOT EXISTS "reposts" integer DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "username" text,
  "ig_user_id" text,
  "full_name" text,
  "avatar_url" text,
  "followers" integer DEFAULT 0,
  "following" integer DEFAULT 0,
  "posts_count" integer DEFAULT 0,
  "is_private" boolean DEFAULT false,
  "is_verified" boolean DEFAULT false,
  "biography" text,
  "status" text DEFAULT 'active'::text,
  "auto_boost_enabled" boolean DEFAULT false,
  "default_bundle_id" uuid,
  "last_scraped_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "last_fetched_at" timestamp with time zone
);
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "ig_user_id" text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "followers" integer DEFAULT 0;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "following" integer DEFAULT 0;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "posts_count" integer DEFAULT 0;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "is_private" boolean DEFAULT false;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "biography" text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active'::text;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "auto_boost_enabled" boolean DEFAULT false;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "default_bundle_id" uuid;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "last_scraped_at" timestamp with time zone;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS "last_fetched_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS public.instagram_link_events (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "username" text,
  "event_type" text DEFAULT 'link'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.instagram_link_events ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.instagram_link_events ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.instagram_link_events ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE public.instagram_link_events ADD COLUMN IF NOT EXISTS "event_type" text DEFAULT 'link'::text;
ALTER TABLE public.instagram_link_events ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.instagram_media (
  "id" uuid DEFAULT gen_random_uuid(),
  "account_id" uuid,
  "user_id" uuid,
  "media_id" text,
  "shortcode" text,
  "media_type" text,
  "permalink" text,
  "thumbnail_url" text,
  "caption" text,
  "like_count" integer DEFAULT 0,
  "comment_count" integer DEFAULT 0,
  "view_count" integer DEFAULT 0,
  "posted_at" timestamp with time zone,
  "engagement_applied" boolean DEFAULT false,
  "detected_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "media_id" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "shortcode" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "media_type" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "permalink" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "caption" text;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "posted_at" timestamp with time zone;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "engagement_applied" boolean DEFAULT false;
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "detected_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.instagram_media ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.instagram_poll_state (
  "account_id" uuid,
  "last_seen_media_id" text,
  "last_polled_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.instagram_poll_state ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE public.instagram_poll_state ADD COLUMN IF NOT EXISTS "last_seen_media_id" text;
ALTER TABLE public.instagram_poll_state ADD COLUMN IF NOT EXISTS "last_polled_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.mass_order_batch_items (
  "id" uuid DEFAULT gen_random_uuid(),
  "batch_id" uuid,
  "user_id" uuid,
  "link" text,
  "status" text DEFAULT 'pending'::text,
  "error_message" text,
  "engagement_order_id" uuid,
  "engagement_order_number" bigint,
  "price" numeric DEFAULT 0,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "batch_id" uuid;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "engagement_order_id" uuid;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "engagement_order_number" bigint;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "price" numeric DEFAULT 0;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.mass_order_batch_items ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.mass_order_batches (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "name" text,
  "platform" text,
  "total_count" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "failed_count" integer DEFAULT 0,
  "status" text DEFAULT 'processing'::text,
  "total_price" numeric DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "platform" text;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "total_count" integer DEFAULT 0;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "success_count" integer DEFAULT 0;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "failed_count" integer DEFAULT 0;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'processing'::text;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "total_price" numeric DEFAULT 0;
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.mass_order_batches ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.orders (
  "id" uuid DEFAULT gen_random_uuid(),
  "order_number" integer DEFAULT nextval('orders_order_number_seq'::regclass),
  "user_id" uuid,
  "service_id" uuid,
  "link" text,
  "quantity" integer,
  "price" numeric,
  "status" text DEFAULT 'pending'::text,
  "start_count" integer,
  "remains" integer,
  "provider_order_id" text,
  "is_drip_feed" boolean DEFAULT false,
  "drip_runs" integer,
  "drip_interval" integer,
  "drip_interval_unit" text,
  "drip_quantity_per_run" integer,
  "is_organic_mode" boolean DEFAULT false,
  "variance_percent" integer DEFAULT 25,
  "peak_hours_enabled" boolean DEFAULT true,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "auto_refill_enabled" boolean DEFAULT false,
  "auto_refill_threshold_pct" integer DEFAULT 10,
  "auto_refill_count" integer DEFAULT 0,
  "auto_refill_max" integer DEFAULT 3,
  "last_refill_at" timestamp with time zone
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "order_number" integer DEFAULT nextval('orders_order_number_seq'::regclass);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "service_id" uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "link" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "quantity" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "price" numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "start_count" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "remains" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "provider_order_id" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "is_drip_feed" boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "drip_runs" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "drip_interval" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "drip_interval_unit" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "drip_quantity_per_run" integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "is_organic_mode" boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "variance_percent" integer DEFAULT 25;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "peak_hours_enabled" boolean DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "auto_refill_enabled" boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "auto_refill_threshold_pct" integer DEFAULT 10;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "auto_refill_count" integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "auto_refill_max" integer DEFAULT 3;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "last_refill_at" timestamp with time zone;
CREATE TABLE IF NOT EXISTS public.organic_run_schedule (
  "id" uuid DEFAULT gen_random_uuid(),
  "order_id" uuid,
  "run_number" integer,
  "scheduled_at" timestamp with time zone,
  "quantity_to_send" integer,
  "base_quantity" integer,
  "variance_applied" integer DEFAULT 0,
  "peak_multiplier" numeric DEFAULT 1.0,
  "status" text DEFAULT 'pending'::text,
  "provider_order_id" text,
  "provider_response" jsonb,
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "engagement_order_item_id" uuid,
  "provider_start_count" integer,
  "provider_remains" integer,
  "provider_status" text,
  "provider_charge" numeric,
  "last_status_check" timestamp with time zone,
  "retry_count" integer DEFAULT 0,
  "provider_account_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "provider_account_name" text
);
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "order_id" uuid;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "run_number" integer;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "quantity_to_send" integer;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "base_quantity" integer;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "variance_applied" integer DEFAULT 0;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "peak_multiplier" numeric DEFAULT 1.0;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_order_id" text;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_response" jsonb;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "engagement_order_item_id" uuid;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_start_count" integer;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_remains" integer;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_status" text;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_charge" numeric;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "last_status_check" timestamp with time zone;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_account_id" uuid;
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.organic_run_schedule ADD COLUMN IF NOT EXISTS "provider_account_name" text;
CREATE TABLE IF NOT EXISTS public.oxapay_activity_log (
  "id" uuid DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "source" text,
  "event" text,
  "order_id" text,
  "user_id" uuid,
  "plan_type" text,
  "purpose" text,
  "amount_usd" numeric,
  "provider_status" text,
  "http_status" integer,
  "ok" boolean DEFAULT true,
  "message" text,
  "payload" jsonb
);
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "event" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "plan_type" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "purpose" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "amount_usd" numeric;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "provider_status" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "http_status" integer;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "ok" boolean DEFAULT true;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE public.oxapay_activity_log ADD COLUMN IF NOT EXISTS "payload" jsonb;
CREATE TABLE IF NOT EXISTS public.oxapay_deposits (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "purpose" text DEFAULT 'wallet'::text,
  "plan_type" text,
  "track_id" text,
  "order_id" text,
  "pay_link" text,
  "amount_usd" numeric(12,4),
  "amount_inr" numeric(12,2),
  "status" text DEFAULT 'pending'::text,
  "credited" boolean DEFAULT false,
  "raw_response" jsonb,
  "webhook_payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "email" text
);
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "purpose" text DEFAULT 'wallet'::text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "plan_type" text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "track_id" text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "pay_link" text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "amount_usd" numeric(12,4);
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "amount_inr" numeric(12,2);
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "credited" boolean DEFAULT false;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "raw_response" jsonb;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "webhook_payload" jsonb;
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.oxapay_deposits ADD COLUMN IF NOT EXISTS "email" text;
CREATE TABLE IF NOT EXISTS public.platform_settings (
  "id" uuid DEFAULT gen_random_uuid(),
  "maintenance_mode" boolean DEFAULT false,
  "global_markup_percent" numeric DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS "maintenance_mode" boolean DEFAULT false;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS "global_markup_percent" numeric DEFAULT 0;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.profiles (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "email" text,
  "full_name" text,
  "api_key" text,
  "currency" text DEFAULT 'USD'::text,
  "telegram_chat_id" text,
  "telegram_notifications_enabled" boolean DEFAULT false,
  "organic_variance_percent" integer DEFAULT 25,
  "organic_peak_hours_enabled" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "avatar_url" text,
  "telegram_id" text,
  "telegram_username" text,
  "is_organic_mode_default" boolean DEFAULT true,
  "organic_ratios" jsonb,
  "referral_code" text,
  "referred_by" uuid,
  "referral_earnings" numeric DEFAULT 0
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "api_key" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD'::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "telegram_notifications_enabled" boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "organic_variance_percent" integer DEFAULT 25;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "organic_peak_hours_enabled" boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "telegram_id" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "telegram_username" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "is_organic_mode_default" boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "organic_ratios" jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "referral_code" text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "referred_by" uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "referral_earnings" numeric DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.promo_codes (
  "id" uuid DEFAULT gen_random_uuid(),
  "code" text,
  "description" text,
  "bonus_type" text DEFAULT 'percent'::text,
  "bonus_value" numeric,
  "min_deposit_usd" numeric DEFAULT 0,
  "max_uses" integer,
  "used_count" integer DEFAULT 0,
  "expires_at" timestamp with time zone,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "code" text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "bonus_type" text DEFAULT 'percent'::text;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "bonus_value" numeric;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "min_deposit_usd" numeric DEFAULT 0;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "max_uses" integer;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  "id" uuid DEFAULT gen_random_uuid(),
  "promo_code_id" uuid,
  "user_id" uuid,
  "bonus_amount_usd" numeric,
  "deposit_amount_usd" numeric,
  "redeemed_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "promo_code_id" uuid;
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "bonus_amount_usd" numeric;
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "deposit_amount_usd" numeric;
ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS "redeemed_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.provider_accounts (
  "id" uuid DEFAULT gen_random_uuid(),
  "provider_id" text,
  "name" text,
  "api_key" text,
  "api_url" text,
  "priority" integer DEFAULT 1,
  "is_active" boolean DEFAULT true,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "balance" numeric,
  "balance_currency" text,
  "balance_checked_at" timestamp with time zone,
  "low_balance_threshold" numeric DEFAULT 10,
  "last_low_balance_alert_at" timestamp with time zone,
  "last_balance_error" text,
  "delivery_multiplier" numeric DEFAULT 1.0
);
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "api_key" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "api_url" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 1;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "balance" numeric;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "balance_currency" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "balance_checked_at" timestamp with time zone;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "low_balance_threshold" numeric DEFAULT 10;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "last_low_balance_alert_at" timestamp with time zone;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "last_balance_error" text;
ALTER TABLE public.provider_accounts ADD COLUMN IF NOT EXISTS "delivery_multiplier" numeric DEFAULT 1.0;
CREATE TABLE IF NOT EXISTS public.provider_balance_history (
  "id" uuid DEFAULT gen_random_uuid(),
  "provider_account_id" uuid,
  "balance" numeric,
  "balance_currency" text,
  "previous_balance" numeric,
  "delta" numeric,
  "status" text DEFAULT 'ok'::text,
  "error_message" text,
  "source" text DEFAULT 'auto'::text,
  "checked_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "provider_account_id" uuid;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "balance" numeric;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "balance_currency" text;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "previous_balance" numeric;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "delta" numeric;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ok'::text;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "error_message" text;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'auto'::text;
ALTER TABLE public.provider_balance_history ADD COLUMN IF NOT EXISTS "checked_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.providers (
  "id" text,
  "name" text,
  "api_url" text,
  "api_key" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "id" text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "api_url" text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "api_key" text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  "id" uuid DEFAULT gen_random_uuid(),
  "event_id" text,
  "event_type" text,
  "payment_id" text,
  "payload" jsonb,
  "processed_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "event_id" text;
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "payment_id" text;
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE public.razorpay_webhook_events ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  "id" uuid DEFAULT gen_random_uuid(),
  "category" text,
  "source" text,
  "reason" text,
  "provider" text,
  "order_id" text,
  "track_id" text,
  "user_id" uuid,
  "http_status" integer,
  "ip" text,
  "user_agent" text,
  "request_path" text,
  "payload" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "track_id" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "http_status" integer;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "ip" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "request_path" text;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "metadata" jsonb;
ALTER TABLE public.security_audit_log ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.service_provider_mapping (
  "id" uuid DEFAULT gen_random_uuid(),
  "service_id" uuid,
  "provider_account_id" uuid,
  "provider_service_id" text,
  "sort_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "backup_provider_account_id" uuid,
  "backup_provider_service_id" text
);
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "service_id" uuid;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "provider_account_id" uuid;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "provider_service_id" text;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "backup_provider_account_id" uuid;
ALTER TABLE public.service_provider_mapping ADD COLUMN IF NOT EXISTS "backup_provider_service_id" text;
CREATE TABLE IF NOT EXISTS public.services (
  "id" uuid DEFAULT gen_random_uuid(),
  "provider_id" text,
  "provider_service_id" text,
  "name" text,
  "category" text,
  "description" text,
  "price" numeric DEFAULT 0,
  "min_quantity" integer DEFAULT 10,
  "max_quantity" integer DEFAULT 100000,
  "speed" text DEFAULT 'medium'::text,
  "quality" text DEFAULT 'standard'::text,
  "drip_feed_enabled" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "start_time" text,
  "refill" text,
  "cancel_allowed" text,
  "drop_type" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "provider_service_id" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "price" numeric DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "min_quantity" integer DEFAULT 10;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "max_quantity" integer DEFAULT 100000;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "speed" text DEFAULT 'medium'::text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "quality" text DEFAULT 'standard'::text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "drip_feed_enabled" boolean DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "start_time" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "refill" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "cancel_allowed" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "drop_type" text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "full_name" text,
  "email" text,
  "phone" text,
  "plan_type" text,
  "message" text,
  "status" text DEFAULT 'pending'::text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "admin_notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "plan_type" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "admin_notes" text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.subscriptions (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "plan_type" text DEFAULT 'none'::text,
  "status" text DEFAULT 'inactive'::text,
  "activated_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "activated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "plan_type" text DEFAULT 'none'::text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'inactive'::text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "activated_at" timestamp with time zone;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "activated_by" uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.support_tickets (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "subject" text,
  "message" text,
  "category" text DEFAULT 'other'::text,
  "priority" text DEFAULT 'medium'::text,
  "status" text DEFAULT 'open'::text,
  "order_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "subject" text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'other'::text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'medium'::text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open'::text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "order_id" uuid;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.telegram_engagement_links (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "telegram_chat_id" bigint,
  "telegram_username" text,
  "link_code" text,
  "code_expires_at" timestamp with time zone,
  "status" text DEFAULT 'pending'::text,
  "linked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "telegram_chat_id" bigint;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "telegram_username" text;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "link_code" text;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "code_expires_at" timestamp with time zone;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "linked_at" timestamp with time zone;
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.telegram_engagement_links ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.transactions (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "type" text,
  "amount" numeric,
  "balance_after" numeric,
  "order_id" uuid,
  "description" text,
  "payment_method" text,
  "payment_reference" text,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "amount" numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "balance_after" numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "order_id" uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "payment_reference" text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.user_roles (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "role" app_role DEFAULT 'user'::app_role,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS "role" app_role DEFAULT 'user'::app_role;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.wallets (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "balance" numeric DEFAULT 0,
  "total_deposited" numeric DEFAULT 0,
  "total_spent" numeric DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "balance" numeric DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "total_deposited" numeric DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "total_spent" numeric DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.webhook_events (
  "id" uuid DEFAULT gen_random_uuid(),
  "provider" text,
  "order_id" text,
  "track_id" text,
  "payload_hash" text,
  "event_status" text,
  "outcome" text DEFAULT 'received'::text,
  "http_status" integer,
  "message" text,
  "payload" jsonb,
  "first_seen_at" timestamp with time zone DEFAULT now(),
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "provider" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "track_id" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "payload_hash" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "event_status" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "outcome" text DEFAULT 'received'::text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "http_status" integer;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "payload" jsonb;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "first_seen_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
CREATE TABLE IF NOT EXISTS public.zapupi_deposits (
  "id" uuid DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "order_id" text,
  "amount_inr" numeric,
  "amount_usd" numeric,
  "status" text DEFAULT 'pending'::text,
  "credited" boolean DEFAULT false,
  "txn_id" text,
  "utr" text,
  "payment_url" text,
  "raw_response" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "order_id" text;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "amount_inr" numeric;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "amount_usd" numeric;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending'::text;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "credited" boolean DEFAULT false;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "txn_id" text;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "utr" text;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "payment_url" text;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "raw_response" jsonb;
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
ALTER TABLE public.zapupi_deposits ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- ---------- constraints (pk / unique / check / fk) ----------
DO $$ BEGIN
  ALTER TABLE public.apify_call_log ADD CONSTRAINT apify_call_log_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.bundle_items ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.deposits ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.drip_feed_campaigns ADD CONSTRAINT drip_feed_campaigns_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_bundles ADD CONSTRAINT engagement_bundles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_health_history ADD CONSTRAINT engagement_health_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_order_items ADD CONSTRAINT engagement_order_items_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_orders ADD CONSTRAINT engagement_orders_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_presets ADD CONSTRAINT engagement_presets_pkey PRIMARY KEY (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_accounts ADD CONSTRAINT instagram_accounts_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_link_events ADD CONSTRAINT instagram_link_events_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_media ADD CONSTRAINT instagram_media_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_poll_state ADD CONSTRAINT instagram_poll_state_pkey PRIMARY KEY (account_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mass_order_batch_items ADD CONSTRAINT mass_order_batch_items_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mass_order_batches ADD CONSTRAINT mass_order_batches_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.organic_run_schedule ADD CONSTRAINT organic_run_schedule_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.oxapay_activity_log ADD CONSTRAINT oxapay_activity_log_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.oxapay_deposits ADD CONSTRAINT oxapay_deposits_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.provider_accounts ADD CONSTRAINT provider_accounts_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.provider_balance_history ADD CONSTRAINT provider_balance_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.providers ADD CONSTRAINT providers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.razorpay_webhook_events ADD CONSTRAINT razorpay_webhook_events_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.service_provider_mapping ADD CONSTRAINT service_provider_mapping_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_requests ADD CONSTRAINT subscription_requests_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.telegram_engagement_links ADD CONSTRAINT telegram_engagement_links_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.wallets ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.zapupi_deposits ADD CONSTRAINT zapupi_deposits_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_accounts ADD CONSTRAINT instagram_accounts_user_id_username_key UNIQUE (user_id, username);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_media ADD CONSTRAINT instagram_media_account_id_media_id_key UNIQUE (account_id, media_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.oxapay_deposits ADD CONSTRAINT oxapay_deposits_order_id_key UNIQUE (order_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.oxapay_deposits ADD CONSTRAINT oxapay_deposits_track_id_key UNIQUE (track_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_code_key UNIQUE (code);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_promo_code_id_user_id_key UNIQUE (promo_code_id, user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.razorpay_webhook_events ADD CONSTRAINT razorpay_webhook_events_event_id_key UNIQUE (event_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.service_provider_mapping ADD CONSTRAINT service_provider_mapping_service_id_provider_account_id_key UNIQUE (service_id, provider_account_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.telegram_engagement_links ADD CONSTRAINT telegram_engagement_links_link_code_key UNIQUE (link_code);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.telegram_engagement_links ADD CONSTRAINT telegram_engagement_links_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.zapupi_deposits ADD CONSTRAINT zapupi_deposits_order_id_key UNIQUE (order_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['user'::text, 'admin'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.deposits ADD CONSTRAINT deposits_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_presets ADD CONSTRAINT engagement_presets_mode_check CHECK ((mode = ANY (ARRAY['auto'::text, 'manual'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_link_events ADD CONSTRAINT instagram_link_events_event_type_check CHECK ((event_type = ANY (ARRAY['link'::text, 'cache_hit'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_requests ADD CONSTRAINT subscription_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_requests ADD CONSTRAINT subscription_requests_plan_type_check CHECK ((plan_type = ANY (ARRAY['monthly'::text, 'lifetime'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['inactive'::text, 'active'::text, 'expired'::text, 'cancelled'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check CHECK ((plan_type = ANY (ARRAY['none'::text, 'monthly'::text, 'lifetime'::text])));
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.apify_call_log ADD CONSTRAINT apify_call_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.bundle_items ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES engagement_bundles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.bundle_items ADD CONSTRAINT bundle_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.deposits ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.drip_feed_campaigns ADD CONSTRAINT drip_feed_campaigns_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_bundles ADD CONSTRAINT engagement_bundles_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES providers(id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_health_history ADD CONSTRAINT engagement_health_history_engagement_order_id_fkey FOREIGN KEY (engagement_order_id) REFERENCES engagement_orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_order_items ADD CONSTRAINT engagement_order_items_engagement_order_id_fkey FOREIGN KEY (engagement_order_id) REFERENCES engagement_orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_order_items ADD CONSTRAINT engagement_order_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_orders ADD CONSTRAINT engagement_orders_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES engagement_bundles(id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.engagement_presets ADD CONSTRAINT engagement_presets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_accounts ADD CONSTRAINT instagram_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_accounts ADD CONSTRAINT instagram_accounts_default_bundle_id_fkey FOREIGN KEY (default_bundle_id) REFERENCES engagement_bundles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_media ADD CONSTRAINT instagram_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_media ADD CONSTRAINT instagram_media_account_id_fkey FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.instagram_poll_state ADD CONSTRAINT instagram_poll_state_account_id_fkey FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mass_order_batch_items ADD CONSTRAINT mass_order_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES mass_order_batches(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mass_order_batch_items ADD CONSTRAINT mass_order_batch_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.mass_order_batches ADD CONSTRAINT mass_order_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.organic_run_schedule ADD CONSTRAINT organic_run_schedule_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.organic_run_schedule ADD CONSTRAINT organic_run_schedule_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.organic_run_schedule ADD CONSTRAINT organic_run_schedule_engagement_order_item_id_fkey FOREIGN KEY (engagement_order_item_id) REFERENCES engagement_order_items(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.provider_balance_history ADD CONSTRAINT provider_balance_history_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.service_provider_mapping ADD CONSTRAINT service_provider_mapping_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.service_provider_mapping ADD CONSTRAINT service_provider_mapping_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.service_provider_mapping ADD CONSTRAINT service_provider_mapping_backup_provider_account_id_fkey FOREIGN KEY (backup_provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.services ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.telegram_engagement_links ADD CONSTRAINT telegram_engagement_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.zapupi_deposits ADD CONSTRAINT zapupi_deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL; END $$;

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS apify_call_log_user_idx ON public.apify_call_log USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS apify_call_log_username_idx ON public.apify_call_log USING btree (lower(username), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON public.deposits USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_drip_due ON public.drip_feed_campaigns USING btree (next_run_at) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_drip_user ON public.drip_feed_campaigns USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eng_health_recent ON public.engagement_health_history USING btree (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_health_history_order ON public.engagement_health_history USING btree (engagement_order_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_order_id ON public.engagement_order_items USING btree (engagement_order_id);
CREATE INDEX IF NOT EXISTS idx_engagement_order_items_status ON public.engagement_order_items USING btree (status);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_active ON public.engagement_orders USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));
CREATE INDEX IF NOT EXISTS idx_engagement_orders_link ON public.engagement_orders USING btree (link text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_status ON public.engagement_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_engagement_orders_user_id_created ON public.engagement_orders USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eoi_order_status ON public.engagement_order_items USING btree (engagement_order_id, status);
CREATE INDEX IF NOT EXISTS idx_ig_link_events_user_time ON public.instagram_link_events USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_media_account_posted ON public.instagram_media USING btree (account_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_media_user_posted ON public.instagram_media USING btree (user_id, posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ig_media_user_shortcode ON public.instagram_media USING btree (user_id, shortcode);
CREATE INDEX IF NOT EXISTS idx_mass_order_batch_items_batch ON public.mass_order_batch_items USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_mass_order_batch_items_user ON public.mass_order_batch_items USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_mass_order_batches_user ON public.mass_order_batches USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_link ON public.orders USING btree (link text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_orders_organic_status ON public.orders USING btree (status, is_organic_mode) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON public.orders USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_item_id ON public.organic_run_schedule USING btree (engagement_order_item_id) WHERE (engagement_order_item_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_check ON public.organic_run_schedule USING btree (status, last_status_check);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_failed ON public.organic_run_schedule USING btree (status, retry_count) WHERE (status = 'failed'::text);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_scheduled ON public.organic_run_schedule USING btree (status, scheduled_at) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_started ON public.organic_run_schedule USING btree (status) WHERE (status = 'started'::text);
CREATE INDEX IF NOT EXISTS idx_organic_runs_item_id ON public.organic_run_schedule USING btree (engagement_order_item_id);
CREATE INDEX IF NOT EXISTS idx_organic_runs_order_id ON public.organic_run_schedule USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_organic_runs_started ON public.organic_run_schedule USING btree (status, provider_order_id) WHERE (status = 'started'::text);
CREATE INDEX IF NOT EXISTS idx_organic_runs_status_scheduled ON public.organic_run_schedule USING btree (status, scheduled_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));
CREATE INDEX IF NOT EXISTS idx_orschd_pending_due_engagement ON public.organic_run_schedule USING btree (scheduled_at, last_status_check NULLS FIRST) WHERE ((status = 'pending'::text) AND (engagement_order_item_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_orschd_pending_scheduled ON public.organic_run_schedule USING btree (scheduled_at) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_orschd_processing_completed ON public.organic_run_schedule USING btree (completed_at) WHERE ((status = 'processing'::text) AND (engagement_order_item_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_orschd_processing_lastcheck ON public.organic_run_schedule USING btree (last_status_check) WHERE (status = 'processing'::text);
CREATE INDEX IF NOT EXISTS idx_orschd_processing_provider ON public.organic_run_schedule USING btree (provider_status, last_status_check) WHERE ((status = 'processing'::text) AND (provider_order_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_orschd_processing_retry ON public.organic_run_schedule USING btree (retry_count, completed_at) WHERE ((status = 'processing'::text) AND (engagement_order_item_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_orschd_processing_started ON public.organic_run_schedule USING btree (started_at NULLS FIRST) WHERE (status = 'processing'::text);
CREATE INDEX IF NOT EXISTS idx_oxapay_activity_log_created_at ON public.oxapay_activity_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oxapay_activity_log_ok ON public.oxapay_activity_log USING btree (ok);
CREATE INDEX IF NOT EXISTS idx_oxapay_activity_log_order_id ON public.oxapay_activity_log USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_oxapay_deposits_status ON public.oxapay_deposits USING btree (status);
CREATE INDEX IF NOT EXISTS idx_oxapay_deposits_track ON public.oxapay_deposits USING btree (track_id);
CREATE INDEX IF NOT EXISTS idx_oxapay_deposits_user ON public.oxapay_deposits USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_pbh_account_time ON public.provider_balance_history USING btree (provider_account_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pbh_time ON public.provider_balance_history USING btree (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code_upper ON public.profiles USING btree (upper(referral_code)) WHERE (referral_code IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_rzp_webhook_events_payment ON public.razorpay_webhook_events USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services USING btree (is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_spm_service_active ON public.service_provider_mapping USING btree (service_id, is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tg_eng_chat ON public.telegram_engagement_links USING btree (telegram_chat_id) WHERE (status = 'linked'::text);
CREATE INDEX IF NOT EXISTS idx_tg_eng_user ON public.telegram_engagement_links USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions USING btree (order_id) WHERE (order_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_razorpay_auto_reference_uniq ON public.transactions USING btree (payment_reference) WHERE ((payment_method = 'razorpay_auto'::text) AND (payment_reference IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_created ON public.transactions USING btree (user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_zapupi_deposits_order ON public.zapupi_deposits USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_zapupi_deposits_user_created ON public.zapupi_deposits USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS instagram_accounts_last_fetched_at_idx ON public.instagram_accounts USING btree (last_fetched_at);
CREATE INDEX IF NOT EXISTS oxapay_deposits_email_idx ON public.oxapay_deposits USING btree (lower(email));
CREATE INDEX IF NOT EXISTS security_audit_log_category_idx ON public.security_audit_log USING btree (category, created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_created_at_idx ON public.security_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_provider_idx ON public.security_audit_log USING btree (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_user_idx ON public.security_audit_log USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS webhook_events_first_seen_idx ON public.webhook_events USING btree (first_seen_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_order_hash_uniq ON public.webhook_events USING btree (provider, order_id, payload_hash);
CREATE INDEX IF NOT EXISTS webhook_events_provider_order_idx ON public.webhook_events USING btree (provider, order_id);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_track_status_uniq ON public.webhook_events USING btree (provider, track_id, event_status) WHERE (track_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS zapupi_deposits_pending_idx ON public.zapupi_deposits USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS zapupi_deposits_user_idx ON public.zapupi_deposits USING btree (user_id, created_at DESC);

-- ---------- functions ----------
CREATE OR REPLACE FUNCTION public.activate_subscription_oxapay(p_user_id uuid, p_order_id text, p_plan text, p_amount_usd numeric, p_track_id text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_lock_key BIGINT;\n  v_dep public.oxapay_deposits%ROWTYPE;\n  v_expires TIMESTAMPTZ;\nBEGIN\n  IF auth.uid() IS NOT NULL THEN\n    RAISE EXCEPTION 'Not permitted';\n  END IF;\n\n  IF p_user_id IS NULL OR p_order_id IS NULL OR p_plan IS NULL THEN\n    RAISE EXCEPTION 'missing required inputs';\n  END IF;\n  IF p_plan NOT IN ('monthly','yearly','lifetime') THEN\n    RAISE EXCEPTION 'invalid plan %', p_plan;\n  END IF;\n\n  v_lock_key := abs(hashtextextended('oxapay-sub:' || p_order_id, 0));\n  PERFORM pg_advisory_xact_lock(v_lock_key);\n\n  SELECT * INTO v_dep FROM public.oxapay_deposits\n    WHERE order_id = p_order_id FOR UPDATE;\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'deposit not found for order %', p_order_id;\n  END IF;\n  IF v_dep.credited THEN\n    RETURN json_build_object('activated', false, 'duplicate', true);\n  END IF;\n  IF v_dep.user_id IS DISTINCT FROM p_user_id THEN\n    RAISE EXCEPTION 'user mismatch for order %', p_order_id;\n  END IF;\n\n  v_expires := CASE p_plan\n    WHEN 'monthly'  THEN now() + interval '30 days'\n    WHEN 'yearly'   THEN now() + interval '365 days'\n    WHEN 'lifetime' THEN now() + interval '100 years'\n  END;\n\n  INSERT INTO public.subscriptions (user_id, plan_type, status, expires_at, activated_at)\n  VALUES (p_user_id, p_plan, 'active', v_expires, now())\n  ON CONFLICT (user_id) DO UPDATE\n    SET plan_type = EXCLUDED.plan_type,\n        status = 'active',\n        expires_at = EXCLUDED.expires_at,\n        activated_at = now(),\n        updated_at = now();\n\n  INSERT INTO public.transactions (\n    user_id, type, amount, balance_after, status,\n    payment_method, payment_reference, description\n  )\n  SELECT p_user_id, 'subscription', -p_amount_usd,\n         COALESCE((SELECT balance FROM public.wallets WHERE user_id = p_user_id), 0),\n         'completed', 'oxapay', p_order_id,\n         'Subscription payment (' || p_plan || ') via OxaPay';\n\n  UPDATE public.oxapay_deposits\n    SET credited = true, status = 'credited',\n        track_id = COALESCE(p_track_id, track_id),\n        plan_type = p_plan\n    WHERE order_id = p_order_id;\n\n  RETURN json_build_object('activated', true, 'plan', p_plan, 'expires_at', v_expires);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(p_referee uuid, p_deposit_usd numeric)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_referrer uuid;\n  v_prev_deposits numeric;\n  v_bonus numeric;\n  v_balance numeric;\n  v_new_balance numeric;\nBEGIN\n  IF p_referee IS NULL OR p_deposit_usd IS NULL OR p_deposit_usd <= 0 THEN\n    RETURN json_build_object('success', false, 'reason', 'invalid_input');\n  END IF;\n\n  SELECT referred_by INTO v_referrer FROM public.profiles WHERE user_id = p_referee;\n  IF v_referrer IS NULL THEN\n    RETURN json_build_object('success', false, 'reason', 'no_referrer');\n  END IF;\n\n  -- Only first deposit qualifies\n  SELECT COALESCE(SUM(amount), 0) INTO v_prev_deposits\n    FROM public.transactions\n   WHERE user_id = p_referee AND type = 'deposit' AND status = 'completed'\n     AND payment_method <> 'promo';\n  IF v_prev_deposits > p_deposit_usd THEN\n    RETURN json_build_object('success', false, 'reason', 'not_first_deposit');\n  END IF;\n\n  v_bonus := trunc(p_deposit_usd * 0.10, 4);\n  IF v_bonus <= 0 THEN\n    RETURN json_build_object('success', false, 'reason', 'zero_bonus');\n  END IF;\n\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n  VALUES (v_referrer, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_referrer FOR UPDATE;\n  v_new_balance := trunc(COALESCE(v_balance, 0) + v_bonus, 4);\n  UPDATE public.wallets SET balance = v_new_balance WHERE user_id = v_referrer;\n\n  UPDATE public.profiles\n     SET referral_earnings = COALESCE(referral_earnings, 0) + v_bonus\n   WHERE user_id = v_referrer;\n\n  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method, description)\n  VALUES (v_referrer, 'deposit', v_bonus, v_new_balance, 'completed', 'referral',\n          'Referral bonus (10%) from new user deposit');\n\n  RETURN json_build_object('success', true, 'bonus_usd', v_bonus, 'referrer', v_referrer);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.cleanup_old_completed_engagement_orders()\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  deleted_runs INT := 0;\n  deleted_items INT := 0;\n  deleted_orders INT := 0;\n  deleted_stale_runs INT := 0;\nBEGIN\n  WITH target_orders AS (\n    SELECT id FROM public.engagement_orders\n    WHERE status IN ('completed','cancelled','failed','partial')\n  ),\n  target_items AS (\n    SELECT eoi.id FROM public.engagement_order_items eoi\n    JOIN target_orders t ON t.id = eoi.engagement_order_id\n  ),\n  del_runs AS (\n    DELETE FROM public.organic_run_schedule\n    WHERE engagement_order_item_id IN (SELECT id FROM target_items)\n    RETURNING 1\n  )\n  SELECT count(*) INTO deleted_runs FROM del_runs;\n\n  WITH target_orders AS (\n    SELECT id FROM public.engagement_orders\n    WHERE status IN ('completed','cancelled','failed','partial')\n  ),\n  del_items AS (\n    DELETE FROM public.engagement_order_items\n    WHERE engagement_order_id IN (SELECT id FROM target_orders)\n    RETURNING 1\n  )\n  SELECT count(*) INTO deleted_items FROM del_items;\n\n  WITH del_orders AS (\n    DELETE FROM public.engagement_orders\n    WHERE status IN ('completed','cancelled','failed','partial')\n    RETURNING 1\n  )\n  SELECT count(*) INTO deleted_orders FROM del_orders;\n\n  WITH del_stale AS (\n    DELETE FROM public.organic_run_schedule rs\n    WHERE rs.status = 'pending'\n      AND rs.engagement_order_item_id IS NOT NULL\n      AND EXISTS (\n        SELECT 1\n        FROM public.engagement_order_items eoi\n        JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id\n        WHERE eoi.id = rs.engagement_order_item_id\n          AND (eoi.status IN ('paused','cancelled') OR eo.status IN ('paused','cancelled'))\n      )\n    RETURNING 1\n  )\n  SELECT count(*) INTO deleted_stale_runs FROM del_stale;\n\n  RETURN json_build_object(\n    'deleted_runs', deleted_runs,\n    'deleted_items', deleted_items,\n    'deleted_orders', deleted_orders,\n    'deleted_stale_runs', deleted_stale_runs,\n    'ran_at', now()\n  );\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.create_user_subscription()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  INSERT INTO public.subscriptions (user_id, plan_type, status)\n  VALUES (NEW.id, 'none', 'inactive')\n  ON CONFLICT (user_id) DO NOTHING;\n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.credit_wallet_oxapay(p_user_id uuid, p_order_id text, p_amount_usd numeric, p_track_id text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_lock_key BIGINT;\n  v_dep public.oxapay_deposits%ROWTYPE;\n  v_balance NUMERIC;\n  v_deposited NUMERIC;\n  v_new_balance NUMERIC;\n  v_credit_usd NUMERIC;\nBEGIN\n  IF auth.uid() IS NOT NULL THEN\n    RAISE EXCEPTION 'Not permitted';\n  END IF;\n\n  IF p_user_id IS NULL OR p_order_id IS NULL THEN\n    RAISE EXCEPTION 'user_id and order_id required';\n  END IF;\n  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN\n    RAISE EXCEPTION 'amount_usd must be > 0';\n  END IF;\n\n  v_credit_usd := trunc(p_amount_usd::numeric, 4);\n  v_lock_key := abs(hashtextextended('oxapay:' || p_order_id, 0));\n  PERFORM pg_advisory_xact_lock(v_lock_key);\n\n  SELECT * INTO v_dep FROM public.oxapay_deposits\n    WHERE order_id = p_order_id FOR UPDATE;\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'deposit not found for order %', p_order_id;\n  END IF;\n  IF v_dep.user_id IS DISTINCT FROM p_user_id THEN\n    RAISE EXCEPTION 'user mismatch for order %', p_order_id;\n  END IF;\n\n  IF v_dep.credited THEN\n    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;\n    RETURN json_build_object('credited', false, 'duplicate', true, 'new_balance', COALESCE(v_balance, 0));\n  END IF;\n\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n    VALUES (p_user_id, 0, 0, 0)\n    ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance, total_deposited INTO v_balance, v_deposited\n    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;\n\n  v_new_balance := trunc(COALESCE(v_balance, 0) + v_credit_usd, 4);\n\n  UPDATE public.wallets\n    SET balance = v_new_balance,\n        total_deposited = trunc(COALESCE(v_deposited, 0) + v_credit_usd, 4)\n    WHERE user_id = p_user_id;\n\n  INSERT INTO public.transactions (\n    user_id, type, amount, balance_after, status,\n    payment_method, payment_reference, description\n  ) VALUES (\n    p_user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',\n    'oxapay', p_order_id,\n    'Wallet top-up via OxaPay (crypto)'\n  );\n\n  UPDATE public.oxapay_deposits\n    SET credited = true, status = 'credited',\n        track_id = COALESCE(p_track_id, track_id)\n    WHERE order_id = p_order_id;\n\n  RETURN json_build_object('credited', true, 'duplicate', false, 'new_balance', v_new_balance, 'credited_usd', v_credit_usd);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.credit_wallet_razorpay(p_user_id uuid, p_payment_id text, p_amount_usd numeric, p_amount_inr numeric)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_lock_key bigint;\n  v_existing uuid;\n  v_balance numeric;\n  v_deposited numeric;\n  v_new_balance numeric;\n  v_new_deposited numeric;\n  v_inserted_id uuid;\n  v_credit_usd numeric;\n  v_amount_inr numeric;\n  v_rate numeric := 83.5;\nBEGIN\n  IF p_user_id IS NULL THEN\n    RAISE EXCEPTION 'user_id required';\n  END IF;\n\n  IF COALESCE(btrim(p_payment_id), '') = '' THEN\n    RAISE EXCEPTION 'payment_id required';\n  END IF;\n\n  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN\n    RAISE EXCEPTION 'amount_inr must be greater than zero';\n  END IF;\n\n  -- Ignore caller-provided USD and derive the wallet credit only from the real paid INR amount.\n  -- trunc() is intentional so the system can never over-credit beyond the paid amount.\n  v_amount_inr := trunc(p_amount_inr::numeric, 2);\n  v_credit_usd := trunc((v_amount_inr / v_rate)::numeric, 4);\n\n  IF v_credit_usd <= 0 THEN\n    RAISE EXCEPTION 'computed credit amount invalid';\n  END IF;\n\n  v_lock_key := abs(hashtextextended(p_payment_id, 0));\n  PERFORM pg_advisory_xact_lock(v_lock_key);\n\n  SELECT id INTO v_existing\n  FROM public.transactions\n  WHERE payment_method = 'razorpay_auto'\n    AND payment_reference = p_payment_id\n  LIMIT 1;\n\n  IF v_existing IS NOT NULL THEN\n    SELECT balance INTO v_balance\n    FROM public.wallets\n    WHERE user_id = p_user_id;\n\n    RETURN json_build_object(\n      'credited', false,\n      'duplicate', true,\n      'new_balance', COALESCE(v_balance, 0),\n      'credited_usd', v_credit_usd,\n      'credited_inr', v_amount_inr\n    );\n  END IF;\n\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n  VALUES (p_user_id, 0, 0, 0)\n  ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance, total_deposited INTO v_balance, v_deposited\n  FROM public.wallets\n  WHERE user_id = p_user_id\n  FOR UPDATE;\n\n  v_new_balance := trunc(COALESCE(v_balance, 0) + v_credit_usd, 4);\n  v_new_deposited := trunc(COALESCE(v_deposited, 0) + v_credit_usd, 4);\n\n  INSERT INTO public.transactions (\n    user_id, type, amount, balance_after, status,\n    payment_method, payment_reference, description\n  ) VALUES (\n    p_user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',\n    'razorpay_auto', p_payment_id,\n    'Wallet top-up via Razorpay (₹' || trim(to_char(v_amount_inr, 'FM9999999990D00')) || ' exact credit)'\n  )\n  ON CONFLICT DO NOTHING\n  RETURNING id INTO v_inserted_id;\n\n  IF v_inserted_id IS NULL THEN\n    RETURN json_build_object(\n      'credited', false,\n      'duplicate', true,\n      'new_balance', COALESCE(v_balance, 0),\n      'credited_usd', v_credit_usd,\n      'credited_inr', v_amount_inr\n    );\n  END IF;\n\n  UPDATE public.wallets\n  SET balance = v_new_balance,\n      total_deposited = v_new_deposited\n  WHERE user_id = p_user_id;\n\n  RETURN json_build_object(\n    'credited', true,\n    'duplicate', false,\n    'new_balance', v_new_balance,\n    'credited_usd', v_credit_usd,\n    'credited_inr', v_amount_inr\n  );\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.credit_wallet_zapupi(p_user_id uuid, p_order_id text, p_amount_usd numeric, p_amount_inr numeric, p_txn_id text, p_utr text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_lock_key bigint;\n  v_dep public.zapupi_deposits%ROWTYPE;\n  v_balance numeric;\n  v_deposited numeric;\n  v_new_balance numeric;\n  v_credit_usd numeric;\n  v_amount_inr numeric;\n  v_rate numeric := 83.5;\nBEGIN\n  IF p_user_id IS NULL OR p_order_id IS NULL THEN\n    RAISE EXCEPTION 'user_id and order_id required';\n  END IF;\n  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN\n    RAISE EXCEPTION 'amount_inr must be > 0';\n  END IF;\n\n  v_amount_inr := trunc(p_amount_inr::numeric, 2);\n  v_credit_usd := COALESCE(\n    NULLIF(trunc(p_amount_usd::numeric, 4), 0),\n    trunc((v_amount_inr / v_rate)::numeric, 4)\n  );\n  IF v_credit_usd <= 0 THEN\n    RAISE EXCEPTION 'invalid credit amount';\n  END IF;\n\n  v_lock_key := abs(hashtextextended(p_order_id, 0));\n  PERFORM pg_advisory_xact_lock(v_lock_key);\n\n  SELECT * INTO v_dep FROM public.zapupi_deposits\n    WHERE order_id = p_order_id FOR UPDATE;\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'deposit not found for order %', p_order_id;\n  END IF;\n\n  IF v_dep.credited THEN\n    SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;\n    RETURN json_build_object(\n      'credited', false,\n      'duplicate', true,\n      'new_balance', COALESCE(v_balance, 0)\n    );\n  END IF;\n\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n    VALUES (p_user_id, 0, 0, 0)\n    ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance, total_deposited INTO v_balance, v_deposited\n    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;\n\n  v_new_balance := trunc(COALESCE(v_balance, 0) + v_credit_usd, 4);\n\n  UPDATE public.wallets\n    SET balance = v_new_balance,\n        total_deposited = trunc(COALESCE(v_deposited, 0) + v_credit_usd, 4)\n    WHERE user_id = p_user_id;\n\n  INSERT INTO public.transactions (\n    user_id, type, amount, balance_after, status,\n    payment_method, payment_reference, description\n  ) VALUES (\n    p_user_id, 'deposit', v_credit_usd, v_new_balance, 'completed',\n    'zapupi', p_order_id,\n    'Wallet top-up via ZapUPI (INR ' || trim(to_char(v_amount_inr, 'FM9999999990D00')) || ')'\n  );\n\n  UPDATE public.zapupi_deposits\n    SET credited = true,\n        status = 'success',\n        txn_id = COALESCE(p_txn_id, txn_id),\n        utr = COALESCE(p_utr, utr),\n        amount_usd = v_credit_usd\n    WHERE order_id = p_order_id;\n\n  RETURN json_build_object(\n    'credited', true,\n    'duplicate', false,\n    'new_balance', v_new_balance,\n    'credited_usd', v_credit_usd,\n    'credited_inr', v_amount_inr\n  );\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.debit_wallet_for_order(p_user_id uuid, p_amount numeric, p_order_id uuid DEFAULT NULL::uuid, p_description text DEFAULT 'Order payment'::text, p_idempotency_key text DEFAULT NULL::text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_lock_key bigint;\n  v_balance numeric;\n  v_spent numeric;\n  v_new_balance numeric;\n  v_amount numeric;\n  v_existing_id uuid;\n  v_txn_id uuid;\nBEGIN\n  IF p_user_id IS NULL THEN\n    RAISE EXCEPTION 'user_id required' USING ERRCODE = '22023';\n  END IF;\n  IF p_amount IS NULL OR p_amount <= 0 THEN\n    RAISE EXCEPTION 'amount must be greater than zero' USING ERRCODE = '22023';\n  END IF;\n\n  v_amount := trunc(p_amount::numeric, 4);\n\n  -- Idempotency: if a previous call with same key already debited, return that result.\n  IF p_idempotency_key IS NOT NULL AND length(btrim(p_idempotency_key)) > 0 THEN\n    v_lock_key := abs(hashtextextended('debit_wallet_for_order:' || p_idempotency_key, 0));\n    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_key);\n\n    SELECT id INTO v_existing_id\n      FROM public.transactions\n     WHERE payment_method = 'wallet'\n       AND payment_reference = p_idempotency_key\n       AND user_id = p_user_id\n     LIMIT 1;\n\n    IF v_existing_id IS NOT NULL THEN\n      SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id;\n      RETURN json_build_object(\n        'success', true,\n        'duplicate', true,\n        'transaction_id', v_existing_id,\n        'new_balance', COALESCE(v_balance, 0),\n        'debited', 0\n      );\n    END IF;\n  END IF;\n\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n    VALUES (p_user_id, 0, 0, 0)\n    ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance, total_spent\n    INTO v_balance, v_spent\n    FROM public.wallets\n    WHERE user_id = p_user_id\n    FOR UPDATE;\n\n  IF v_balance IS NULL THEN\n    RAISE EXCEPTION 'wallet not found' USING ERRCODE = 'P0002';\n  END IF;\n\n  IF v_balance < v_amount THEN\n    RAISE EXCEPTION 'insufficient balance: have %, need %', v_balance, v_amount\n      USING ERRCODE = 'P0001';\n  END IF;\n\n  v_new_balance := trunc(v_balance - v_amount, 4);\n\n  UPDATE public.wallets\n     SET balance = v_new_balance,\n         total_spent = trunc(COALESCE(v_spent, 0) + v_amount, 4)\n   WHERE user_id = p_user_id;\n\n  INSERT INTO public.transactions (\n    user_id, type, amount, balance_after, status,\n    payment_method, payment_reference, order_id, description\n  ) VALUES (\n    p_user_id, 'order', -v_amount, v_new_balance, 'completed',\n    'wallet', p_idempotency_key, p_order_id, p_description\n  )\n  RETURNING id INTO v_txn_id;\n\n  RETURN json_build_object(\n    'success', true,\n    'duplicate', false,\n    'transaction_id', v_txn_id,\n    'new_balance', v_new_balance,\n    'debited', v_amount\n  );\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.expire_subscriptions()\n RETURNS integer\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE v_count INTEGER;\nBEGIN\n  WITH upd AS (\n    UPDATE public.subscriptions\n    SET status = 'expired', updated_at = now()\n    WHERE status = 'active'\n      AND expires_at IS NOT NULL\n      AND expires_at < now()\n    RETURNING 1\n  )\n  SELECT count(*) INTO v_count FROM upd;\n  RETURN v_count;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.generate_referral_code()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NEW.referral_code IS NULL THEN\n    NEW.referral_code := upper(substring(md5(NEW.user_id::text || random()::text) from 1 for 8));\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.generate_telegram_link_code()\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_uid uuid := auth.uid();\n  v_code text;\nBEGIN\n  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;\n  v_code := upper(substring(md5(v_uid::text || random()::text || clock_timestamp()::text) from 1 for 8));\n  INSERT INTO public.telegram_engagement_links (user_id, link_code, code_expires_at, status)\n  VALUES (v_uid, v_code, now() + interval '30 minutes', 'pending')\n  ON CONFLICT (user_id) DO UPDATE\n    SET link_code = EXCLUDED.link_code,\n        code_expires_at = EXCLUDED.code_expires_at,\n        status = CASE WHEN telegram_engagement_links.status = 'linked' THEN 'linked' ELSE 'pending' END,\n        updated_at = now();\n  RETURN json_build_object('success', true, 'code', v_code, 'expires_at', now() + interval '30 minutes');\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  result JSON;\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n\n  SELECT json_build_object(\n    'total_revenue', COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE type IN ('order', 'order_payment') AND status = 'completed'), 0),\n    'total_deposits', COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'deposit' AND status = 'completed'), 0),\n    'total_wallet_balance', COALESCE((SELECT SUM(balance) FROM wallets), 0),\n    'deposits_today', COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'deposit' AND status = 'completed' AND created_at >= date_trunc('day', now())), 0),\n    'deposits_count', COALESCE((SELECT COUNT(*) FROM transactions WHERE type = 'deposit' AND status = 'completed'), 0),\n    'total_orders', (SELECT COUNT(*) FROM orders) + (SELECT COUNT(*) FROM engagement_orders),\n    'user_count', (SELECT COUNT(*) FROM profiles),\n    'service_count', (SELECT COUNT(*) FROM services WHERE is_active = true),\n    'markup', COALESCE((SELECT global_markup_percent FROM platform_settings LIMIT 1), 0),\n    'maintenance_mode', COALESCE((SELECT maintenance_mode FROM platform_settings LIMIT 1), false)\n  ) INTO result;\n\n  RETURN result;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_admin_users_summary()\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  result JSON;\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n  \n  SELECT json_agg(row_to_json(t)) INTO result\n  FROM (\n    SELECT \n      p.id,\n      p.user_id,\n      p.email,\n      p.full_name,\n      p.created_at,\n      COALESCE(w.balance, 0) as balance,\n      COALESCE(w.total_deposited, 0) as total_deposited,\n      COALESCE(w.total_spent, 0) as total_spent,\n      COALESCE(ur.role::text, 'user') as role,\n      COALESCE(s.plan_type, 'none') as plan_type,\n      COALESCE(s.status, 'inactive') as subscription_status\n    FROM profiles p\n    LEFT JOIN wallets w ON w.user_id = p.user_id\n    LEFT JOIN user_roles ur ON ur.user_id = p.user_id\n    LEFT JOIN subscriptions s ON s.user_id = p.user_id\n    ORDER BY p.created_at DESC\n  ) t;\n  \n  RETURN COALESCE(result, '[]'::json);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_cron_jobs()\n RETURNS TABLE(jobid bigint, schedule text, command text, nodename text, nodeport integer, database text, username text, active boolean, jobname text)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n  RETURN QUERY\n    SELECT j.jobid, j.schedule, j.command, j.nodename, j.nodeport, j.database, j.username, j.active, j.jobname\n    FROM cron.job j;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_cron_run_details(p_job_id integer)\n RETURNS TABLE(runid bigint, jobid bigint, job_pid integer, database text, username text, command text, status text, return_message text, start_time timestamp with time zone, end_time timestamp with time zone)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n  RETURN QUERY\n    SELECT r.runid, r.jobid, r.job_pid, r.database, r.username, r.command, r.status, r.return_message, r.start_time, r.end_time\n    FROM cron.job_run_details r\n    WHERE r.jobid = p_job_id\n    ORDER BY r.start_time DESC\n    LIMIT 50;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_orders_by_link(_user_id uuid, _link text)\n RETURNS SETOF engagement_orders\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT * FROM public.engagement_orders\n  WHERE user_id = _user_id\n    AND (auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))\n    AND (\n      link = _link\n      OR (position('/p/' IN _link) > 0 AND link ILIKE '%' || split_part(split_part(_link, '/p/', 2), '/', 1) || '%')\n      OR (position('/reel/' IN _link) > 0 AND link ILIKE '%' || split_part(split_part(_link, '/reel/', 2), '/', 1) || '%')\n    )\n  ORDER BY created_at DESC;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_posts_with_order_summary(_user_id uuid)\n RETURNS TABLE(media_id text, shortcode text, permalink text, thumbnail_url text, media_type text, caption text, posted_at timestamp with time zone, account_username text, total_orders bigint, active_orders bigint, completed_orders bigint, total_spent numeric)\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT m.media_id, m.shortcode, m.permalink, m.thumbnail_url, m.media_type,\n         m.caption, m.posted_at,\n         a.username AS account_username,\n         COUNT(o.id) AS total_orders,\n         COUNT(o.id) FILTER (WHERE o.status IN ('pending','processing')) AS active_orders,\n         COUNT(o.id) FILTER (WHERE o.status = 'completed') AS completed_orders,\n         COALESCE(SUM(o.total_price), 0) AS total_spent\n  FROM public.instagram_media m\n  JOIN public.instagram_accounts a ON a.id = m.account_id\n  LEFT JOIN public.engagement_orders o\n    ON o.user_id = m.user_id\n   AND m.shortcode IS NOT NULL\n   AND o.link ILIKE '%' || m.shortcode || '%'\n  WHERE m.user_id = _user_id\n    AND (auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin'))\n  GROUP BY m.media_id, m.shortcode, m.permalink, m.thumbnail_url, m.media_type,\n           m.caption, m.posted_at, a.username\n  ORDER BY m.posted_at DESC NULLS LAST;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_provider_topup_breakdown()\n RETURNS TABLE(provider_account_id uuid, provider_id text, provider_name text, service_id uuid, service_name text, service_category text, pending_runs bigint, pending_quantity bigint, pending_user_usd numeric)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n\n  RETURN QUERY\n  WITH pending_units AS (\n    SELECT eoi.service_id, rs.quantity_to_send::numeric AS qty, s.price AS price_per_k\n    FROM public.organic_run_schedule rs\n    JOIN public.engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id\n    JOIN public.services s ON s.id = eoi.service_id\n    WHERE rs.status = 'pending'\n    UNION ALL\n    SELECT o.service_id, rs.quantity_to_send::numeric AS qty, s.price AS price_per_k\n    FROM public.organic_run_schedule rs\n    JOIN public.orders o ON o.id = rs.order_id\n    JOIN public.services s ON s.id = o.service_id\n    WHERE rs.status = 'pending'\n    UNION ALL\n    SELECT o.service_id, o.quantity::numeric AS qty, s.price AS price_per_k\n    FROM public.orders o\n    JOIN public.services s ON s.id = o.service_id\n    WHERE o.status IN ('pending','processing')\n      AND NOT EXISTS (SELECT 1 FROM public.organic_run_schedule rs2 WHERE rs2.order_id = o.id)\n  ),\n  split AS (\n    SELECT\n      pu.service_id,\n      pu.qty,\n      pu.price_per_k,\n      pa.id          AS provider_account_id,\n      pa.provider_id AS provider_id,\n      pa.name        AS provider_name,\n      1.0 / NULLIF(cnt.n, 0)::numeric AS share\n    FROM pending_units pu\n    JOIN LATERAL (\n      SELECT m.provider_account_id\n      FROM public.service_provider_mapping m\n      WHERE m.service_id = pu.service_id AND m.is_active = true\n      UNION\n      SELECT pa2.id\n      FROM public.services s2\n      JOIN public.provider_accounts pa2\n        ON pa2.provider_id = s2.provider_id AND pa2.is_active = true\n      WHERE s2.id = pu.service_id\n        AND NOT EXISTS (\n          SELECT 1 FROM public.service_provider_mapping m2\n          WHERE m2.service_id = pu.service_id AND m2.is_active = true\n        )\n    ) pas ON true\n    JOIN public.provider_accounts pa ON pa.id = pas.provider_account_id\n    JOIN LATERAL (\n      SELECT count(*)::int AS n FROM (\n        SELECT m.provider_account_id\n        FROM public.service_provider_mapping m\n        WHERE m.service_id = pu.service_id AND m.is_active = true\n        UNION\n        SELECT pa3.id\n        FROM public.services s3\n        JOIN public.provider_accounts pa3\n          ON pa3.provider_id = s3.provider_id AND pa3.is_active = true\n        WHERE s3.id = pu.service_id\n          AND NOT EXISTS (\n            SELECT 1 FROM public.service_provider_mapping m3\n            WHERE m3.service_id = pu.service_id AND m3.is_active = true\n          )\n      ) inner_pas\n    ) cnt ON true\n  )\n  SELECT\n    sp.provider_account_id,\n    sp.provider_id,\n    sp.provider_name,\n    sp.service_id,\n    s.name                                                                  AS service_name,\n    s.category                                                              AS service_category,\n    count(*)::bigint                                                        AS pending_runs,\n    COALESCE(SUM(sp.qty * sp.share), 0)::bigint                             AS pending_quantity,\n    COALESCE(SUM((sp.qty / 1000.0) * sp.price_per_k * sp.share), 0)::numeric AS pending_user_usd\n  FROM split sp\n  JOIN public.services s ON s.id = sp.service_id\n  GROUP BY sp.provider_account_id, sp.provider_id, sp.provider_name, sp.service_id, s.name, s.category\n  HAVING count(*) > 0\n  ORDER BY sp.provider_account_id, pending_user_usd DESC;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_provider_topup_plan()\n RETURNS TABLE(provider_account_id uuid, provider_id text, provider_name text, pending_runs bigint, pending_user_usd numeric, markup_percent numeric)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NOT public.has_role(auth.uid(), 'admin') THEN\n    RAISE EXCEPTION 'Unauthorized';\n  END IF;\n\n  RETURN QUERY\n  WITH pending_units AS (\n    -- Engagement runs\n    SELECT\n      eoi.service_id,\n      rs.quantity_to_send::numeric AS qty,\n      s.price                       AS price_per_k\n    FROM public.organic_run_schedule rs\n    JOIN public.engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id\n    JOIN public.services s ON s.id = eoi.service_id\n    WHERE rs.status = 'pending'\n\n    UNION ALL\n\n    -- Order runs\n    SELECT\n      o.service_id,\n      rs.quantity_to_send::numeric AS qty,\n      s.price                       AS price_per_k\n    FROM public.organic_run_schedule rs\n    JOIN public.orders o ON o.id = rs.order_id\n    JOIN public.services s ON s.id = o.service_id\n    WHERE rs.status = 'pending'\n\n    UNION ALL\n\n    -- Plain orders (no run schedule rows)\n    SELECT\n      o.service_id,\n      o.quantity::numeric AS qty,\n      s.price             AS price_per_k\n    FROM public.orders o\n    JOIN public.services s ON s.id = o.service_id\n    WHERE o.status IN ('pending','processing')\n      AND NOT EXISTS (\n        SELECT 1 FROM public.organic_run_schedule rs2 WHERE rs2.order_id = o.id\n      )\n  ),\n  service_provider_split AS (\n    SELECT\n      pu.service_id,\n      pu.qty,\n      pu.price_per_k,\n      pa.id                              AS provider_account_id,\n      pa.provider_id                     AS provider_id,\n      pa.name                            AS provider_name,\n      1.0 / NULLIF(cnt.n, 0)::numeric    AS share\n    FROM pending_units pu\n    JOIN LATERAL (\n      -- Try active mappings first\n      SELECT m.provider_account_id\n      FROM public.service_provider_mapping m\n      WHERE m.service_id = pu.service_id\n        AND m.is_active = true\n      UNION\n      -- Fallback: services.provider_id → any active provider_account\n      SELECT pa2.id\n      FROM public.services s2\n      JOIN public.provider_accounts pa2\n        ON pa2.provider_id = s2.provider_id\n       AND pa2.is_active = true\n      WHERE s2.id = pu.service_id\n        AND NOT EXISTS (\n          SELECT 1 FROM public.service_provider_mapping m2\n          WHERE m2.service_id = pu.service_id AND m2.is_active = true\n        )\n    ) pas ON true\n    JOIN public.provider_accounts pa ON pa.id = pas.provider_account_id\n    JOIN LATERAL (\n      SELECT count(*)::int AS n FROM (\n        SELECT m.provider_account_id\n        FROM public.service_provider_mapping m\n        WHERE m.service_id = pu.service_id AND m.is_active = true\n        UNION\n        SELECT pa3.id\n        FROM public.services s3\n        JOIN public.provider_accounts pa3\n          ON pa3.provider_id = s3.provider_id\n         AND pa3.is_active = true\n        WHERE s3.id = pu.service_id\n          AND NOT EXISTS (\n            SELECT 1 FROM public.service_provider_mapping m3\n            WHERE m3.service_id = pu.service_id AND m3.is_active = true\n          )\n      ) inner_pas\n    ) cnt ON true\n  )\n  SELECT\n    sps.provider_account_id,\n    sps.provider_id,\n    sps.provider_name,\n    count(*)::bigint                                                          AS pending_runs,\n    COALESCE(SUM((sps.qty / 1000.0) * sps.price_per_k * sps.share), 0)::numeric AS pending_user_usd,\n    COALESCE((SELECT global_markup_percent FROM public.platform_settings LIMIT 1), 0)::numeric AS markup_percent\n  FROM service_provider_split sps\n  GROUP BY sps.provider_account_id, sps.provider_id, sps.provider_name\n  HAVING count(*) > 0\n  ORDER BY pending_user_usd DESC;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_public_markup()\n RETURNS numeric\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT COALESCE((SELECT global_markup_percent FROM public.platform_settings LIMIT 1), 0)::numeric\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)\n RETURNS app_role\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1\n$function$\n;
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id uuid)\n RETURNS text\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT CASE\n    WHEN COALESCE((SELECT total_deposited FROM public.wallets WHERE user_id = _user_id), 0) >= 2000 THEN 'diamond'\n    WHEN COALESCE((SELECT total_deposited FROM public.wallets WHERE user_id = _user_id), 0) >= 500 THEN 'gold'\n    WHEN COALESCE((SELECT total_deposited FROM public.wallets WHERE user_id = _user_id), 0) >= 100 THEN 'silver'\n    ELSE 'bronze'\n  END\n$function$\n;
CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  INSERT INTO public.profiles (user_id, email, full_name)\n  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))\n  ON CONFLICT (user_id) DO NOTHING;\n  \n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n  VALUES (NEW.id, 0, 0, 0)\n  ON CONFLICT (user_id) DO NOTHING;\n  \n  INSERT INTO public.user_roles (user_id, role)\n  VALUES (NEW.id, 'user')\n  ON CONFLICT (user_id, role) DO NOTHING;\n  \n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT EXISTS (\n    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role\n  )\n$function$\n;
CREATE OR REPLACE FUNCTION public.is_maintenance_mode()\n RETURNS boolean\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT COALESCE((SELECT maintenance_mode FROM public.platform_settings LIMIT 1), false)\n$function$\n;
CREATE OR REPLACE FUNCTION public.organic_run_schedule_lock_user_columns()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_uid uuid := auth.uid();\n  v_is_admin boolean := false;\n  v_bypass text;\nBEGIN\n  -- service_role (no auth.uid) bypasses the lock\n  IF v_uid IS NULL THEN\n    RETURN NEW;\n  END IF;\n\n  -- Trusted RPC bypass\n  BEGIN\n    v_bypass := current_setting('app.allow_run_edit', true);\n  EXCEPTION WHEN OTHERS THEN\n    v_bypass := NULL;\n  END;\n  IF v_bypass = '1' THEN\n    RETURN NEW;\n  END IF;\n\n  SELECT public.has_role(v_uid, 'admin'::app_role) INTO v_is_admin;\n  IF v_is_admin THEN\n    RETURN NEW;\n  END IF;\n\n  -- Regular user: revert all sensitive columns\n  NEW.order_id                 := OLD.order_id;\n  NEW.engagement_order_item_id := OLD.engagement_order_item_id;\n  NEW.run_number               := OLD.run_number;\n  NEW.peak_multiplier          := OLD.peak_multiplier;\n  NEW.provider_order_id        := OLD.provider_order_id;\n  NEW.provider_response        := OLD.provider_response;\n  NEW.error_message            := OLD.error_message;\n  NEW.started_at               := OLD.started_at;\n  NEW.completed_at             := OLD.completed_at;\n  NEW.provider_start_count     := OLD.provider_start_count;\n  NEW.provider_remains         := OLD.provider_remains;\n  NEW.provider_status          := OLD.provider_status;\n  NEW.provider_charge          := OLD.provider_charge;\n  NEW.last_status_check        := OLD.last_status_check;\n  NEW.retry_count              := OLD.retry_count;\n  NEW.provider_account_id      := OLD.provider_account_id;\n  NEW.provider_account_name    := OLD.provider_account_name;\n  NEW.created_at               := OLD.created_at;\n\n  -- Status: only allow change to 'cancelled'\n  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN\n    NEW.status := OLD.status;\n  END IF;\n\n  -- Allow edits to scheduled_at, variance_applied, base_quantity, quantity_to_send\n  -- BUT a direct increase is not allowed without the RPC bypass (which also charges wallet)\n  IF COALESCE(NEW.quantity_to_send, 0) > COALESCE(OLD.quantity_to_send, 0) THEN\n    NEW.quantity_to_send := OLD.quantity_to_send;\n    NEW.base_quantity    := OLD.base_quantity;\n  END IF;\n\n  -- Don't let quantity be set to NULL/<=0\n  IF NEW.quantity_to_send IS NULL OR NEW.quantity_to_send <= 0 THEN\n    NEW.quantity_to_send := OLD.quantity_to_send;\n    NEW.base_quantity    := OLD.base_quantity;\n  END IF;\n\n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.pg_advisory_xact_lock(key bigint)\n RETURNS void\n LANGUAGE sql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\n  SELECT pg_catalog.pg_advisory_xact_lock(key);\n$function$\n;
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text, p_deposit_usd numeric)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_uid uuid := auth.uid();\n  v_code record;\n  v_bonus numeric := 0;\n  v_existing uuid;\n  v_balance numeric;\n  v_new_balance numeric;\nBEGIN\n  IF v_uid IS NULL THEN\n    RAISE EXCEPTION 'Not authenticated';\n  END IF;\n  IF p_deposit_usd IS NULL OR p_deposit_usd <= 0 THEN\n    RAISE EXCEPTION 'Invalid deposit amount';\n  END IF;\n\n  SELECT * INTO v_code FROM public.promo_codes\n   WHERE upper(code) = upper(p_code) AND is_active = true\n   FOR UPDATE;\n\n  IF v_code IS NULL THEN\n    RAISE EXCEPTION 'Invalid promo code';\n  END IF;\n  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN\n    RAISE EXCEPTION 'Promo code expired';\n  END IF;\n  IF v_code.max_uses IS NOT NULL AND v_code.used_count >= v_code.max_uses THEN\n    RAISE EXCEPTION 'Promo code limit reached';\n  END IF;\n  IF p_deposit_usd < v_code.min_deposit_usd THEN\n    RAISE EXCEPTION 'Minimum deposit $% required', v_code.min_deposit_usd;\n  END IF;\n\n  SELECT id INTO v_existing FROM public.promo_redemptions\n   WHERE promo_code_id = v_code.id AND user_id = v_uid;\n  IF v_existing IS NOT NULL THEN\n    RAISE EXCEPTION 'You already used this code';\n  END IF;\n\n  IF v_code.bonus_type = 'percent' THEN\n    v_bonus := trunc(p_deposit_usd * v_code.bonus_value / 100.0, 4);\n  ELSE\n    v_bonus := trunc(v_code.bonus_value, 4);\n  END IF;\n\n  IF v_bonus <= 0 THEN\n    RAISE EXCEPTION 'Bonus calculation failed';\n  END IF;\n\n  -- Credit wallet\n  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)\n  VALUES (v_uid, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;\n\n  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_uid FOR UPDATE;\n  v_new_balance := trunc(COALESCE(v_balance, 0) + v_bonus, 4);\n  UPDATE public.wallets SET balance = v_new_balance WHERE user_id = v_uid;\n\n  INSERT INTO public.promo_redemptions (promo_code_id, user_id, bonus_amount_usd, deposit_amount_usd)\n  VALUES (v_code.id, v_uid, v_bonus, p_deposit_usd);\n\n  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = v_code.id;\n\n  INSERT INTO public.transactions (user_id, type, amount, balance_after, status, payment_method, description)\n  VALUES (v_uid, 'deposit', v_bonus, v_new_balance, 'completed', 'promo', 'Promo code: ' || v_code.code);\n\n  RETURN json_build_object('success', true, 'bonus_usd', v_bonus, 'new_balance', v_new_balance, 'code', v_code.code);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.redeem_telegram_link_code(p_code text, p_chat_id bigint, p_username text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_row public.telegram_engagement_links%ROWTYPE;\nBEGIN\n  SELECT * INTO v_row FROM public.telegram_engagement_links\n    WHERE upper(link_code) = upper(p_code) LIMIT 1;\n  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'invalid_code'); END IF;\n  IF v_row.code_expires_at < now() THEN RETURN json_build_object('success', false, 'reason', 'expired'); END IF;\n\n  UPDATE public.telegram_engagement_links\n    SET telegram_chat_id = p_chat_id,\n        telegram_username = p_username,\n        status = 'linked',\n        linked_at = now(),\n        updated_at = now()\n    WHERE id = v_row.id;\n  RETURN json_build_object('success', true, 'user_id', v_row.user_id);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.reschedule_organic_run(p_run_id uuid, p_quantity integer, p_scheduled_at timestamp with time zone)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_uid uuid := auth.uid();\n  v_run record;\n  v_order_price numeric;\n  v_order_quantity integer;\n  v_price_per_thousand numeric := 0;\n  v_qty_diff integer;\n  v_extra_cost numeric := 0;\n  v_balance numeric;\n  v_spent numeric;\n  v_new_balance numeric;\nBEGIN\n  IF v_uid IS NULL THEN\n    RAISE EXCEPTION 'Not authenticated';\n  END IF;\n\n  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000 THEN\n    RAISE EXCEPTION 'Invalid quantity';\n  END IF;\n\n  IF p_scheduled_at IS NULL THEN\n    RAISE EXCEPTION 'Scheduled time required';\n  END IF;\n\n  SELECT\n    rs.id,\n    rs.order_id,\n    rs.engagement_order_item_id,\n    rs.run_number,\n    rs.status,\n    rs.quantity_to_send,\n    rs.base_quantity,\n    o.user_id AS order_user_id,\n    o.price AS order_price,\n    o.quantity AS order_quantity,\n    eo.user_id AS engagement_order_user_id,\n    s.price AS service_price\n  INTO v_run\n  FROM public.organic_run_schedule rs\n  LEFT JOIN public.orders o\n    ON o.id = rs.order_id\n  LEFT JOIN public.engagement_order_items eoi\n    ON eoi.id = rs.engagement_order_item_id\n  LEFT JOIN public.engagement_orders eo\n    ON eo.id = eoi.engagement_order_id\n  LEFT JOIN public.services s\n    ON s.id = eoi.service_id\n  WHERE rs.id = p_run_id\n    AND (\n      o.user_id = v_uid\n      OR eo.user_id = v_uid\n    )\n  FOR UPDATE OF rs;\n\n  IF v_run IS NULL THEN\n    RAISE EXCEPTION 'Run not found or not owned by you';\n  END IF;\n\n  IF v_run.status <> 'pending' THEN\n    RAISE EXCEPTION 'Only pending runs can be rescheduled';\n  END IF;\n\n  IF v_run.order_id IS NOT NULL THEN\n    v_order_price := COALESCE(v_run.order_price, 0);\n    v_order_quantity := COALESCE(v_run.order_quantity, 0);\n\n    IF v_order_quantity > 0 THEN\n      v_price_per_thousand := (v_order_price::numeric / v_order_quantity::numeric) * 1000;\n    END IF;\n  ELSIF v_run.engagement_order_item_id IS NOT NULL THEN\n    v_price_per_thousand := COALESCE(v_run.service_price, 0);\n  END IF;\n\n  v_qty_diff := p_quantity - v_run.quantity_to_send;\n\n  IF v_qty_diff > 0 AND v_price_per_thousand > 0 THEN\n    v_extra_cost := trunc((v_qty_diff::numeric / 1000.0) * v_price_per_thousand, 4);\n  END IF;\n\n  IF v_extra_cost > 0 THEN\n    SELECT balance, total_spent\n      INTO v_balance, v_spent\n    FROM public.wallets\n    WHERE user_id = v_uid\n    FOR UPDATE;\n\n    IF v_balance IS NULL THEN\n      RAISE EXCEPTION 'Wallet not found';\n    END IF;\n\n    IF v_balance < v_extra_cost THEN\n      RAISE EXCEPTION 'Insufficient balance';\n    END IF;\n\n    v_new_balance := trunc(v_balance - v_extra_cost, 4);\n\n    UPDATE public.wallets\n       SET balance = v_new_balance,\n           total_spent = trunc(COALESCE(v_spent, 0) + v_extra_cost, 4)\n     WHERE user_id = v_uid;\n\n    INSERT INTO public.transactions (\n      user_id,\n      type,\n      amount,\n      balance_after,\n      status,\n      payment_method,\n      order_id,\n      description\n    )\n    VALUES (\n      v_uid,\n      'order',\n      -v_extra_cost,\n      v_new_balance,\n      'completed',\n      'wallet',\n      v_run.order_id,\n      'Reschedule run #' || COALESCE(v_run.run_number::text, '?') || ' (+' || v_qty_diff || ' units)'\n    );\n  END IF;\n\n  PERFORM set_config('app.allow_run_edit', '1', true);\n\n  UPDATE public.organic_run_schedule\n     SET quantity_to_send = p_quantity,\n         base_quantity = p_quantity,\n         scheduled_at = p_scheduled_at,\n         variance_applied = 0\n   WHERE id = p_run_id\n     AND status = 'pending';\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'Run could not be updated';\n  END IF;\n\n  PERFORM set_config('app.allow_run_edit', '0', true);\n\n  RETURN json_build_object(\n    'success', true,\n    'extra_charged', v_extra_cost,\n    'new_balance', COALESCE(v_new_balance, v_balance, NULL),\n    'quantity', p_quantity,\n    'scheduled_at', p_scheduled_at\n  );\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.set_engagement_order_completed_at()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  IF NEW.status IN ('completed','cancelled','failed','partial')\n     AND (OLD.status IS DISTINCT FROM NEW.status) THEN\n    NEW.completed_at = COALESCE(NEW.completed_at, now());\n  ELSIF NEW.status NOT IN ('completed','cancelled','failed','partial') THEN\n    NEW.completed_at = NULL;\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.set_referrer_by_code(p_code text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  v_uid uuid := auth.uid();\n  v_referrer uuid;\n  v_already uuid;\nBEGIN\n  IF v_uid IS NULL THEN\n    RAISE EXCEPTION 'Not authenticated';\n  END IF;\n  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN\n    RAISE EXCEPTION 'Invalid code';\n  END IF;\n\n  SELECT referred_by INTO v_already FROM public.profiles WHERE user_id = v_uid;\n  IF v_already IS NOT NULL THEN\n    RAISE EXCEPTION 'Referrer already set';\n  END IF;\n\n  SELECT user_id INTO v_referrer FROM public.profiles WHERE upper(referral_code) = upper(p_code);\n  IF v_referrer IS NULL THEN\n    RAISE EXCEPTION 'Referral code not found';\n  END IF;\n  IF v_referrer = v_uid THEN\n    RAISE EXCEPTION 'Cannot refer yourself';\n  END IF;\n\n  UPDATE public.profiles SET referred_by = v_referrer WHERE user_id = v_uid;\n  RETURN json_build_object('success', true);\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  UPDATE public.chat_conversations\n  SET last_message_at = NEW.created_at, updated_at = now()\n  WHERE id = NEW.conversation_id;\n  RETURN NEW;\nEND;\n$function$\n;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$\nBEGIN\n  NEW.updated_at = now();\n  RETURN NEW;\nEND;\n$function$\n;

-- ---------- grants ----------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ---------- row level security ----------

-- ---------- policies ----------
DROP POLICY IF EXISTS "Users view own apify calls" ON public.apify_call_log;
CREATE POLICY "Users view own apify calls" ON public.apify_call_log AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admin can manage all bundle items" ON public.bundle_items;
CREATE POLICY "Admin can manage all bundle items" ON public.bundle_items AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can view bundle items" ON public.bundle_items;
CREATE POLICY "Anyone can view bundle items" ON public.bundle_items AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Users create conversations" ON public.chat_conversations;
CREATE POLICY "Users create conversations" ON public.chat_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users update conversations" ON public.chat_conversations;
CREATE POLICY "Users update conversations" ON public.chat_conversations AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Users view own conversations" ON public.chat_conversations;
CREATE POLICY "Users view own conversations" ON public.chat_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins update messages" ON public.chat_messages;
CREATE POLICY "Admins update messages" ON public.chat_messages AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users create messages" ON public.chat_messages;
CREATE POLICY "Users create messages" ON public.chat_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = sender_id) AND ((EXISTS ( SELECT 1\n   FROM chat_conversations\n  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role))));
DROP POLICY IF EXISTS "Users view own messages" ON public.chat_messages;
CREATE POLICY "Users view own messages" ON public.chat_messages AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1\n   FROM chat_conversations\n  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage deposits" ON public.deposits;
CREATE POLICY "Admins manage deposits" ON public.deposits AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own deposits" ON public.deposits;
CREATE POLICY "Users view own deposits" ON public.deposits AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage all drip campaigns" ON public.drip_feed_campaigns;
CREATE POLICY "Admins manage all drip campaigns" ON public.drip_feed_campaigns AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users manage own drip campaigns" ON public.drip_feed_campaigns;
CREATE POLICY "Users manage own drip campaigns" ON public.drip_feed_campaigns AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admin can manage all bundles" ON public.engagement_bundles;
CREATE POLICY "Admin can manage all bundles" ON public.engagement_bundles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can view active bundles" ON public.engagement_bundles;
CREATE POLICY "Anyone can view active bundles" ON public.engagement_bundles AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
DROP POLICY IF EXISTS "Admins manage engagement health history" ON public.engagement_health_history;
CREATE POLICY "Admins manage engagement health history" ON public.engagement_health_history AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Restrict engagement health history to owner or admin" ON public.engagement_health_history;
CREATE POLICY "Restrict engagement health history to owner or admin" ON public.engagement_health_history AS RESTRICTIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1\n   FROM engagement_orders eo\n  WHERE ((eo.id = engagement_health_history.engagement_order_id) AND (eo.user_id = auth.uid())))))));
DROP POLICY IF EXISTS "Users insert own engagement health history" ON public.engagement_health_history;
CREATE POLICY "Users insert own engagement health history" ON public.engagement_health_history AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1\n   FROM engagement_orders eo\n  WHERE ((eo.id = engagement_health_history.engagement_order_id) AND (eo.user_id = auth.uid())))));
DROP POLICY IF EXISTS "Users view own engagement health history" ON public.engagement_health_history;
CREATE POLICY "Users view own engagement health history" ON public.engagement_health_history AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1\n   FROM engagement_orders eo\n  WHERE ((eo.id = engagement_health_history.engagement_order_id) AND ((eo.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))))));
DROP POLICY IF EXISTS "Admins manage order items" ON public.engagement_order_items;
CREATE POLICY "Admins manage order items" ON public.engagement_order_items AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own order items" ON public.engagement_order_items;
CREATE POLICY "Users view own order items" ON public.engagement_order_items AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1\n   FROM engagement_orders\n  WHERE ((engagement_orders.id = engagement_order_items.engagement_order_id) AND (engagement_orders.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage engagement_orders" ON public.engagement_orders;
CREATE POLICY "Admins manage engagement_orders" ON public.engagement_orders AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own engagement_orders" ON public.engagement_orders;
CREATE POLICY "Users view own engagement_orders" ON public.engagement_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "own preset" ON public.engagement_presets;
CREATE POLICY "own preset" ON public.engagement_presets AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own delete ig accounts" ON public.instagram_accounts;
CREATE POLICY "own delete ig accounts" ON public.instagram_accounts AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own insert ig accounts" ON public.instagram_accounts;
CREATE POLICY "own insert ig accounts" ON public.instagram_accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own or admin select ig accounts" ON public.instagram_accounts;
CREATE POLICY "own or admin select ig accounts" ON public.instagram_accounts AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "own update ig accounts" ON public.instagram_accounts;
CREATE POLICY "own update ig accounts" ON public.instagram_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins view all link events" ON public.instagram_link_events;
CREATE POLICY "Admins view all link events" ON public.instagram_link_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own link events" ON public.instagram_link_events;
CREATE POLICY "Users view own link events" ON public.instagram_link_events AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own delete ig media" ON public.instagram_media;
CREATE POLICY "own delete ig media" ON public.instagram_media AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own insert ig media" ON public.instagram_media;
CREATE POLICY "own insert ig media" ON public.instagram_media AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own or admin select ig media" ON public.instagram_media;
CREATE POLICY "own or admin select ig media" ON public.instagram_media AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "own update ig media" ON public.instagram_media;
CREATE POLICY "own update ig media" ON public.instagram_media AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins can manage poll state" ON public.instagram_poll_state;
CREATE POLICY "Admins can manage poll state" ON public.instagram_poll_state AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view poll state" ON public.instagram_poll_state;
CREATE POLICY "Admins can view poll state" ON public.instagram_poll_state AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "read own poll state" ON public.instagram_poll_state;
CREATE POLICY "read own poll state" ON public.instagram_poll_state AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1\n   FROM instagram_accounts a\n  WHERE ((a.id = instagram_poll_state.account_id) AND (a.user_id = auth.uid())))));
DROP POLICY IF EXISTS "Users manage their own batch items" ON public.mass_order_batch_items;
CREATE POLICY "Users manage their own batch items" ON public.mass_order_batch_items AS PERMISSIVE FOR ALL TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Users manage their own batches" ON public.mass_order_batches;
CREATE POLICY "Users manage their own batches" ON public.mass_order_batches AS PERMISSIVE FOR ALL TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage runs" ON public.organic_run_schedule;
CREATE POLICY "Admins manage runs" ON public.organic_run_schedule AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Only admins delete runs" ON public.organic_run_schedule;
CREATE POLICY "Only admins delete runs" ON public.organic_run_schedule AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Only admins insert runs" ON public.organic_run_schedule;
CREATE POLICY "Only admins insert runs" ON public.organic_run_schedule AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own runs" ON public.organic_run_schedule;
CREATE POLICY "Users view own runs" ON public.organic_run_schedule AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1\n   FROM orders\n  WHERE ((orders.id = organic_run_schedule.order_id) AND (orders.user_id = auth.uid())))) OR (EXISTS ( SELECT 1\n   FROM (engagement_order_items eoi\n     JOIN engagement_orders eo ON ((eo.id = eoi.engagement_order_id)))\n  WHERE ((eoi.id = organic_run_schedule.engagement_order_item_id) AND (eo.user_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins can view oxapay activity log" ON public.oxapay_activity_log;
CREATE POLICY "Admins can view oxapay activity log" ON public.oxapay_activity_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "oxapay_deposits_admin_update" ON public.oxapay_deposits;
CREATE POLICY "oxapay_deposits_admin_update" ON public.oxapay_deposits AS PERMISSIVE FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "oxapay_deposits_select_own_or_admin" ON public.oxapay_deposits;
CREATE POLICY "oxapay_deposits_select_own_or_admin" ON public.oxapay_deposits AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings AS PERMISSIVE FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Only admins can view promo codes" ON public.promo_codes;
CREATE POLICY "Only admins can view promo codes" ON public.promo_codes AS RESTRICTIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins see all redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins see all redemptions" ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users see own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users see own redemptions" ON public.promo_redemptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admin only provider_accounts" ON public.provider_accounts;
CREATE POLICY "Admin only provider_accounts" ON public.provider_accounts AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Restrict provider_accounts to admins" ON public.provider_accounts;
CREATE POLICY "Restrict provider_accounts to admins" ON public.provider_accounts AS RESTRICTIVE FOR ALL TO anon,authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins view provider balance history" ON public.provider_balance_history;
CREATE POLICY "Admins view provider balance history" ON public.provider_balance_history AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admin only providers" ON public.providers;
CREATE POLICY "Admin only providers" ON public.providers AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Restrict providers to admins" ON public.providers;
CREATE POLICY "Restrict providers to admins" ON public.providers AS RESTRICTIVE FOR ALL TO anon,authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "service role only" ON public.razorpay_webhook_events;
CREATE POLICY "service role only" ON public.razorpay_webhook_events AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can read security audit log" ON public.security_audit_log;
CREATE POLICY "Admins can read security audit log" ON public.security_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admin only service_provider_mapping" ON public.service_provider_mapping;
CREATE POLICY "Admin only service_provider_mapping" ON public.service_provider_mapping AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admin can manage all services" ON public.services;
CREATE POLICY "Admin can manage all services" ON public.services AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
DROP POLICY IF EXISTS "Admins manage requests" ON public.subscription_requests;
CREATE POLICY "Admins manage requests" ON public.subscription_requests AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users create requests" ON public.subscription_requests;
CREATE POLICY "Users create requests" ON public.subscription_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users view own requests" ON public.subscription_requests;
CREATE POLICY "Users view own requests" ON public.subscription_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins manage tickets" ON public.support_tickets;
CREATE POLICY "Admins manage tickets" ON public.support_tickets AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users create own tickets" ON public.support_tickets;
CREATE POLICY "Users create own tickets" ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets" ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "own delete tg links" ON public.telegram_engagement_links;
CREATE POLICY "own delete tg links" ON public.telegram_engagement_links AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own insert tg links" ON public.telegram_engagement_links;
CREATE POLICY "own insert tg links" ON public.telegram_engagement_links AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "own or admin select tg links" ON public.telegram_engagement_links;
CREATE POLICY "own or admin select tg links" ON public.telegram_engagement_links AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "own update tg links" ON public.telegram_engagement_links;
CREATE POLICY "own update tg links" ON public.telegram_engagement_links AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins manage transactions" ON public.transactions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "No self delete on user_roles" ON public.user_roles;
CREATE POLICY "No self delete on user_roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "No self insert into user_roles" ON public.user_roles;
CREATE POLICY "No self insert into user_roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "No self update on user_roles" ON public.user_roles;
CREATE POLICY "No self update on user_roles" ON public.user_roles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Restrict user_roles mutations to admins" ON public.user_roles;
CREATE POLICY "Restrict user_roles mutations to admins" ON public.user_roles AS RESTRICTIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage wallets" ON public.wallets;
CREATE POLICY "Admins manage wallets" ON public.wallets AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own wallet" ON public.wallets;
CREATE POLICY "Users view own wallet" ON public.wallets AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage zapupi deposits" ON public.zapupi_deposits;
CREATE POLICY "Admins manage zapupi deposits" ON public.zapupi_deposits AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Users view own zapupi deposits" ON public.zapupi_deposits;
CREATE POLICY "Users view own zapupi deposits" ON public.zapupi_deposits AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));

-- ---------- triggers ----------
DROP TRIGGER IF EXISTS on_new_chat_message ON public.chat_messages;
CREATE TRIGGER on_new_chat_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
DROP TRIGGER IF EXISTS update_deposits_updated_at ON public.deposits;
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_drip_updated_at ON public.drip_feed_campaigns;
CREATE TRIGGER trg_drip_updated_at BEFORE UPDATE ON public.drip_feed_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_engagement_bundles_updated_at ON public.engagement_bundles;
CREATE TRIGGER update_engagement_bundles_updated_at BEFORE UPDATE ON public.engagement_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_engagement_order_items_updated_at ON public.engagement_order_items;
CREATE TRIGGER update_engagement_order_items_updated_at BEFORE UPDATE ON public.engagement_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_engagement_order_completed_at_trigger ON public.engagement_orders;
CREATE TRIGGER set_engagement_order_completed_at_trigger BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION set_engagement_order_completed_at();
DROP TRIGGER IF EXISTS update_engagement_orders_updated_at ON public.engagement_orders;
CREATE TRIGGER update_engagement_orders_updated_at BEFORE UPDATE ON public.engagement_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_presets_updated_at ON public.engagement_presets;
CREATE TRIGGER trg_presets_updated_at BEFORE UPDATE ON public.engagement_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ig_accounts_updated ON public.instagram_accounts;
CREATE TRIGGER trg_ig_accounts_updated BEFORE UPDATE ON public.instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ig_media_updated ON public.instagram_media;
CREATE TRIGGER trg_ig_media_updated BEFORE UPDATE ON public.instagram_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_mass_order_batch_items_updated_at ON public.mass_order_batch_items;
CREATE TRIGGER update_mass_order_batch_items_updated_at BEFORE UPDATE ON public.mass_order_batch_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_mass_order_batches_updated_at ON public.mass_order_batches;
CREATE TRIGGER update_mass_order_batches_updated_at BEFORE UPDATE ON public.mass_order_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_organic_run_schedule_lock_user_columns ON public.organic_run_schedule;
CREATE TRIGGER trg_organic_run_schedule_lock_user_columns BEFORE UPDATE ON public.organic_run_schedule FOR EACH ROW EXECUTE FUNCTION organic_run_schedule_lock_user_columns();
DROP TRIGGER IF EXISTS update_oxapay_deposits_updated_at ON public.oxapay_deposits;
CREATE TRIGGER update_oxapay_deposits_updated_at BEFORE UPDATE ON public.oxapay_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_provider_accounts_updated_at ON public.provider_accounts;
CREATE TRIGGER update_provider_accounts_updated_at BEFORE UPDATE ON public.provider_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_providers_updated_at ON public.providers;
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscription_requests_updated_at ON public.subscription_requests;
CREATE TRIGGER update_subscription_requests_updated_at BEFORE UPDATE ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_tg_eng_links_updated ON public.telegram_engagement_links;
CREATE TRIGGER trg_tg_eng_links_updated BEFORE UPDATE ON public.telegram_engagement_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_zapupi_deposits_updated_at ON public.zapupi_deposits;
CREATE TRIGGER update_zapupi_deposits_updated_at BEFORE UPDATE ON public.zapupi_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- signup trigger on auth.users (profile + wallet + default role)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- done ----------
