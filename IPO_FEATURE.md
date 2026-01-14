# IPO Feature - Web Scraping Implementation

## Overview
This feature scrapes IPO data from Renaissance Capital and stores it in MongoDB. No external API costs!

## Backend Files Created/Modified

### New Files:
1. **src/services/worldIpoScraper.js** - Web scraper for Renaissance Capital IPO calendar
2. **src/models/WorldIPO.js** - MongoDB model for IPO data
3. **src/controllers/ipoController.js** - API controllers for IPO endpoints
4. **src/routes/ipoRoutes.js** - Express routes for IPO API
5. **src/jobs/worldIpoCron.js** - Cron job to auto-refresh IPO data every 6 hours

### Modified Files:
- **src/index.js** - Added IPO routes and cron job initialization

## Dependencies Installed
```bash
npm install cheerio node-cron
```
(axios was already installed)

## API Endpoints

### GET /api/ipo
Get all IPOs from database
- Query params: `upcoming=true&limit=100`
- Returns: Array of IPO objects

### GET /api/ipo/:id
Get specific IPO details by MongoDB ID

### POST /api/ipo/refresh
Manually trigger scraping and refresh IPO data
- Returns: { scraped, inserted, updated }

## Auto-Refresh
- Cron job runs every 6 hours automatically
- Scrapes latest IPO data from Renaissance Capital
- Updates existing records or inserts new ones

## Data Structure
```javascript
{
  company: String,
  symbol: String,
  exchange: String,
  ipoDate: String (YYYY-MM-DD),
  priceRange: String,
  shares: String,
  estVolume: String,
  source: "RenaissanceCapital",
  sourceUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration

### Routes Added:
- `/ipo` - IPO listing page
- `/ipo/:id` - IPO details page

### Navigation:
- Added "IPO" link to header navigation

### Features:
- View all upcoming IPOs
- Manual refresh button
- Detailed IPO information
- Responsive card layout
- Dark mode support

## Deployment Steps

### 1. Push Backend Code to GitHub
```bash
cd farestockbroker-backend
git add .
git commit -m "Add IPO scraping feature"
git push origin main
```

### 2. Railway Auto-Deploy
Railway will automatically detect the changes and redeploy.

### 3. Initial Data Load
After deployment, trigger the first scrape:
```bash
curl -X POST https://farestockbroker-backend-production.up.railway.app/api/ipo/refresh
```

Or use the "Refresh Data" button in the frontend.

### 4. Deploy Frontend
Build and deploy the frontend to Netlify as usual.

## Testing Locally

### Start Backend:
```bash
cd farestockbroker-backend
npm start
```

### Start Frontend:
```bash
cd FarestockBroker-dev
npm run dev
```

### Test Scraper:
```bash
curl -X POST http://localhost:5000/api/ipo/refresh
```

### View IPOs:
```bash
curl http://localhost:5000/api/ipo
```

## Notes
- No API keys needed!
- Data updates automatically every 6 hours
- Scrapes from Renaissance Capital (public data)
- Duplicate prevention with unique index
- Clean, professional UI matching your existing design
