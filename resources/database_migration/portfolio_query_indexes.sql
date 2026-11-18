CREATE INDEX IF NOT EXISTS idx_orders_userid
  ON orders USING btree (userid);

CREATE INDEX IF NOT EXISTS idx_marketdata_instrumentid_date_id
  ON marketdata USING btree (instrumentid, date DESC, id DESC);
