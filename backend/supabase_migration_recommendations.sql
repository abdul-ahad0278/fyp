-- ============================================
-- Migration: Add Recommendations to Messages Table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- Add recommendations column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recommendations text[] DEFAULT '{}';

-- Add precautions column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS precautions text[] DEFAULT '{}';

-- Verify the update
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'messages' AND (column_name = 'recommendations' OR column_name = 'precautions');
