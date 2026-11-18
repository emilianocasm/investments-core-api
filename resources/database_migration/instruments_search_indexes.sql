CREATE INDEX IF NOT EXISTS idx_instruments_ticker
  ON instruments USING btree (ticker);

CREATE INDEX IF NOT EXISTS idx_instruments_name
  ON instruments USING btree (name);
