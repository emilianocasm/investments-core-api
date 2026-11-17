export interface UserRecord {
  id: number;
  email: string | null;
  accountNumber: string | null;
}

export interface InstrumentRecord {
  id: number;
  ticker: string | null;
  name: string | null;
  type: string | null;
}

export interface MarketDataRecord {
  id: number;
  instrumentId: number;
  date: string;
  open: string | null;
  high: string | null;
  low: string | null;
  close: string | null;
  previousClose: string | null;
}
