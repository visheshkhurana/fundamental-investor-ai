-- Markets
insert into markets (code, country, currency, tz, display_name) values
  ('NSE','IN','INR','Asia/Kolkata','National Stock Exchange'),
  ('BSE','IN','INR','Asia/Kolkata','Bombay Stock Exchange'),
  ('NYSE','US','USD','America/New_York','New York Stock Exchange'),
  ('NASDAQ','US','USD','America/New_York','NASDAQ')
on conflict (code) do nothing;

-- Featured India stocks (Nifty 50 heavy hitters)
insert into stocks (market, symbol, name, industry, featured) values
  ('NSE','RELIANCE','Reliance Industries','Oil & Gas / Retail',true),
  ('NSE','TCS','Tata Consultancy Services','IT Services',true),
  ('NSE','HDFCBANK','HDFC Bank','Private Banking',true),
  ('NSE','INFY','Infosys','IT Services',true),
  ('NSE','ICICIBANK','ICICI Bank','Private Banking',true),
  ('NSE','BHARTIARTL','Bharti Airtel','Telecom',true),
  ('NSE','ITC','ITC Ltd','Consumer / FMCG',true),
  ('NSE','LT','Larsen & Toubro','Infrastructure',true),
  ('NSE','HINDUNILVR','Hindustan Unilever','Consumer / FMCG',true),
  ('NSE','ASIANPAINT','Asian Paints','Chemicals / Paints',false),
  ('NSE','TITAN','Titan Company','Consumer Durables',false),
  ('NSE','PIDILITIND','Pidilite Industries','Chemicals',false),
  ('NSE','MARUTI','Maruti Suzuki','Auto',false),
  ('NSE','SUNPHARMA','Sun Pharmaceutical','Pharma',false),
  ('NSE','AXISBANK','Axis Bank','Private Banking',false)
on conflict (market, symbol) do update set featured = excluded.featured;

-- Featured US stocks
insert into stocks (market, symbol, name, industry, featured) values
  ('NASDAQ','AAPL','Apple Inc.','Consumer Electronics',true),
  ('NASDAQ','MSFT','Microsoft Corporation','Software',true),
  ('NASDAQ','NVDA','NVIDIA Corporation','Semiconductors',true),
  ('NASDAQ','GOOGL','Alphabet (Google)','Internet / Search',true),
  ('NASDAQ','AMZN','Amazon.com Inc.','E-commerce / Cloud',true),
  ('NASDAQ','META','Meta Platforms','Social Media',true),
  ('NASDAQ','TSLA','Tesla Inc.','Automotive / Energy',true),
  ('NYSE','BRK-B','Berkshire Hathaway','Conglomerate',true),
  ('NYSE','JPM','JPMorgan Chase','Banking',false),
  ('NYSE','V','Visa Inc.','Payments',false),
  ('NYSE','UNH','UnitedHealth','Healthcare',false),
  ('NYSE','JNJ','Johnson & Johnson','Healthcare',false),
  ('NASDAQ','AVGO','Broadcom','Semiconductors',false),
  ('NYSE','WMT','Walmart','Retail',false)
on conflict (market, symbol) do update set featured = excluded.featured;
