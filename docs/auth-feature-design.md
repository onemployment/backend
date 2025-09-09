# Authentication Feature Design Document

**Project**: OnEmployment Platform Backend  
**Feature**: Production-Grade Authentication System  
**Date Created**: 2025-01-07  
**Status**: Design Phase - Requirements Analysis

## Table of Contents

1. [Requirements Analysis](#requirements-analysis)
2. [User Scenarios](#user-scenarios)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Data Model Design](#data-model-design)
6. [API Design](#api-design)
7. [Security Considerations](#security-considerations)
8. [Implementation Architecture](#implementation-architecture)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Plan](#implementation-plan)

---

## Requirements Analysis

### Project Context

- **Target Audience**: Tech professionals, engineers, technical students (entry to senior level)
- **Platform Purpose**: Career management, resume building, job applications with AI-friendly data structure
- **Starting Point**: No existing user base - all users will be new users
- **User Preference**: OAuth likely to be used more often than local auth based on target audience

### Key Requirements Decisions

#### Authentication Methods

**Decision**: Support both local (email/password) and Google OAuth authentication

- **Reasoning**: Different user preferences - some prefer OAuth convenience, others prefer local control
- **Scope**: Start with Google OAuth only, add other providers (GitHub, LinkedIn, Apple) later

#### Registration Information Requirements

**Decision**: Collect full professional identity during registration

- **Required Fields**: Email, password (local only), username, firstName, lastName
- **Reasoning**: Professional platform needs complete identity upfront; avoids incomplete profiles

#### Username Strategy

**Decision**: Username required and unique for all users (both local and OAuth)

- **Reasoning**: Future social features planned; establish consistent user identity system early
- **OAuth Handling**: Ask OAuth users to choose username during registration process

#### Account Identity Rules

**Decision**:

- One account per email address
- Email and username are immutable after registration
- **Reasoning**: Simplifies account management, reduces security complexity, professional platform standard

#### Account Linking Strategy

**Decision**: Auto-link accounts when user attempts login with different method but same email

- **Example**: User registers with email, later tries Google OAuth with same email → auto-link
- **Reasoning**: Reduces user confusion, improves user experience, common pattern in professional platforms

#### Registration Flow Complexity

**Decision**: Single-step registration with all essential information

- **Local**: Email, password, username, firstName, lastName in one form
- **OAuth**: OAuth flow → form with username (required), firstName/lastName (pre-filled from OAuth, editable)
- **Reasoning**: Professional platform users expect streamlined but complete registration process

### Simplified Scope (Initial Version)

- Single OAuth provider (Google)
- No account linking user interface (auto-link only)
- No "primary login method" settings
- Defer advanced profile information to post-registration

---

## User Scenarios

### Key Technical Decisions

#### Token Expiry Strategy

**Decision**: Fixed 8-hour JWT expiry (Option 1)

- **Reasoning**: Industry standard approach for JWT implementation, simple and stateless
- **Alternatives Considered**: Sliding expiry (too complex for MVP), refresh token pattern (production-grade but overkill for initial version)

#### OAuth State Management

**Decision**: Basic state validation without Redis storage

- **Reasoning**: Sufficient security for MVP, simpler implementation, reduces dependencies
- **Security**: Still validates state parameter for CSRF protection

#### Username Case Handling

**Decision**: Case-insensitive uniqueness with preserved display case

- **Reasoning**: Follows industry standard (GitHub, LinkedIn, Twitter), prevents user confusion
- **Implementation**: Store original case, create unique index on lowercase username

#### Username Suggestions Algorithm

**Decision**: Append sequential numbers (username → username2, username3)

- **Reasoning**: Simple, predictable pattern users understand
- **Extensibility**: Design allows easy algorithm changes in future

### Detailed User Scenarios

#### Scenario 1: New User - Local Registration & Login

**Registration Flow:**

1. User visits platform, clicks "Sign Up"
2. User fills registration form: email, password, username, firstName, lastName
3. System validates all fields (real-time validation supported)
4. System creates account with passwordHash
5. System generates JWT token (8-hour expiry)
6. System returns success response with JWT token
7. User is authenticated and can access platform

**Subsequent Login Flow:**

1. User visits platform, clicks "Sign In"
2. User enters email and password
3. System validates credentials against stored passwordHash
4. System generates new JWT token (8-hour expiry)
5. System returns JWT token
6. User is authenticated

#### Scenario 2: New User - Google OAuth Registration & Login

**Registration Flow:**

1. User visits platform, clicks "Sign in with Google"
2. System generates OAuth state parameter and redirects to Google
3. User authenticates with Google and grants permissions
4. Google redirects back to callback URL with authorization code
5. System exchanges code for user profile (email, name, etc.)
6. System presents registration form with:
   - Username field (empty, user must enter)
   - firstName/lastName fields (pre-filled from Google profile, editable)
7. User enters username and optionally edits name fields
8. System validates username uniqueness and creates account
9. System stores googleId link and user data (passwordHash remains null)
10. System generates JWT token (8-hour expiry)
11. User is authenticated

**Subsequent Login Flow:**

1. User clicks "Sign in with Google"
2. OAuth flow completes, system receives user profile
3. System finds existing account by googleId
4. System generates new JWT token (8-hour expiry)
5. User is authenticated

#### Scenario 3: Local User Attempts Google OAuth (Same Email)

**Account Linking Flow:**

1. User previously registered with email/password
2. User visits platform, clicks "Sign in with Google"
3. OAuth flow completes, system receives Google profile
4. System finds existing account by email address match
5. System automatically links accounts: adds googleId to existing user record
6. System generates JWT token for existing account
7. User is authenticated to their original account
8. **Note**: Linking happens silently without user confirmation

#### Scenario 4: Google User Attempts Local Login (Same Email)

**Security-First Error Handling:**

1. User previously registered with Google OAuth (passwordHash is null)
2. User attempts email/password login with same email
3. User enters email and any password
4. System finds account by email but passwordHash is null
5. System returns standard "Invalid email or password" error
6. **Reasoning**: Prevents account enumeration attacks, maintains security

#### Scenario 5: Registration Conflicts - Email/Username

**Email Already Exists:**

1. User attempts local registration with existing email
2. System validates and finds email conflict
3. System returns error: "Email already registered. Please sign in instead"
4. User must use login instead of registration

**Username Conflict:**

1. User enters taken username during registration
2. System validates and finds username conflict
3. System returns error: "Username already taken"
4. User must choose different username

#### Scenario 6: OAuth Registration Username Conflict

**Conflict Resolution with Suggestions:**

1. User completes Google OAuth flow
2. User enters username that already exists
3. System validates and detects conflict
4. System generates suggestions using append-number algorithm
5. System returns error with suggestions: "Username taken. Try: username2, username3, username4"
6. User selects suggestion or enters different username
7. Registration completes successfully

#### Scenario 7: OAuth Flow Cancellation/Error

**Graceful Error Handling:**

1. User clicks "Sign in with Google"
2. System redirects to Google OAuth
3. User cancels permission dialog or Google returns error
4. Google redirects to callback URL with error parameters
5. System detects OAuth error condition
6. System redirects user back to login page
7. No error message displayed (user knows they cancelled)
8. User can retry or choose different authentication method

#### Scenario 8: JWT Token Expiry During Platform Use

**Session Management:**

1. User is actively using platform with valid JWT token
2. 8 hours pass since token was issued (fixed expiry)
3. User makes API request with expired token
4. System validates token and detects expiry
5. System returns 401 Unauthorized with error code "TOKEN_EXPIRED"
6. Frontend detects expired token response
7. Frontend prompts user to login again
8. User must re-authenticate to continue using platform

#### Scenario 9: Real-time Username Validation & Suggestions

**Validation Flow:**

1. User types username in registration form
2. Frontend makes debounced request to validation endpoint
3. System checks username availability (rate limited: 10 requests/minute per IP)
4. System returns availability status
5. If taken, system provides numbered suggestions
6. User can select suggestion or continue typing

**Rate Limiting Protection:**

- 10 validation requests per minute per IP address
- Prevents abuse while allowing normal user interaction
- Uses Redis for rate limiting storage (implementation detail)

---

## Functional Requirements

_What the system must do_

### Core System Capabilities

**FR-1: User Registration**

- System must allow new users to register with email and password
- System must allow new users to register via Google OAuth
- System must collect required user information during registration (email, username, firstName, lastName)
- System must create unique user accounts with proper data storage

**FR-2: User Authentication**

- System must authenticate users via email/password credentials
- System must authenticate users via Google OAuth flow
- System must generate JWT tokens upon successful authentication
- System must validate JWT tokens for accessing protected resources

**FR-3: Account Management**

- System must prevent duplicate email addresses across all accounts
- System must prevent duplicate usernames (case-insensitive)
- System must automatically link accounts when same email is used across authentication methods
- System must preserve user's original case formatting for display purposes

### Business Rules and Constraints

**BR-1: Registration Rules**

- All users must provide: email, username, firstName, lastName
- Local users must provide secure password meeting complexity requirements
- OAuth users inherit email/name from provider, must choose unique username
- Username and email become immutable after account creation

**BR-2: Authentication Rules**

- Users can authenticate using either local credentials or linked OAuth provider
- Cross-method authentication with matching email automatically links accounts
- Invalid authentication attempts return consistent error messages for security

**BR-3: Data Validation Rules**

- Email addresses must be valid format and unique across system
- Usernames must be unique (case-insensitive), contain valid characters, meet length requirements
- Passwords must meet security complexity requirements (local registration only)
- Real-time validation must be available for username and email availability

### User Authentication Capabilities

**AC-1: Multi-Method Authentication**

- System must support simultaneous local and OAuth authentication methods
- System must handle authentication method switching transparently
- System must maintain consistent user identity across authentication methods

**AC-2: Session Management**

- System must issue JWT tokens with fixed 8-hour expiration
- System must validate token expiration and return appropriate errors
- System must allow users to re-authenticate when tokens expire

**AC-3: Account Linking**

- System must automatically link OAuth accounts to existing local accounts via email matching
- System must handle cross-method authentication seamlessly
- System must maintain data integrity during account linking operations

### Data Processing Rules

**DP-1: Input Processing**

- System must validate all user inputs before processing
- System must sanitize user data to prevent injection attacks
- System must handle special characters and unicode in user data appropriately

**DP-2: Username Management**

- System must generate username suggestions when conflicts occur
- System must implement sequential numbering for username suggestions (username → username2, username3)
- System must validate username availability in real-time with rate limiting

**DP-3: OAuth Data Processing**

- System must extract required user information from OAuth provider responses
- System must handle OAuth authentication errors gracefully
- System must validate OAuth state parameters for security

### Input/Output Requirements

**IO-1: Registration Inputs**

- Local registration: email, password, username, firstName, lastName
- OAuth registration: username (user input), firstName/lastName (pre-filled, editable)
- All inputs must pass validation before account creation

**IO-2: Authentication Outputs**

- Successful authentication returns:
  - JWT token with user identification claims
  - Basic user profile information (id, email, username, firstName, lastName)
  - Success message
- Failed authentication returns standardized error messages
- Token expiration returns specific error codes for frontend handling

**IO-3: Validation Outputs**

- Real-time validation returns immediate availability status
- Username conflicts return suggested alternatives
- All errors include actionable information for users

---

## Non-Functional Requirements

_How well the system must do it_

### Performance Requirements

**PF-1: Response Time Standards**

- Authentication requests must complete within 2 seconds under normal load
- Real-time validation endpoints must respond within 500ms
- JWT token generation and validation must complete within 100ms
- OAuth callback processing must complete within 3 seconds (including external API calls)

**PF-2: Throughput Requirements**

- System must handle minimum 100 concurrent authentication requests
- Username validation endpoint must support 1000 requests per minute across all users
- System must gracefully handle authentication bursts during peak usage

**PF-3: Resource Efficiency**

- Authentication operations must not consume excessive server resources
- JWT validation must be stateless and lightweight
- Database queries must be optimized with appropriate indexing

### Security Requirements (High-Level Policies)

**SF-1: Data Protection Standards**

- All user passwords must be hashed using industry-standard algorithms (bcrypt with minimum 12 rounds)
- Personal data must be encrypted at rest and in transit (HTTPS only)
- JWT tokens must use secure signing algorithms and secrets
- System must comply with data protection standards for personal information handling

**SF-2: Authentication Security**

- System must implement protection against brute force attacks via rate limiting
- OAuth flows must implement state parameter validation to prevent CSRF attacks
- Invalid authentication attempts must not reveal account existence information
- System must implement secure password complexity requirements

**SF-3: Session Security**

- JWT tokens must have reasonable expiration times to limit exposure
- System must prevent token replay attacks through proper validation
- Sensitive authentication endpoints must be protected against automated attacks
- System must sanitize all user inputs to prevent injection attacks

### Scalability Requirements

**SC-1: Launch-Ready Scaling**

- System must support initial user base of up to 1,000 registered users
- Authentication system must not contain architectural bottlenecks that prevent future scaling
- Database design must support horizontal scaling patterns when needed
- System must use stateless authentication to enable future load balancing

**SC-2: Growth Accommodation**

- Authentication components must be designed to scale independently
- System must avoid anti-patterns that would require major refactoring for growth
- Code architecture must support addition of new authentication providers without major changes

### Reliability Requirements

**RL-1: System Availability**

- Authentication system must have 99.5% uptime during business hours
- System must gracefully handle external service failures (Google OAuth outages)
- Authentication failures must not impact other platform functionality
- System must implement proper error handling and logging for troubleshooting

**RL-2: Data Integrity**

- User account data must be protected against corruption or loss
- Account linking operations must be atomic and consistent
- System must prevent duplicate account creation under concurrent conditions
- Database operations must maintain referential integrity

**RL-3: Fault Tolerance**

- System must handle network timeouts and external API failures gracefully
- Authentication must continue functioning if non-critical services are unavailable
- System must implement retry mechanisms for transient failures
- Error conditions must not expose sensitive system information

### Usability Requirements

**UX-1: User Experience Standards**

- Registration process must be completable within 2 minutes for average users
- Error messages must be clear, actionable, and user-friendly
- Authentication flows must follow familiar web patterns and conventions
- System must provide immediate feedback for user actions (validation, loading states)

**UX-2: Accessibility and Compatibility**

- Authentication system must work with standard web browsers and HTTP clients
- API responses must be consistent and well-structured for frontend integration
- System must support both web application and potential mobile application usage
- Error handling must be predictable and documentable for frontend developers

**UX-3: Professional Platform Standards**

- Authentication flows must reflect professional platform expectations
- User data collection must feel appropriate for career management context
- Security measures must be transparent without being intrusive
- System must support future integration with professional networking features

### Audit Trail Requirements

**AF-1: Security and Compliance Tracking**

- System must track account creation method for security analysis
- System must record password change timestamps for security monitoring
- System must maintain login activity tracking for user insights
- System must preserve user modification history for compliance

---

## Data Model Design

_Database schema and data relationships_

### Enhanced User Entity Structure

```prisma
model User {
  // Primary identifier
  id           String   @id @default(uuid())

  // Authentication fields
  email        String   @unique @db.VarChar(255)
  username     String   @unique @db.VarChar(50)
  passwordHash String?  @db.VarChar(255) // nullable for OAuth-only users

  // Personal information
  firstName    String   @db.VarChar(100)
  lastName     String   @db.VarChar(100)
  displayName  String?  @db.VarChar(200) // optional, set post-registration

  // OAuth provider linking
  googleId     String?  @unique @db.VarChar(255)

  // Account status
  emailVerified Boolean  @default(false)
  isActive      Boolean  @default(true)

  // Audit trail fields
  accountCreationMethod String  @db.VarChar(20) // "local" or "google"
  lastPasswordChange    DateTime?

  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastLoginAt  DateTime?

  // Performance indexes
  @@index([email], name: "user_email_idx")
  @@index([username], name: "user_username_idx")
  @@index([LOWER(username)], name: "user_username_lower_idx")
  @@index([createdAt], name: "user_created_at_idx")
  @@index([lastLoginAt], name: "user_last_login_idx")
  @@index([isActive], name: "user_active_idx")
  @@index([accountCreationMethod], name: "user_creation_method_idx")

  @@map("users")
}
```

### Data Types and Constraints

**Field Specifications:**

- `id`: UUID primary key for security and scalability
- `email`: VARCHAR(255) with unique constraint, case-sensitive storage
- `username`: VARCHAR(50) with unique constraint, case-preserving display
- `passwordHash`: VARCHAR(255) nullable for OAuth-only accounts
- `firstName/lastName`: VARCHAR(100) to handle international names
- `displayName`: VARCHAR(200) optional field, set after registration for social features
- `googleId`: VARCHAR(255) nullable, unique constraint for OAuth linking
- `emailVerified`: Boolean flag for future email verification feature
- `isActive`: Boolean for soft account deactivation capability
- `accountCreationMethod`: VARCHAR(20) tracks registration method ("local"/"google")
- `lastPasswordChange`: DateTime for security audit trail

**Username Validation Rules (GitHub Pattern):**

- **Allowed Characters**: Alphanumeric (a-z, A-Z, 0-9) and hyphens (-)
- **Rules**: Cannot start/end with hyphen, no consecutive hyphens, 1-39 characters
- **Validation Regex**: `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`
- **Uniqueness**: Case-insensitive via `LOWER(username)` index

### Database Indexes and Performance

**Primary Indexes:**

- `user_email_idx`: Fast email-based lookups for login
- `user_username_idx`: Fast username-based lookups
- `user_username_lower_idx`: Case-insensitive username uniqueness
- `user_created_at_idx`: User registration analytics
- `user_last_login_idx`: Activity tracking and cleanup
- `user_active_idx`: Filter active users efficiently
- `user_creation_method_idx`: Registration method analytics

**Query Optimization:**

- Email and username lookups use dedicated indexes
- Case-insensitive username searches via LOWER() index
- Active user filtering prevents scanning deactivated accounts
- Timestamp indexes support analytics and cleanup operations

### Migration Strategy

**Current State**: Test users exist in production database
**Migration Approach**: Destructive migration (wipe and recreate)

**Rationale**:

- Only test users exist (acceptable data loss)
- Cleaner than complex data migration
- Ensures proper schema from day one
- Eliminates legacy data inconsistencies

**Migration Steps:**

```sql
-- Step 1: Drop existing users table
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create new users table with complete schema
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  google_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  account_creation_method VARCHAR(20) NOT NULL,
  last_password_change TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Step 3: Add constraints
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);

-- Step 4: Create performance indexes
CREATE INDEX user_email_idx ON users(email);
CREATE INDEX user_username_idx ON users(username);
CREATE UNIQUE INDEX user_username_lower_idx ON users(LOWER(username));
CREATE INDEX user_created_at_idx ON users(created_at);
CREATE INDEX user_last_login_idx ON users(last_login_at);
CREATE INDEX user_active_idx ON users(is_active);
CREATE INDEX user_creation_method_idx ON users(account_creation_method);
```

### Future Extension Points

**Designed for Growth:**

- Schema supports multiple OAuth providers (add fields like `githubId`, `linkedinId`)
- Audit trail fields enable security monitoring and compliance
- displayName field supports future social features
- Soft deletion via `isActive` preserves data integrity
- UUID primary keys support distributed systems and data portability

**Optional Extensions (Not Implemented Initially):**

```prisma
// Multiple OAuth providers table (when needed)
model OAuthAccount {
  id         String @id @default(uuid())
  userId     String
  provider   String // "google", "github", "linkedin"
  providerId String
  user User @relation(fields: [userId], references: [id])
  @@unique([provider, providerId])
}

// Session management table (if stateful sessions needed)
model UserSession {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  user User @relation(fields: [userId], references: [id])
}
```

---

## API Design

_Technical implementation details_

### REST Endpoint Specifications

#### Authentication Endpoints (/auth)

_Handles login, logout, and OAuth flows only_

```
POST /auth/login                    - Local user login (email/password)
POST /auth/logout                   - User logout (optional JWT blacklisting)
GET  /auth/google                   - Initiate Google OAuth flow
GET  /auth/google/callback          - Handle Google OAuth callback
```

#### User Management Endpoints (/user)

_Handles user creation, profiles, and validation_

**User Creation:**

```
POST /user                          - Create new local user (registration)
POST /user/complete-oauth           - Complete OAuth user creation (after callback)
```

**User Profile Management:**

```
GET  /user/me                       - Get current authenticated user profile
PUT  /user/me                       - Update current user profile (displayName, etc.)
```

**User Validation & Utilities:**

```
GET  /user/validate/username        - Check username availability
GET  /user/validate/email           - Check email availability
GET  /user/suggest-usernames        - Get username suggestions for conflicts
```

### Request/Response Schemas

#### Authentication Endpoints

**POST /auth/login**

```typescript
// Request
{
  email: string; // Required, valid email format
  password: string; // Required, min 8 chars with complexity
}

// Response (Success - 200)
{
  message: 'Login successful';
  token: string; // JWT token
  user: {
    id: string; // UUID
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    emailVerified: boolean;
    createdAt: string; // ISO 8601 timestamp
    lastLoginAt: string | null;
  }
}

// Response (Error - 401)
{
  error: 'INVALID_CREDENTIALS';
  message: 'Invalid email or password';
}
```

**GET /auth/google/callback**

```typescript
// Response - Existing User (200)
{
  message: 'Login successful';
  token: string; // JWT token
  user: {
    /* Complete user object */
  }
}

// Response - New User (200)
{
  message: 'Complete registration required';
  temporaryToken: string; // Short-lived token for registration completion
  profileData: {
    email: string; // From Google
    firstName: string; // From Google
    lastName: string; // From Google
  }
}
```

#### User Management Endpoints

**POST /user** (Local Registration)

```typescript
// Request
{
  email: string; // Required, valid email, unique
  password: string; // Required, min 8 chars with complexity
  username: string; // Required, 1-39 chars, GitHub pattern
  firstName: string; // Required, 1-100 chars
  lastName: string; // Required, 1-100 chars
}

// Response (Success - 201)
{
  message: 'User created successfully';
  token: string; // JWT token
  user: {
    /* Complete user object */
  }
}
```

**POST /user/complete-oauth**

```typescript
// Request
{
  temporaryToken: string; // From OAuth callback
  username: string; // Required, user-chosen username
  firstName: string; // Pre-filled, user can edit
  lastName: string; // Pre-filled, user can edit
}

// Response (Success - 201)
{
  message: 'Registration completed successfully';
  token: string; // JWT token
  user: {
    /* Complete user object */
  }
}
```

**PUT /user/me**

```typescript
// Request
{
  firstName?: string;     // Optional, 1-100 chars
  lastName?: string;      // Optional, 1-100 chars
  displayName?: string;   // Optional, 1-200 chars or null
}

// Response (Success - 200)
{
  message: "Profile updated successfully";
  user: { /* Complete updated user object */ }
}
```

#### Validation Endpoints

**GET /user/validate/username?username={value}**

```typescript
// Response (Available - 200)
{
  available: true;
  message: "Username is available";
}

// Response (Taken - 200)
{
  available: false;
  message: "Username is taken";
  suggestions: string[];  // ["username2", "username3", "username4"]
}
```

### Validation Rules

#### Master Field Validation Rules

_Applied consistently across all endpoints_

**Email Field:**

```typescript
email: {
  required: true,
  type: "string",
  format: "email",
  minLength: 3,
  maxLength: 255,
  sanitize: true,
  transform: "toLowerCase",
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
}
```

**Password Field:**

```typescript
password: {
  required: true,
  type: "string",
  minLength: 8,
  maxLength: 100,
  sanitize: true,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, // At least one lowercase, uppercase, digit
  noCommonPasswords: true,
  noPersonalInfo: true
}
```

**Username Field:**

```typescript
username: {
  required: true,
  type: "string",
  minLength: 1,
  maxLength: 39,
  sanitize: true,
  pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, // GitHub pattern
  transform: "trim",
  reserved: ["admin", "api", "www", "mail", "ftp", "root", "support", "help", "blog"]
}
```

**Name Fields (firstName, lastName):**

```typescript
name: {
  required: true, // false in profile updates
  type: "string",
  minLength: 1,
  maxLength: 100,
  sanitize: true,
  pattern: /^[a-zA-Z\s\-'\.]+$/, // Letters, spaces, hyphens, apostrophes, dots
  transform: "trim"
}
```

**Display Name Field:**

```typescript
displayName: {
  required: false,
  type: "string",
  minLength: 1,
  maxLength: 200,
  sanitize: true,
  pattern: /^[a-zA-Z0-9\s\-_\.]+$/,
  transform: "trim",
  allowNull: true
}
```

#### Business Logic Validation

**Uniqueness Constraints:**

- Email must be unique across all users
- Username must be unique (case-insensitive)
- GoogleId must be unique when present

**Security Validation:**

- All inputs sanitized to prevent XSS attacks
- Parameterized queries to prevent SQL injection
- JWT signature validation with HS256 algorithm
- OAuth state parameter CSRF validation

**Rate Limiting Rules:**

```typescript
{
  authentication: "5 login attempts per minute per IP",
  registration: "3 registrations per hour per IP",
  validation: "10 validation requests per minute per IP",
  suggestions: "5 suggestion requests per minute per IP",
  global: "1000 requests per hour per IP"
}
```

#### Common Error Response Formats

**Authentication Error (401):**

```typescript
{
  error: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN';
  message: string;
}
```

**Validation Error (400):**

```typescript
{
  error: 'VALIDATION_ERROR';
  message: 'Invalid request data';
  details: {
    field: string; // Field name that failed
    message: string; // Specific validation error
  }
  [];
}
```

**Conflict Error (409):**

```typescript
{
  error: "EMAIL_TAKEN" | "USERNAME_TAKEN";
  message: string;
  suggestions?: string[];  // Only for USERNAME_TAKEN
}
```

**Rate Limit Error (429):**

```typescript
{
  error: 'RATE_LIMIT_EXCEEDED';
  message: 'Too many requests';
  retryAfter: number; // Seconds until retry allowed
}
```

---

## Security Considerations

_Security implementation details_

### Authentication Security Measures

#### JWT Token Security

```typescript
{
  algorithm: "HS256",                    // HMAC SHA-256 for symmetric signing
  secretManagement: {
    source: "environment variable",       // JWT_SECRET from .env
    minLength: 64,                       // 512-bit minimum secret length
    rotation: "manual",                   // Secret rotation strategy
    fallbackSecret: false               // Single secret for simplicity
  },
  tokenStructure: {
    issuer: "onemployment-auth",         // iss claim validation
    audience: "onemployment-api",        // aud claim validation
    expiration: "8 hours",               // Fixed expiry time
    clockTolerance: "30 seconds"         // Allow clock skew
  },
  claims: {
    required: ["sub", "email", "username", "iat", "exp"],
    forbidden: ["password", "passwordHash", "sensitive_data"]
  }
}
```

#### Password Security

```typescript
{
  hashing: {
    algorithm: "bcrypt",                 // Industry standard
    saltRounds: 12,                      // Minimum for production
    noPlaintext: "Never store plain passwords",
    timing: "Constant-time comparison for login"
  },
  complexity: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    forbidCommon: ["123456", "password", "qwerty", "admin"],
    forbidPersonal: "No username/email in password"
  },
  storage: {
    field: "passwordHash",
    nullable: true,                      // For OAuth-only accounts
    noLogging: "Never log password hashes"
  }
}
```

#### OAuth Security

```typescript
{
  googleOAuth: {
    flow: "authorization_code",          // Standard OAuth 2.0 flow
    pkce: false,                         // Not required for server-side
    state: {
      required: true,                    // CSRF protection
      length: 32,                        // 256-bit randomness
      format: "base64url",               // URL-safe encoding
      expiry: "10 minutes"               // Short-lived state
    },
    scopes: ["openid", "email", "profile"], // Minimal required scopes
    redirectUri: {
      whitelist: true,                   // Only allowed redirect URIs
      https: true                        // HTTPS only in production
    }
  },
  tokenValidation: {
    googleIdToken: true,                 // Verify Google ID token
    audience: "verify aud claim",        // Must match client ID
    issuer: "accounts.google.com",       // Expected issuer
    expiry: "validate exp claim"         // Token not expired
  }
}
```

### Authorization Mechanisms

#### Route Protection

```typescript
{
  publicRoutes: [
    "/auth/login",
    "/auth/google",
    "/auth/google/callback",
    "/user",                             // Registration
    "/user/validate/*",                  // Validation endpoints
    "/user/suggest-usernames"
  ],
  protectedRoutes: {
    "/user/me": "JWT required",
    "/user/complete-oauth": "Temporary OAuth token required",
    "/auth/logout": "JWT required"
  },
  middlewareChain: [
    "CORS validation",
    "Rate limiting",
    "JWT validation (if required)",
    "User extraction from token",
    "Route handler"
  ]
}
```

#### User Authorization

```typescript
{
  selfService: {
    principle: "Users can only access/modify their own data",
    implementation: "Extract user ID from JWT, compare with resource owner",
    routes: ["/user/me PUT", "/user/me GET", "/auth/logout"]
  },
  noRoleBasedAccess: "Single user role for MVP",
  futureConsideration: "Admin roles, user roles for later features"
}
```

### Data Protection Strategies

#### Data Encryption

```typescript
{
  inTransit: {
    protocol: "HTTPS only",              // TLS 1.2+ required
    hsts: true,                          // HTTP Strict Transport Security
    redirectHttp: true,                  // Auto-redirect HTTP to HTTPS
    certificate: "Valid SSL certificate"
  },
  atRest: {
    database: "PostgreSQL encryption at rest (AWS RDS)",
    passwords: "bcrypt hashing with salt",
    sessions: "Redis encryption (if used)",
    files: "Not applicable for auth service"
  },
  inMemory: {
    noPlaintextPasswords: true,
    limitedTokenLifetime: true,
    secureClearance: "Clear sensitive data after use"
  }
}
```

#### Personal Data Protection

```typescript
{
  dataMinimization: {
    collectOnlyNecessary: true,
    noUnnecessaryFields: true,
    limitedRetention: "User data kept until account deletion"
  },
  dataClassification: {
    publicData: ["username", "displayName"],
    personalData: ["email", "firstName", "lastName"],
    sensitiveData: ["passwordHash", "googleId"],
    auditData: ["lastLoginAt", "accountCreationMethod"]
  },
  accessControl: {
    selfAccessOnly: true,
    noDataSharing: true,
    limitedLogging: "No personal data in application logs"
  }
}
```

### Attack Prevention Methods

#### Input Validation & Sanitization

```typescript
{
  xssProtection: {
    sanitizeHtml: true,                  // Strip HTML tags
    encodeOutput: true,                  // Encode special characters
    cspHeaders: "Content Security Policy headers",
    noScriptExecution: "Block javascript: protocol"
  },
  sqlInjectionPrevention: {
    parameterizedQueries: true,          // Prisma ORM protection
    noRawQueries: true,                  // Avoid raw SQL
    inputValidation: true,               // Validate before database calls
    ormProtection: "Prisma provides built-in protection"
  },
  csrfProtection: {
    oauthState: true,                    // State parameter for OAuth
    tokenBasedAuth: "JWT tokens are CSRF-resistant",
    sameSiteCookies: "If cookies used in future"
  }
}
```

#### Rate Limiting & Abuse Prevention

```typescript
{
  rateLimiting: {
    implementation: "Redis-based rate limiting",
    rules: {
      global: "1000 requests/hour per IP",
      authentication: "5 login attempts/minute per IP",
      registration: "3 registrations/hour per IP",
      validation: "10 validation requests/minute per IP",
      oauth: "10 OAuth attempts/minute per IP"
    },
    backoffStrategy: "Exponential backoff for repeated failures",
    whitelisting: "Option to whitelist trusted IPs"
  },
  bruteForceProtection: {
    loginAttempts: "Track failed attempts per email/IP",
    accountLockout: "Consider temporary lockout after failures",
    monitoring: "Log and alert on brute force patterns"
  }
}
```

#### Session & Token Security

```typescript
{
  tokenManagement: {
    noTokenStorage: "Stateless JWT approach",
    shortLifetime: "8-hour expiry reduces exposure",
    secureGeneration: "Cryptographically secure random secrets",
    noTokenInLogs: "Never log JWT tokens or secrets"
  },
  sessionSecurity: {
    noServerSideSessions: "JWT-based stateless authentication",
    clientStorage: "Recommend httpOnly cookies for web clients",
    mobileStorage: "Secure keychain/keystore for mobile"
  }
}
```

### Infrastructure Security

#### Environment Security

```typescript
{
  secrets: {
    environmentVariables: true,          // All secrets in .env
    noHardcodedSecrets: true,            // No secrets in code
    productionSecrets: "AWS Secrets Manager or similar",
    localDevelopment: ".env.local files"
  },
  cors: {
    strictOrigins: true,                 // Only allow specific origins
    credentials: true,                   // Allow credentials in CORS
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers: ["Content-Type", "Authorization"]
  },
  headers: {
    helmet: true,                        // Security headers middleware
    hsts: true,                          // HTTP Strict Transport Security
    nosniff: true,                       // X-Content-Type-Options
    frameOptions: "DENY",                // X-Frame-Options
    xss: "1; mode=block"                 // X-XSS-Protection
  }
}
```

#### Logging & Monitoring

```typescript
{
  securityLogging: {
    auditTrail: [
      "Login attempts (success/failure)",
      "Registration attempts",
      "Password changes",
      "OAuth authentications",
      "Rate limit violations",
      "Validation errors"
    ],
    noSensitiveData: "No passwords, tokens, or personal data in logs",
    structuredLogging: "JSON format with Pino",
    logRetention: "30 days minimum"
  },
  monitoring: {
    failedLogins: "Alert on unusual patterns",
    rateLimitHits: "Monitor for abuse",
    errorRates: "Track application errors",
    responseTimes: "Performance monitoring"
  }
}
```

### Compliance Requirements

#### Data Privacy Compliance

```typescript
{
  gdprConsiderations: {
    dataMinimization: true,              // Collect only necessary data
    consentBasis: "Service provision",   // Legal basis for processing
    rightToErasure: "Account deletion capability",
    dataPortability: "User can export their data"
  },
  dataRetention: {
    activeAccounts: "Retain while account active",
    deletedAccounts: "Purge within 30 days",
    auditLogs: "Retain 1 year for security",
    backups: "Consistent with retention policy"
  }
}
```

#### Security Standards Compliance

```typescript
{
  owasp: {
    top10: "Address OWASP Top 10 vulnerabilities",
    injection: "Parameterized queries, input validation",
    brokenAuth: "Strong authentication, session management",
    sensitiveData: "Encryption, secure storage",
    xxe: "Not applicable (no XML processing)",
    brokenAccess: "Proper authorization checks",
    securityMisconfig: "Secure defaults, regular updates",
    xss: "Input sanitization, output encoding",
    deserializationAttacks: "Safe JSON parsing only",
    knownVulnerabilities: "Regular dependency updates",
    logging: "Comprehensive security logging"
  }
}

---

## Implementation Architecture
*Technical architecture and design patterns*

### Component Structure and Responsibilities

#### File Structure
```

src/api/auth/
├── auth.controller.ts # /auth/\* endpoints
├── auth.service.ts # Authentication business logic
├── auth.repository.ts # Auth-specific user queries
├── auth.schema.ts # Auth request/response schemas
├── utils/
│ ├── jwt.util.ts # JWT token utilities
│ └── oauth.util.ts # OAuth helper functions
├── strategies/
│ └── BcryptStrategy.ts # Existing password strategy
├── **tests**/ # Auth tests
└── index.ts # Auth routes definition

src/api/user/
├── user.controller.ts # /user/\* endpoints  
├── user.service.ts # User management business logic
├── user.repository.ts # User-specific queries
├── user.schema.ts # User profile schemas
├── utils/
│ ├── validation.util.ts # Input validation helpers
│ └── username-suggestions.util.ts
├── **tests**/ # User tests
└── index.ts # User routes definition

````

#### Auth Domain Components

**AuthController**
- Handle HTTP requests/responses for /auth/* endpoints
- Validate request schemas (using Zod)
- Call AuthService for business logic
- Return standardized response formats
- Handle middleware integration (rate limiting, CORS)

**AuthService**
- Authentication business logic
- Coordinate between repositories
- Generate JWT tokens
- Handle account linking logic
- Password verification using strategies

**AuthRepository**
- Authentication-related database queries
- User lookups for login scenarios
- Account linking data operations
- Login activity tracking

#### User Domain Components

**UserController**
- Handle HTTP requests/responses for /user/* endpoints
- Validate request schemas (using Zod)
- Call UserService for business logic
- Return standardized response formats
- Handle authentication middleware

**UserService**
- User management business logic
- Registration orchestration
- Profile update logic
- Validation coordination
- Cross-repository operations when needed

**UserRepository**
- User management database queries
- Profile operations
- Validation queries
- User creation (OAuth scenarios)

#### Utility Components

**JWT Util (auth/utils/jwt.util.ts)**
- JWT token generation and validation
- Token payload extraction
- Secret management

**OAuth Util (auth/utils/oauth.util.ts)**
- Google OAuth URL generation
- State parameter creation/validation
- OAuth token exchange
- Profile data extraction

**Validation Util (user/utils/validation.util.ts)**
- Username/email format validation
- Input sanitization
- Reserved username checking

**Username Suggestions Util (user/utils/username-suggestions.util.ts)**
- Generate username alternatives
- Apply numbering strategy
- Check availability of suggestions

#### Cross-Domain Interactions
- AuthService can use UserRepository when needed (OAuth account creation)
- UserService can use AuthRepository when needed (account linking scenarios)

### Design Patterns and Principles

#### Core Design Patterns

**Layered Architecture Pattern**
```typescript
// Clean separation of concerns:
// Controllers: HTTP handling, validation, response formatting
// Services: Business logic, orchestration, cross-domain coordination
// Repositories: Data access, database queries
// Utils: Stateless helper functions

AuthController → AuthService → AuthRepository → Database
UserController → UserService → UserRepository → Database
````

**Dependency Injection Pattern**

```typescript
// Manual constructor injection (existing pattern)
class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly passwordStrategy: IPasswordStrategy
  ) {}
}
```

**Strategy Pattern (Existing)**

```typescript
// Already implemented for password hashing
interface IPasswordStrategy {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

class BcryptStrategy implements IPasswordStrategy {
  // Implementation - extensible for future strategies
}
```

**Repository Pattern**

```typescript
// Interface-based repositories for testability
interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
}

class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}
}
```

#### SOLID Principles Application

**Single Responsibility Principle (SRP)**

- Each class has one reason to change
- AuthController: HTTP handling only
- AuthService: Authentication business logic only
- AuthRepository: Data access only
- Utilities: Specific helper functions only

**Open/Closed Principle (OCP)**

- Open for extension via interfaces (IPasswordStrategy)
- Closed for modification of existing implementations
- Can add new auth strategies without changing existing code

**Liskov Substitution Principle (LSP)**

- Implementations can be substituted without breaking functionality
- Mock repositories work seamlessly in tests

**Interface Segregation Principle (ISP)**

- Services depend only on methods they need
- Focused interfaces prevent unnecessary dependencies

**Dependency Inversion Principle (DIP)**

- Depend on abstractions (interfaces), not concretions
- High-level modules don't depend on low-level modules

#### Error Handling Patterns

**Existing Error System (Maintain Current Approach)**

```typescript
// Current error hierarchy - extend as needed
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Username already exists') {
    super(409, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Invalid credentials') {
    super(401, message);
  }
}

// Additional errors for new functionality:
export class ValidationError extends HttpError {
  constructor(message = 'Invalid request data') {
    super(400, message);
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too many requests') {
    super(429, message);
  }
}
```

**Centralized Error Handling (Existing Pattern)**

```typescript
// Current error handler middleware - works with new errors
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof HttpError) {
    const response: ErrorResponse = { message: err.message };
    return res.status(err.status).json(response);
  }

  logger.error('Unhandled error', { err });
  const response: ErrorResponse = { message: 'Internal Server Error' };
  return res.status(500).json(response);
};
```

#### Validation Patterns

**Request Validation Only (Remove Response Validation)**

```typescript
// Current approach validates responses - remove this
private validateResponse<T>(schema: ZodType<T>, data: unknown): T {
  // Remove this method - unnecessary if we construct responses properly
}

// Improved approach - construct responses using schema classes
class AuthController {
  public loginUser = async (req: Request, res: Response): Promise<void> => {
    const data = req.body as LoginRequest; // Zod validates on middleware level
    const user = await this.authService.loginUser(data);

    // Construct response object directly - no validation needed
    const response: LoginResponse = {
      message: 'Login successful',
      token: user.token,
      user: user.profile
    };

    res.status(200).json(response);
  };
}
```

**Schema-First Validation**

```typescript
// Zod schemas define the contract for requests only
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Controllers validate requests, construct responses directly
// No need to validate responses if constructed properly
```

#### Async/Await Patterns

**Consistent Promise Handling**

```typescript
// All async operations use async/await (no callbacks)
class AuthService {
  async authenticateLocal(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await this.passwordStrategy.verify(
      password,
      user.passwordHash!
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = await this.generateJWT(user);
    await this.authRepository.updateLastLogin(user.id);

    return { user, token };
  }
}
```

### Technology Integration Approach

#### Existing Backend Infrastructure Integration

- Express.js framework integration with existing route patterns
- Prisma ORM integration for database operations
- Redis integration for rate limiting and session storage
- Current middleware patterns (CORS, Helmet, error handling)
- Pino structured logging integration

#### Validation and Type Safety Integration

- Zod schema definition patterns and organization
- Request validation middleware integration
- Error handling integration with existing HttpError system
- Type inference from Zod schemas for TypeScript
- Custom validation rules (username patterns, reserved words, etc.)
- Real-time validation endpoint schemas
- Integration with existing validation utilities

#### Security Stack Integration

- bcrypt integration with existing password strategies (BcryptStrategy)
- JWT token integration with existing auth middleware
- Rate limiting with Redis backend
- Helmet security headers middleware
- CORS configuration for authentication endpoints

#### Database Integration

- PostgreSQL with Prisma schema updates
- Migration strategy from existing user table structure
- Index optimization for authentication queries
- Connection pooling and transaction management

#### External Service Integration

- Google OAuth 2.0 API integration
- Future OAuth providers (GitHub, LinkedIn)
- Email services for future verification features
- External API error handling and retry mechanisms

#### Testing Integration

- Jest testing framework integration
- Mock strategies for external services (Google OAuth, Redis)
- Integration testing with Testcontainers
- Unit testing patterns for services and repositories

#### Development and Production Integration

- Docker Compose development environment
- AWS ECS/Fargate production deployment
- Environment variable management
- Health check endpoints integration
- Graceful shutdown handling

---

## Testing Strategy

_Comprehensive testing approach_

### Current Testing Infrastructure

#### Testing Framework & Tools

- **Jest** - Primary testing framework with TypeScript support (ts-jest)
- **Supertest** - HTTP endpoint testing for API integration
- **Jest Mock Extended** - Advanced mocking capabilities for dependencies
- **Testcontainers** - Real database integration testing (PostgreSQL)
- **Separate Test Configurations** - Independent unit and integration test suites

#### Test Structure Organization

- **Unit Tests**: `src/**/__tests__/` - Isolated component testing with mocked dependencies
- **Integration Tests**: `test/integration/` - End-to-end API testing with real database
- **Test Commands**: Separate execution (`test:unit`, `test:int`) with watch modes
- **Coverage Reporting**: Available via `npm run test:coverage`

### Unit Testing Requirements

#### Coverage Strategy (1-1 with source files)

Each TypeScript source file requires corresponding unit test with all dependencies mocked:

**Authentication Domain Tests:**

```typescript
// Existing (maintain current patterns)
src/api/auth/auth.controller.ts     → auth.controller.test.ts ✅
src/api/auth/auth.service.ts        → auth.service.test.ts ✅
src/api/auth/auth.repository.ts     → auth.repository.test.ts ✅

// New tests required
src/api/auth/auth.schema.ts         → auth.schema.test.ts
```

**User Domain Tests:**

```typescript
src/api/user/user.controller.ts     → user.controller.test.ts
src/api/user/user.service.ts        → user.service.test.ts
src/api/user/user.repository.ts     → user.repository.test.ts
src/api/user/user.schema.ts         → user.schema.test.ts
```

**Utility Component Tests:**

```typescript
src/api/auth/utils/jwt.util.ts                    → jwt.util.test.ts
src/api/auth/utils/oauth.util.ts                  → oauth.util.test.ts
src/api/user/utils/validation.util.ts             → validation.util.test.ts
src/api/user/utils/username-suggestions.util.ts  → username-suggestions.util.test.ts
```

#### Unit Test Patterns (Existing Framework)

```typescript
// Controller Test Pattern
describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<IAuthService>;

  beforeEach(() => {
    mockAuthService = {
      registerUser: jest.fn(),
      loginUser: jest.fn(),
    };
    authController = new AuthController(mockAuthService);
  });

  it('should handle successful registration', async () => {
    mockAuthService.registerUser.mockResolvedValue(/* expected result */);
    // Test implementation
  });
});
```

#### Mocking Strategy (Consistent with Current Approach)

- **External Dependencies**: Mock Prisma client, Redis client, external APIs
- **Internal Dependencies**: Mock services in controllers, repositories in services
- **Utility Functions**: Mock complex utilities, test simple utilities directly
- **Strategy Pattern**: Mock password strategies, OAuth utilities

### Integration Testing Requirements

#### Functional Requirements Mapping (1-1 coverage)

Each functional requirement maps to specific integration test scenarios using real data:

**FR-1: User Registration**

```typescript
describe('User Registration Integration', () => {
  // Local registration with email/password
  it('should register local user with complete profile data');
  it('should validate email uniqueness across system');
  it('should enforce username uniqueness (case-insensitive)');
  it('should hash passwords using bcrypt strategy');
  it('should validate input schemas with Zod');

  // OAuth registration flow
  it('should handle Google OAuth registration with username selection');
  it('should pre-fill profile data from OAuth provider');
  it('should generate username suggestions on conflict');
});
```

**FR-2: User Authentication**

```typescript
describe('User Authentication Integration', () => {
  // Local authentication
  it('should authenticate with email/password credentials');
  it('should generate JWT tokens with proper claims');
  it('should validate password against stored hash');
  it('should handle invalid credentials gracefully');

  // OAuth authentication
  it('should authenticate via Google OAuth flow');
  it('should validate OAuth state parameters');
  it('should handle OAuth callback processing');
});
```

**FR-3: Account Management**

```typescript
describe('Account Management Integration', () => {
  // Account linking
  it('should auto-link OAuth account to existing email');
  it('should link local account when OAuth attempted with same email');
  it('should maintain data integrity during linking');

  // Profile management
  it('should update user profile data');
  it('should preserve immutable fields (email, username)');
});
```

#### Integration Test Infrastructure (Testcontainers Pattern)

```typescript
// Current pattern - extend for auth features
describe('Authentication Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithPostgres.prismaClient);
    app = testSetup.app;
  });

  // Use real database, real Redis, real HTTP requests
  // Mock only external services (Google OAuth API)
});
```

### Acceptance Testing Requirements

#### User Scenarios Mapping (1-1 coverage)

Each documented user scenario requires corresponding acceptance test:

**Scenario 1: New User - Local Registration & Login**

```typescript
describe('Local User Registration and Login Flow', () => {
  it('should complete full registration to login workflow');
  it('should validate all required fields in registration');
  it('should generate JWT token with 8-hour expiry');
  it('should authenticate successfully on subsequent login');
});
```

**Scenario 2: New User - Google OAuth Registration & Login**

```typescript
describe('OAuth User Registration and Login Flow', () => {
  it('should complete OAuth registration with username selection');
  it('should pre-fill profile from Google OAuth data');
  it('should authenticate with OAuth on subsequent visits');
});
```

**Scenario 3: Local User Attempts Google OAuth (Account Linking)**

```typescript
describe('Account Linking Scenarios', () => {
  it('should automatically link OAuth to existing email account');
  it('should maintain user data integrity during linking');
  it('should enable dual authentication methods post-linking');
});
```

**Scenario 4-9: Additional Scenarios**

- Google user attempts local login (security handling)
- Registration conflicts and username suggestions
- OAuth flow cancellation/error handling
- JWT token expiry and re-authentication
- Real-time validation with rate limiting

### Test Automation Framework

#### Test Execution Strategy

```bash
# Current command structure - maintain consistency
npm run test:unit          # Unit tests only (mocked dependencies)
npm run test:int           # Integration tests (real database)
npm run test              # Full test suite (unit + integration)
npm run test:coverage     # Coverage reporting
npm run test:unit:watch   # Development mode unit testing
npm run test:int:watch    # Development mode integration testing
```

#### Continuous Integration Requirements

```typescript
// Test validation sequence (existing pattern)
{
  prePush: ["lint", "build", "test:unit", "test:int"],
  coverage: {
    minimum: "80%",
    focus: ["controllers", "services", "repositories", "utilities"]
  },
  dependencies: {
    testcontainers: "PostgreSQL container for integration tests",
    redis: "Redis container for rate limiting tests"
  }
}
```

#### Mock Strategy Guidelines

```typescript
// External Service Mocking
{
  googleOAuth: "Mock OAuth API responses and tokens",
  emailServices: "Mock email sending (future verification)",
  redis: "Mock for unit tests, real for integration tests",
  prisma: "Mock for unit tests, real for integration tests"
}
```

#### Test Data Management

```typescript
// Test data patterns (extend existing)
{
  factories: "User data factories for consistent test data",
  fixtures: "OAuth response fixtures for predictable testing",
  cleanup: "Database cleanup between integration tests",
  isolation: "Ensure test independence and repeatability"
}
```

### Quality Gates and Success Criteria

#### Test Coverage Requirements

- **Unit Tests**: 90%+ coverage for services, repositories, utilities
- **Integration Tests**: 100% coverage of functional requirements
- **Acceptance Tests**: 100% coverage of documented user scenarios

#### Performance Testing (Future Scope)

- Load testing for authentication endpoints
- Rate limiting validation testing
- JWT token validation performance

#### Security Testing (Future Scope)

- Penetration testing for authentication flows
- OAuth security validation
- Input validation security testing

---

## Implementation Plan

_Development roadmap and milestones_

### Phase Breakdown and Priorities

#### Phase 1: Data Model Foundation

**Priority: Critical - Foundation for all authentication features**

**Database Migration and Schema:**

- [ ] Execute destructive migration to new user schema
- [ ] Create new users table with complete field structure
- [ ] Add performance indexes (email, username, case-insensitive username)
- [ ] Verify Prisma schema generation and client update
- [ ] Test database connectivity and query performance

#### Phase 2: Local Authentication

**Priority: High - Core authentication functionality**

**Required Utilities (Build as needed for local auth):**

- [ ] `validation.util.ts` + `validation.util.test.ts` - Input validation for registration/login
- [ ] `jwt.util.ts` + `jwt.util.test.ts` - Token generation/validation for login
- [ ] `username-suggestions.util.ts` + `username-suggestions.util.test.ts` - Conflict resolution for registration
- [ ] `user.schema.ts` + `user.schema.test.ts` - User management validation schemas
- [ ] `auth.schema.ts` + `auth.schema.test.ts` - Authentication validation schemas

**User Domain Implementation (with Unit Tests):**

- [ ] `UserRepository` + `user.repository.test.ts` - Database operations with mocked Prisma
- [ ] `UserService` + `user.service.test.ts` - User registration and profile logic with mocked repository
- [ ] `UserController` + `user.controller.test.ts` - User management endpoints with mocked service

**Authentication Enhancement (with Unit Tests):**

- [ ] Enhanced `AuthRepository` + updated tests - Local auth database queries with mocked Prisma
- [ ] Enhanced `AuthService` + updated tests - Local authentication logic with mocked dependencies
- [ ] Enhanced `AuthController` + updated tests - Local authentication endpoints with mocked service

**Integration Tests (Local Authentication):**

- [ ] FR-1: Local user registration integration tests
- [ ] FR-2: Local authentication integration tests
- [ ] Real-time validation endpoint integration tests
- [ ] Database integrity and performance testing

**Endpoints Delivered:**

- `POST /user` - Local user registration
- `POST /auth/login` - Local user login
- `GET /user/validate/username` - Username availability check
- `GET /user/validate/email` - Email availability check
- `GET /user/suggest-usernames` - Username conflict suggestions
- `GET /user/me` - Get current user profile
- `PUT /user/me` - Update user profile

#### Phase 3: OAuth Authentication

**Priority: High - OAuth authentication and account linking**

**OAuth Utilities (Build as needed):**

- [ ] `oauth.util.ts` + `oauth.util.test.ts` - Google OAuth flow management with mocked Google API

**OAuth Integration (with Unit Tests):**

- [ ] Enhanced `AuthService` + updated tests - OAuth logic and account linking with mocked dependencies
- [ ] Enhanced `AuthController` + updated tests - OAuth endpoints with mocked service
- [ ] Enhanced `UserService` + updated tests - OAuth registration completion with mocked repository

**Integration Tests (OAuth Authentication):**

- [ ] Google OAuth flow integration tests
- [ ] Account linking integration tests
- [ ] FR-3: Complete account management integration tests
- [ ] Cross-method authentication scenarios

**Acceptance Tests (Complete System):**

- [ ] Scenario 1: New User - Local Registration & Login
- [ ] Scenario 2: New User - Google OAuth Registration & Login
- [ ] Scenario 3: Local User Attempts Google OAuth (Account Linking)
- [ ] Scenario 4: Google User Attempts Local Login (Security Handling)
- [ ] Scenario 5: Registration Conflicts - Email/Username
- [ ] Scenario 6: OAuth Registration Username Conflict
- [ ] Scenario 7: OAuth Flow Cancellation/Error
- [ ] Scenario 8: JWT Token Expiry During Platform Use
- [ ] Scenario 9: Real-time Username Validation & Suggestions

**Endpoints Delivered:**

- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle Google OAuth callback
- `POST /user/complete-oauth` - Complete OAuth user registration

#### Phase 4: Production Readiness

**Priority: Medium-High - Production deployment preparation**

**Security and Performance:**

- [ ] Rate limiting implementation with Redis backend
- [ ] Input validation security testing and hardening
- [ ] OAuth state parameter security validation
- [ ] JWT token security validation and performance testing
- [ ] Authentication endpoint performance optimization

**Documentation and Deployment:**

- [ ] API documentation updates for all new endpoints
- [ ] Database migration procedures and rollback plans
- [ ] Environment variable configuration guide
- [ ] Production deployment validation procedures

### Risk Assessment and Mitigation

#### High-Risk Areas

**Database Migration Risk (High Impact, Low Probability)**

- **Risk**: Data loss during destructive migration
- **Mitigation**: Only test data exists - acceptable loss, full backup procedures documented

**OAuth Integration Complexity (Medium Impact, High Probability)**

- **Risk**: Google OAuth flow integration issues, state management problems
- **Mitigation**: Comprehensive unit tests with mocked Google API, detailed OAuth flow logging

**Account Linking Data Integrity (High Impact, Low Probability)**

- **Risk**: Data corruption during cross-method account linking
- **Mitigation**: Database transactions, comprehensive integration tests, rollback mechanisms

#### Medium-Risk Areas

**JWT Token Security (Medium Impact, Medium Probability)**

- **Risk**: Token security vulnerabilities, secret management issues
- **Mitigation**: Follow JWT best practices, comprehensive token validation testing

**Rate Limiting Performance (Medium Impact, Medium Probability)**

- **Risk**: Rate limiting impact on user experience, Redis performance
- **Mitigation**: Load testing, graceful degradation for Redis failures

### Dependencies and Prerequisites

#### Technical Dependencies

**Database Requirements:**

- PostgreSQL database with migration support
- Prisma ORM v6.15.0+ for database operations
- Database backup and recovery procedures

**Authentication Dependencies:**

- Google OAuth 2.0 API credentials and configuration
- JWT secret management (environment variables)
- bcrypt for password hashing (existing)
- Redis instance for rate limiting (existing)

**Testing Dependencies:**

- Jest testing framework with TypeScript support
- Testcontainers for PostgreSQL integration testing
- Mocking frameworks for external service simulation

#### External Service Dependencies

**Google OAuth 2.0 Setup:**

- Google Cloud Console project configuration
- OAuth 2.0 client ID and secret generation
- Authorized redirect URIs configuration
- Required scopes: openid, email, profile

**Production Infrastructure (Existing):**

- HTTPS endpoints for OAuth callbacks
- SSL certificates and security headers
- Environment variable secure storage
- Monitoring and logging infrastructure

### Success Criteria and Deliverables

#### Functional Success Criteria

**Phase 2 Completion:**

- [x] Users can register with email/password successfully
- [x] Users can authenticate with email/password credentials
- [x] JWT tokens generated with proper claims and 8-hour expiry
- [x] Real-time validation provides immediate user feedback
- [x] Username suggestions resolve conflicts effectively
- [x] User profile management works correctly

**Phase 3 Completion:**

- [x] Users can register via Google OAuth with username selection
- [x] Users can authenticate via Google OAuth flow
- [x] Account linking works automatically for matching emails
- [x] Cross-method authentication maintains data integrity
- [x] All 9 user scenarios work end-to-end

**Technical Success Criteria:**

- [x] 90%+ unit test coverage for all authentication components
- [x] 100% integration test coverage for functional requirements
- [x] 100% acceptance test coverage for documented user scenarios
- [x] Authentication endpoints respond within 2 seconds
- [x] JWT validation completes within 100ms
- [x] All code passes ESLint and TypeScript compilation

#### Production Readiness Deliverables

**Code Quality:**

- [x] All unit tests passing with comprehensive mocking
- [x] All integration tests passing with real database
- [x] All acceptance tests passing for user scenarios
- [x] Code coverage reports meeting minimum thresholds
- [x] Security validation completed for all authentication flows

**Documentation:**

- [x] Complete API documentation for authentication endpoints
- [x] Database migration procedures and validation steps
- [x] OAuth integration setup and configuration guide
- [x] Testing procedures and validation checklists
- [x] Production deployment and environment setup guide

**Monitoring and Observability:**

- [x] Authentication metrics and structured logging
- [x] Error tracking and alerting for authentication failures
- [x] Performance monitoring for critical authentication paths
- [x] Security event logging for audit and compliance
- [x] Health check endpoints for authentication services

### Implementation Guidelines

#### Development Standards

**Test-Driven Development:**

- Each implementation file must have corresponding unit test file
- All dependencies must be mocked in unit tests
- All unit tests must pass before moving to dependent components
- Integration tests built incrementally alongside feature development

**Code Quality Requirements:**

- TypeScript strict mode with full type safety
- ESLint compliance with project-specific rules
- Prisma ORM for all database operations
- Zod validation for all request/response schemas
- Consistent error handling with existing HttpError system

#### Phase Transition Criteria

**Phase 1 → Phase 2:**

- Database schema successfully migrated and validated
- Prisma client generated and tested
- All database constraints and indexes working correctly

**Phase 2 → Phase 3:**

- All local authentication endpoints functional and tested
- Unit test coverage >90% for all Phase 2 components
- Integration tests passing for FR-1 and FR-2
- Local authentication user scenarios working end-to-end

**Phase 3 → Phase 4:**

- All OAuth endpoints functional and tested
- Account linking working correctly with data integrity
- All acceptance tests passing for user scenarios
- Complete authentication system validated end-to-end

---

## Change Log

| Date       | Section | Changes                    | Author |
| ---------- | ------- | -------------------------- | ------ |
| 2025-01-07 | Initial | Created document structure | Claude |
