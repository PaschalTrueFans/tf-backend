# True Fan Backend

A production-ready Node.js TypeScript REST API backend for the True Fan platform. This backend provides a robust set of features and best practices for building scalable and maintainable fan engagement applications.

## 🚀 Features

- **TypeScript**: Built with TypeScript for type safety and better developer experience
- **Express.js**: Fast, unopinionated web framework for Node.js
- **PostgreSQL**: Robust SQL database with Knex.js as the query builder
- **Authentication**: JWT-based authentication system
- **API Documentation**: Swagger/OpenAPI documentation with swagger-ui-express
- **Security**:
  - Helmet for security headers
  - XSS protection
  - CORS enabled
  - Request sanitization
- **Development Tools**:
  - Hot reloading with Nodemon
  - ESLint and Prettier for code formatting
  - Husky for git hooks
  - EditorConfig for consistent coding styles
- **Docker Support**: Development and production Docker configurations
- **Environment Configuration**: Dotenv for environment variables
- **Logging**: Pino for efficient logging
- **Validation**: Zod for runtime type checking and validation
- **File Upload**: Support for file uploads with express-fileupload
- **AWS Integration**: S3 client for file storage

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL
- Docker (optional, for containerized development)

## 🛠️ Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🚀 Running the Application

### Development Mode

```bash
# Using npm
npm run dev

# Using Docker
npm run docker
# or
docker-compose up
```

### Production Mode

```bash
# Using Docker
npm run docker:prod
# or
docker-compose -f docker-compose.prod.yml up
```

## 📚 Available Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build the TypeScript project
- `npm start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run lintfix`: Fix linting issues
- `npm run docker`: Start development environment with Docker
- `npm run docker:prod`: Start production environment with Docker
- `npm run migrator-v1`: Run database migrations
- `npm run local-only-cleanup-database`: Clean up database (local only)

## 🏗️ Project Structure

```
├── src/
│   ├── api/          # API routes and controllers
│   ├── database/     # Database migrations and seeds
│   ├── helpers/      # Utility functions and helpers
│   ├── seeds/        # Database seed files
│   └── emailTemplates/ # Email templates
├── dist/             # Compiled JavaScript files
├── dockerfile        # Development Docker configuration
├── dockerfile.prod   # Production Docker configuration
└── docker-compose.yml # Docker services configuration
```

## 🔒 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Add other environment variables as needed
```

## 📝 API Documentation

Once the server is running, you can access the API documentation at:

```
http://localhost:3000/api-docs
```

## 💰 Creator Payout System

For detailed instructions on how to integrate the Creator Payout/Withdrawal system, see [creator_payouts_integration.md](./creator_payouts_integration.md).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Haroon - True Fan Platform
