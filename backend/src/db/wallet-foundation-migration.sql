-- Fazajoo Wallet | Stage 01 | schema only
-- Amounts are integer RIALS. No payment, balance change, or API is enabled here.
-- Apply to LOCAL PostgreSQL only after taking a backup.
BEGIN;

CREATE TABLE IF NOT EXISTS wallet_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  balance_rial BIGINT NOT NULL DEFAULT 0 CHECK (balance_rial >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_user_id UUID NOT NULL REFERENCES wallet_accounts(user_id) ON DELETE RESTRICT,
  kind VARCHAR(32) NOT NULL CHECK (
    kind IN ('topup', 'purchase', 'refund', 'admin_adjustment')
  ),
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_rial BIGINT NOT NULL CHECK (amount_rial > 0),
  balance_after_rial BIGINT NOT NULL CHECK (balance_after_rial >= 0),
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  reference_type VARCHAR(64),
  reference_id VARCHAR(160),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_transactions_owner_check CHECK (user_id = wallet_user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON wallet_transactions (user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS wallet_payment_intents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_rial BIGINT NOT NULL CHECK (amount_rial > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  provider VARCHAR(64),
  provider_authority VARCHAR(160),
  provider_reference VARCHAR(160),
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  CONSTRAINT wallet_payment_verified_time_check
    CHECK (status <> 'verified' OR verified_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_payment_provider_authority
  ON wallet_payment_intents (provider, provider_authority)
  WHERE provider IS NOT NULL AND provider_authority IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_payment_provider_reference
  ON wallet_payment_intents (provider, provider_reference)
  WHERE provider IS NOT NULL AND provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_payment_user_created
  ON wallet_payment_intents (user_id, created_at DESC);

-- Financial journal entries are append-only, including for administrators.
-- Corrections must be recorded as new compensating transactions.
CREATE OR REPLACE FUNCTION wallet_reject_journal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions is append-only; record a compensating entry';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_transactions_immutable ON wallet_transactions;
CREATE TRIGGER wallet_transactions_immutable
BEFORE UPDATE OR DELETE ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION wallet_reject_journal_mutation();

COMMIT;
