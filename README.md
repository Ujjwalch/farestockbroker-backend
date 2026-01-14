# FarestockBroker Backend API

A Node.js/Express backend API for the FarestockBroker platform that allows users to compare stock brokers and admins to manage broker listings.

## Features

- **Broker Management**: CRUD operations for broker listings
- **Admin Authentication**: JWT-based authentication for admin users
- **Site Content Management**: Dynamic content management for the frontend
- **MongoDB Integration**: Persistent data storage with Mongoose ODM
- **Input Validation**: Request validation using express-validator
- **CORS Support**: Cross-origin resource sharing enabled

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: bcryptjs for password hashing

## Installation

1. **Clone the repository**
   ```bash
   cd farestockbrocker_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` (if exists) or use the existing `.env` file
   - Update the MongoDB URI and other environment variables as needed

4. **Seed the database** (optional)
   ```bash
   node src/services/seeder.js
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Public Endpoints

#### Brokers
- `GET /api/brokers` - Get all active brokers
- `GET /api/brokers/:id` - Get single broker by ID

#### Site Content
- `GET /api/content` - Get site content (hero, trust signals, etc.)

#### Health Check
- `GET /api/health` - API health check

### Admin Endpoints (Protected)

#### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/verify` - Verify admin token
- `POST /api/admin/logout` - Admin logout
- `POST /api/admin/create` - Create admin user (remove in production)

#### Broker Management
- `GET /api/admin/brokers` - Get all brokers (including inactive)
- `POST /api/admin/brokers` - Create new broker
- `PUT /api/admin/brokers/:id` - Update broker
- `DELETE /api/admin/brokers/:id` - Delete broker

#### Content Management
- `PUT /api/admin/content` - Update site content

## Data Models

### Broker
```javascript
{
  name: String,           // Broker name
  description: String,    // Short description
  fullDescription: String, // Detailed description
  rating: Number,         // Rating (1-5)
  reviews: Number,        // Number of reviews
  brokerage: String,      // Brokerage information
  features: [String],     // Array of features
  pros: [String],         // Array of pros
  cons: [String],         // Array of cons
  charges: [{             // Charge breakdown
    type: String,
    amount: String
  }],
  markets: [String],      // Supported markets
  founded: String,        // Founded year
  customers: String,      // Customer count
  isActive: Boolean       // Active status
}
```

### Admin
```javascript
{
  username: String,       // Unique username
  password: String,       // Hashed password
  email: String,          // Email address
  isActive: Boolean,      // Active status
  lastLogin: Date         // Last login timestamp
}
```

### Site Content
```javascript
{
  brandName: String,
  hero: {
    badge: String,
    title: String,
    titleHighlight: String,
    subtitle: String,
    primaryCTA: String,
    secondaryCTA: String
  },
  trustSignals: [{
    number: String,
    label: String
  }],
  ctaTitle: String,
  ctaSubtitle: String
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Default Admin Credentials

After running the seeder:
- **Username**: admin
- **Password**: admin123

**⚠️ Important**: Change these credentials in production!

## Environment Variables

```env
MONGO_DB_URI=your-mongodb-connection-string
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
```

## Error Handling

The API returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors (if any)
}
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Database Seeding
```bash
node src/services/seeder.js
```

### Project Structure
```
src/
├── controllers/     # Route handlers
├── middlewares/     # Custom middleware
├── models/         # Mongoose models
├── routes/         # Route definitions
├── services/       # Business logic & utilities
└── index.js        # Main application file
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Remove or protect the admin creation endpoint
4. Set up proper MongoDB indexes
5. Configure proper CORS origins
6. Set up logging and monitoring

## License

MIT License