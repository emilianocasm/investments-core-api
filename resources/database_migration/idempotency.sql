CREATE TABLE idempotency_requests (
  id VARCHAR(27) PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  response_body TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

