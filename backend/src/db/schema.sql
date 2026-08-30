CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,

  phone VARCHAR(20)
    NOT NULL
    UNIQUE,

  password_hash VARCHAR(100)
    NOT NULL,

  full_name VARCHAR(120),

  account_type VARCHAR(20)
    NOT NULL
    DEFAULT 'user',

  system_role VARCHAR(20)
    NOT NULL
    DEFAULT 'user',

  agency_status VARCHAR(20)
    NOT NULL
    DEFAULT 'none',

  is_active BOOLEAN
    NOT NULL
    DEFAULT TRUE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  updated_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  CONSTRAINT users_account_type_check
    CHECK (
      account_type IN (
        'user',
        'agent'
      )
    ),

  CONSTRAINT users_system_role_check
    CHECK (
      system_role IN (
        'user',
        'admin'
      )
    ),

  CONSTRAINT users_agency_status_check
    CHECK (
      agency_status IN (
        'none',
        'pending',
        'approved',
        'rejected'
      )
    )
);


CREATE INDEX IF NOT EXISTS
  idx_users_phone
ON users (
  phone
);


CREATE INDEX IF NOT EXISTS
  idx_users_agency_status
ON users (
  agency_status
);


CREATE INDEX IF NOT EXISTS
  idx_users_account_type
ON users (
  account_type
);
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY,
  listing_type VARCHAR(20) NOT NULL DEFAULT 'offer' CHECK (listing_type IN ('offer','wanted')),
  category VARCHAR(30) NOT NULL DEFAULT 'parking' CHECK (category IN ('parking','residential','storage','warehouse','shop','land','other')),
  custom_category VARCHAR(80), category_label VARCHAR(80),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','rented')),
  title VARCHAR(160) NOT NULL, city VARCHAR(100) NOT NULL,
  area NUMERIC(12,2) NOT NULL DEFAULT 0, price VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL, image_url TEXT, image_urls JSONB NOT NULL DEFAULT '[]'::jsonb, residential_details JSONB NOT NULL DEFAULT '{}'::jsonb, description TEXT,
  agency_network_consent BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_created_at ON spaces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spaces_status ON spaces(status);
CREATE INDEX IF NOT EXISTS idx_spaces_city ON spaces(city);

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  space_id UUID NOT NULL
    REFERENCES spaces(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ
    NOT NULL
    DEFAULT NOW(),

  PRIMARY KEY (user_id, space_id)
);

CREATE INDEX IF NOT EXISTS
  idx_favorites_user_created_at
ON favorites (
  user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_favorites_space_id
ON favorites (
  space_id
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (chat_type IN ('personal','agency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chats_different_users CHECK (owner_id <> requester_id),
  CONSTRAINT chats_space_requester_type_unique UNIQUE (space_id, requester_id, chat_type)
);

CREATE INDEX IF NOT EXISTS idx_chats_owner_updated ON chats(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_requester_updated ON chats(requester_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_space_id ON chats(space_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(chat_id, read_at) WHERE read_at IS NULL;

-- Smart saved searches and in-app notifications
CREATE TABLE IF NOT EXISTS smart_searches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  threshold INTEGER NOT NULL DEFAULT 70 CHECK (threshold BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  best_seen_score INTEGER NOT NULL DEFAULT 0,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_searches_user_active
ON smart_searches(user_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS smart_search_notifications (
  id UUID PRIMARY KEY,
  smart_search_id UUID NOT NULL REFERENCES smart_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (smart_search_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_smart_notifications_user_read
ON smart_search_notifications(user_id, is_read, created_at DESC);
