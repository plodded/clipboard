-- Migration: Create clipboard_items table
-- Version: 1
-- Description: Initialize SQLite schema for clipboard history storage

CREATE TABLE IF NOT EXISTS clipboard_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_text TEXT,
  timestamp INTEGER NOT NULL,
  is_starred INTEGER DEFAULT 0,
  app_name TEXT,
  metadata TEXT
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clipboard_items_timestamp ON clipboard_items(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clipboard_items_is_starred ON clipboard_items(is_starred);
CREATE INDEX IF NOT EXISTS idx_clipboard_items_type ON clipboard_items(type);
