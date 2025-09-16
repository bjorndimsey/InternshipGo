# InternshipGo

A comprehensive internship management platform built with React Native and Node.js.

## Features

- **Multi-user Registration**: Support for Students, Coordinators, and Companies
- **Secure Authentication**: Password hashing and validation
- **Database Integration**: SQLite database with proper schema
- **API Backend**: RESTful API with Express.js
- **Form Validation**: Client and server-side validation
- **Modern UI**: Beautiful, responsive design with animations

## Tech Stack

### Frontend
- React Native
- TypeScript
- Expo
- React Native Web

### Backend
- Node.js
- Express.js
- PostgreSQL
- bcryptjs (password hashing)
- Joi (validation)
- CORS
- Helmet (security)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- PostgreSQL (v12 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd InternshipGo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb internshipgo
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE internshipgo;
   \q
   ```

4. **Configure environment variables**
   Create a `.env` file in the `backend` directory:
   ```env
   NODE_ENV=development
   PORT=3001
   FRONTEND_URL=http://localhost:8081
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=internshipgo
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

5. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately
   npm run backend  # Backend only
   npm start        # Frontend only
   ```

### Backend Setup

The backend will automatically:
- Install its dependencies on first run
- Connect to PostgreSQL database
- Initialize the schema
- Start the API server on port 3001

### Frontend Setup

The frontend will start on the default Expo port (8081 for web).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile/:userId` - Get user profile

### Health Check
- `GET /health` - Server health status

## User Types

### Student
- ID Number (XXXX-XXXX format)
- Personal information (name, age, year, DOB)
- Academic information (program, major)
- Address

### Coordinator
- Personal information (name)
- Program/Course
- Phone number
- Address

### Company
- Company name
- Industry
- Address

## Database Schema

The application uses PostgreSQL with a normalized database structure:

### Base Table
```sql
users (
  id, user_type, email, password_hash,
  created_at, updated_at, is_active
)
```

### User Type Specific Tables

**Students Table:**
```sql
students (
  id, user_id, id_number, first_name, last_name,
  age, year, date_of_birth, program, major, address,
  created_at, updated_at
)
```

**Coordinators Table:**
```sql
coordinators (
  id, user_id, first_name, last_name,
  program, phone_number, address,
  created_at, updated_at
)
```

**Companies Table:**
```sql
companies (
  id, user_id, company_name, industry, address,
  created_at, updated_at
)
```

This normalized structure provides:
- Better data organization
- Improved query performance
- Easier maintenance and updates
- Clear separation of concerns

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
npm start    # Expo development server
```

## Security Features

- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- SQL injection prevention

## Error Handling

The application includes comprehensive error handling:
- Client-side form validation
- Server-side data validation
- Network error handling
- Database error handling
- User-friendly error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
