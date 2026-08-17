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