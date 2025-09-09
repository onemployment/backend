# user-tests

This report reviews all unit tests under `src/api/user`, grouping each test case into categories: Necessary, Nice to have, and Over-test. The categorization focuses on coverage of core behavior, meaningful edge cases, and potential redundancies or low-value assertions.

## src/api/user/**tests**/user.schema.test.ts

- Necessary:
  - userRegistrationSchema: should validate correct registration data — verifies happy-path parsing of all required fields.
  - userRegistrationSchema: should transform email to lowercase — normalizes for uniqueness checks and storage.
  - userRegistrationSchema/email validation: should validate correct email formats — accepts common valid patterns.
  - userRegistrationSchema/email validation: should reject invalid email formats — rejects malformed inputs early.
  - userRegistrationSchema/email validation: should reject emails longer than 255 characters — enforces DB-aligned limits.
  - userRegistrationSchema/password validation: should validate strong passwords — enforces complexity regex.
  - userRegistrationSchema/password validation: should reject passwords without complexity requirements — blocks weak credentials.
  - userRegistrationSchema/password validation: should reject passwords that are too short or too long — enforces length bounds.
  - userRegistrationSchema/username validation: should validate correct usernames — confirms allowed pattern.
  - userRegistrationSchema/username validation: should reject usernames with invalid characters — filters illegal chars.
  - userRegistrationSchema/username validation: should reject usernames starting or ending with hyphens — pattern constraint.
  - userRegistrationSchema/username validation: should reject usernames that are too long — boundary enforcement.
  - userRegistrationSchema/username validation: should reject empty username — requires non-empty.
  - userRegistrationSchema/name validation: should validate correct first and last names (ASCII only) — accepts allowed set.
  - userRegistrationSchema/name validation: should reject names with invalid characters — prevents disallowed symbols.
  - userRegistrationSchema/name validation: should reject names that are too short or too long — boundary enforcement.
  - userProfileUpdateSchema: should validate partial updates with optional fields — supports partial PATCH semantics.
  - userProfileUpdateSchema: should validate displayName as nullable — documents nullability contract.
  - userProfileUpdateSchema: should reject invalid firstName and lastName — applies same name rules on update.
  - userProfileUpdateSchema: should validate displayName length constraints — enforces max length.
  - userProfileUpdateSchema: should allow optional fields to be undefined — optionality respected.
  - userRegistrationResponseSchema: should validate correct registration response — locks API response shape.
  - userRegistrationResponseSchema: should validate response with null displayName and lastLoginAt — null fields allowed.
  - userRegistrationResponseSchema: should reject missing required fields — strict contract enforcement.
  - usernameValidationResponseSchema: should validate available username response — base contract for success.
  - usernameValidationResponseSchema: should validate unavailable username response with suggestions — conflict contract.
  - usernameValidationResponseSchema: should allow optional suggestions field — suggestions are optional.
  - usernameValidationResponseSchema: should validate empty suggestions array — empty-but-present allowed.
  - userProfileResponseSchema: should validate correct profile response — profile contract verified.
  - userProfileResponseSchema: should validate response with null fields — nullability on optional fields supported.

- Nice to have:
  - userRegistrationSchema/email validation: should accept emails at 255 character limit — precise boundary acceptance.
  - userRegistrationSchema/password validation: should accept passwords at length limits — documents min/max inclusivity.
  - userRegistrationSchema/password validation: should provide helpful password error messages — better DX for validation.
  - userRegistrationSchema/username validation: should provide helpful username error messages — clearer failure reasons.
  - userRegistrationSchema/name validation: should accept names at length limits — boundary acceptance.
  - userRegistrationSchema/name validation: should provide helpful name error messages — clearer feedback.
  - schema integration and edge cases: should work with safeParse for error handling — ergonomic error handling pattern.
  - schema integration and edge cases: should handle schema composition with extend — demonstrates extensibility.
  - schema integration and edge cases: should work with partial schemas — optionality via partial usage.
  - schema integration and edge cases: should handle transform functions correctly — verifies transform correctness.

- Over-test:
  - TypeScript type exports: runtime typeof checks for exported types (compile-time concern) — runtime checks add little value.
    - should export UserRegistrationRequest type — compile-time only.
    - should export UserProfileUpdateRequest type with optional fields — compile-time only.
    - should export UserRegistrationResponse type — compile-time only.
    - should export UsernameValidationResponse type with optional suggestions — compile-time only.
    - should export UserProfileResponse type — compile-time only.

## src/api/user/**tests**/user.repository.test.ts

- Necessary:
  - createUser: should create user successfully — writes expected fields including account method.
  - createUser: should set lastPasswordChange timestamp for new user — ensures audit/security field set.
  - findById: should find user by ID successfully — primary lookup path.
  - findById: should return null when user does not exist — null-on-miss behavior.
  - updateProfile: should update user profile successfully — persists provided fields.
  - updateProfile: should handle null displayName in update — supports nullability.
  - findByEmail: should find user by email successfully — email lookup contract.
  - findByEmail: should handle case-insensitive email lookup — normalization enforced.
  - findByEmail: should return null when email does not exist — null-on-miss behavior.
  - findByUsername: should find user by username successfully — username lookup contract.
  - findByUsername: should handle case-insensitive username lookup — case-insensitive index usage.
  - findByUsername: should return null when username does not exist — null-on-miss behavior.
  - isEmailTaken: should return true when email exists — boolean existence check.
  - isEmailTaken: should return false when email does not exist — boolean existence check.
  - isEmailTaken: should handle case-insensitive email check — normalization enforced.
  - isUsernameTaken: should return true when username exists — boolean existence check.
  - isUsernameTaken: should return false when username does not exist — boolean existence check.
  - isUsernameTaken: should handle case-insensitive username check — case-insensitive matching.
  - findUsersByUsernamePrefix: should find users by username prefix successfully — prefix search contract.
  - findUsersByUsernamePrefix: should handle case-insensitive prefix search — case-insensitive matching.
  - findUsersByUsernamePrefix: should return empty array when no matches found — empty result contract.

- Nice to have:
  - createUser: should handle Prisma errors during creation — documents error propagation.
  - updateProfile: should handle Prisma errors during update — documents error propagation.
  - findUsersByUsernamePrefix: should return results ordered by username ascending (confirms query shape via call, not data sort) — verifies intended query options.

- Over-test:
  - None identified

## src/api/user/**tests**/user.service.test.ts

- Necessary:
  - registerUser: should register user successfully — full happy path incl. hashing and token generation.
  - registerUser: should throw BadRequestError for reserved username — enforces reserved list protection.
  - registerUser: should throw ConflictError when email is taken — prevents duplicate accounts.
  - registerUser: should throw ConflictError when username is taken — prevents collisions on handle.
  - getUserProfile: should return user profile successfully — fetches existing domain model.
  - getUserProfile: should throw NotFoundError when user does not exist — proper 404 semantics.
  - updateUserProfile: should update user profile successfully — persists sanitized updates.
  - updateUserProfile: should throw NotFoundError when user does not exist — prevents blind updates.
  - updateUserProfile: should sanitize displayName when null — preserves null vs empty and sanitation rules.
  - validateUsername: should return available true for valid available username — positive availability path.
  - validateUsername: should return available false with suggestions for taken username — conflict path + suggestions.
  - validateUsername: should return available false with suggestions for invalid username — invalid format outcome.
  - validateUsername: should return available false with suggestions for reserved username — reserved outcome.
  - validateEmail: should return available true for valid available email — positive availability path.
  - validateEmail: should return available false for taken email — conflict outcome.
  - validateEmail: should return available false for invalid email format — format validation short-circuit.
  - validateEmail: should handle case insensitive email validation — normalization before lookup.
  - suggestUsernames: should return username suggestions — delegates to suggestion util.

- Nice to have:
  - suggestUsernames: should return suggestions even for invalid base username — UX-oriented helper behavior.

- Over-test:
  - None identified

## src/api/user/**tests**/user.controller.test.ts

- Necessary:
  - registerUser: should successfully register a user — endpoint wiring and response shaping verified.
  - getCurrentUser: should return current user profile — authenticated profile retrieval.
  - updateCurrentUser: should update current user profile — update flow and shaped response.
  - validateUsername: should return username availability (available) — success path messaging contract.
  - validateUsername: should return username availability (taken) with suggestions — conflict message + suggestions.
  - validateUsername: should return error when username parameter is missing — 400 guardrail.
  - validateEmail: should return email availability (available) — success path messaging contract.
  - validateEmail: should return email availability (taken) — conflict messaging.
  - validateEmail: should return error when email parameter is missing — 400 guardrail.
  - suggestUsernames: should return username suggestions — forwards util output.
  - suggestUsernames: should return error when username parameter is missing — 400 guardrail.
  - transformUserToAPI: should properly transform User domain model to API response format — date to ISO, nulls preserved.

- Nice to have:
  - None identified

- Over-test:
  - None identified

## src/api/user/utils/**tests**/validation.util.test.ts

- Necessary:
  - validateEmail: should validate correct email formats — accepts common valid patterns.
  - validateEmail: should reject invalid email formats — rejects malformed inputs.
  - validateEmail: should reject emails longer than 255 characters — enforces length bound.
  - sanitizeEmail: should convert email to lowercase — normalization.
  - sanitizeEmail: should trim whitespace — normalization.
  - validateUsername: should validate correct username formats — allowed pattern.
  - validateUsername: should reject usernames starting or ending with hyphens — pattern constraint.
  - validateUsername: should validate usernames with internal hyphens — allowed interior hyphens.
  - validateUsername: should enforce length constraints — boundary rules.
  - isReservedUsername: should identify reserved usernames (case insensitive) — blocks reserved list.
  - validatePassword: should validate strong passwords — complexity success.
  - validatePassword: should reject weak passwords — complexity failure.
  - validatePassword: should enforce minimum complexity requirements — per-character class rules.
  - validatePassword: should enforce length constraints — min/max bounds.
  - validateName: should validate correct name formats (ASCII only) — allowed chars set.
  - validateName: should reject names with invalid characters — filter disallowed chars.
  - validateName: should enforce length constraints — min/max bounds.
  - validateName: should handle names with multiple spaces — tolerate spacing.
  - sanitizeName: should trim whitespace — normalization.
  - sanitizeName: should normalize multiple spaces to single spaces — consistency.
  - sanitizeName: should preserve valid special characters — don’t over-sanitize.

- Nice to have:
  - validateEmail: should accept emails exactly at 255 character limit — boundary acceptance.
  - validateEmail: should handle edge cases — robustness on blanks/minimal forms.
  - sanitizeEmail: should handle empty string — idempotence on empties.
  - sanitizeEmail: should handle already sanitized email — idempotence on clean values.
  - sanitizeEmail: should preserve valid special characters — don’t mangle plus/subdomain.
  - validateUsername: should handle null and undefined — defensive checks.
  - validateUsername: should handle edge cases — whitespace-only, numeric-only.
  - isReservedUsername: should allow non-reserved usernames — negative cases coverage.
  - isReservedUsername: should handle edge cases — blanks/whitespace behavior.
  - validatePassword: should handle null and undefined — defensive checks.
  - checkPasswordComplexity: should return empty array for valid passwords — success path.
  - checkPasswordComplexity: should return appropriate error messages for invalid passwords — detailed feedback.
  - checkPasswordComplexity: should handle null and undefined passwords — defensive checks.
  - checkPasswordComplexity: should return multiple errors for completely invalid password — aggregated errors.
  - validateName: should handle null and undefined — defensive checks.
  - validateName: should reject international characters (ASCII only supported) — documents current limitation.
  - sanitizeName: should handle empty string and whitespace — normalization idempotence.
  - sanitizeName: should handle already clean names — idempotence.
  - sanitizeName: should handle mixed whitespace types — normalizes various whitespace kinds.
  - integration tests: should work together for complete user validation — end-to-end utility cohesion.
  - integration tests: should reject invalid user data consistently — consistent failure across validators.

- Over-test:
  - validateUsername: should reject usernames with invalid characters (large exhaustive list; representative samples would suffice) — excessive enumeration.
  - isReservedUsername: should be case insensitive for reserved check (duplicative with earlier case-insensitive test) — redundant coverage.

## src/api/user/utils/**tests**/username-suggestions.util.test.ts

- Necessary:
  - generateSuggestions: should generate suggestions when base username is taken — finds next available suffixes.
  - generateSuggestions: should return available suggestions immediately when found — no unnecessary checks.
  - generateSuggestions: should skip taken usernames and find available ones — correct skipping logic.
  - generateSuggestions: should use default count of 3 when not specified — default parameter behavior.
  - generateSuggestions: should stop at 100 attempts to prevent infinite loop — safety cap.
  - generateSuggestions: should handle repository errors gracefully — continues on transient errors.
  - isUsernameAvailable: should return true when username is available — positive check.
  - isUsernameAvailable: should return false when username is taken — negative check.
  - isUsernameAvailable: should return false when repository throws error for safety — safe fallback on error.
  - getFirstAvailable: should return first available suggestion — primary helper behavior.
  - getFirstAvailable: should return timestamp-based fallback when no suggestions available — ensures a result.
  - getFirstAvailable: should handle repository errors and return timestamp fallback — resiliency.
  - getFirstAvailable: should find available suggestion after some taken ones — stops at first success.

- Nice to have:
  - generateSuggestions: should handle custom count parameter — parameterization.
  - generateSuggestions: should return partial results when some checks fail — partial success semantics.
  - generateSuggestions: should handle edge case with zero count — no-op behavior.
  - generateSuggestions: should handle negative count gracefully — defensive guard.
  - generateSuggestions: should handle very long base username — behavior near length limits.
  - isUsernameAvailable: should handle case-sensitive usernames — input preserved; repository insensitive.
  - isUsernameAvailable: should handle special characters in usernames — pass-through to repo.
  - getFirstAvailable: should handle mixed repository responses — mixed outcomes robustness.
  - getFirstAvailable: should ensure timestamp fallback is unique — reduces collision chance.
  - getFirstAvailable: should handle empty base username — timestamp-only fallback.
  - integration scenarios: should work correctly in realistic scenario with some taken usernames — E2E behavior sample.
  - integration scenarios: should handle high-contention username scenario — contention stress behavior.

- Over-test:
  - isUsernameAvailable: should handle different error types safely (too many error variants for similar behavior) — excessive enumeration.
  - integration scenarios: should maintain performance with concurrent requests (performance is out of scope for this unit) — perf belongs to integration/bench.

---

Notes and rationale:

- Necessary tests cover primary behavior, validation rules, error handling, and controller/service contracts.
- Nice to have tests document additional guarantees and edge cases but are not critical to catch regressions.
- Over-test items are either redundant with other tests, assert compile-time TypeScript behavior at runtime, or enumerate excessive cases that don’t increase confidence proportionally.

# auth-tests

This report reviews all unit tests under `src/api/auth`, grouping each test case into categories: Necessary, Nice to have, and Over-test.

## src/api/auth/**tests**/auth.schema.test.ts

- Necessary:
  - loginSchema: should validate correct login data — verifies happy-path parsing and required fields.
  - loginSchema: should transform email to lowercase — ensures normalization for downstream lookups.
  - loginSchema: should reject invalid email formats — enforces email format constraints.
  - loginSchema: should reject missing or empty password — enforces password presence rule.
  - loginSchema: should accept any non-empty password — documents lack of complexity in login schema.
  - loginSchema: should handle special email formats correctly — covers plus tags, subdomains, underscores.
  - loginSchema: should ignore extra fields — prevents leaking/accepting unintended input fields.
  - loginResponseSchema: should validate correct login response — locks API response contract.
  - loginResponseSchema: should validate response with null displayName and lastLoginAt — verifies nullability semantics.
  - loginResponseSchema: should reject invalid response structure — rejects malformed or mistyped payloads.
  - errorResponseSchema: should validate correct error response — standardizes error body shape.
  - errorResponseSchema: should reject non-string message — type safety for error messaging.
  - errorResponseSchema: should ignore extra fields in error response — ensures small, stable surface.

- Nice to have:
  - loginSchema: should validate mixed case email transformation — extra assurance of transform behavior.
  - loginSchema: should provide helpful error messages — checks developer-facing diagnostics from Zod.
  - loginSchema: should handle safeParse correctly — validates ergonomic error handling path.
  - loginResponseSchema: should handle different date string formats — demonstrates ISO serialization tolerance.
  - loginResponseSchema: should validate user object independently — verifies nested schema directly.
  - errorResponseSchema: should handle various error messages — content-agnostic acceptance.
  - TypeScript type exports: should export correct LoginRequest type — documents types; runtime check is auxiliary.
  - TypeScript type exports: should export correct LoginResponse type — same as above.
  - TypeScript type exports: should export correct ErrorResponse type — same as above.
  - TypeScript type exports: should handle nullable fields in LoginResponse type — shows intended nullability.
  - schema integration: should work with Zod refine for custom validation — shows extensibility pattern.
  - schema integration: should support schema composition — illustrates augmenting schema with extra fields.
  - schema integration: should work with partial schemas — demonstrates partial usage semantics.

- Over-test:
  - None identified (type export tests borderline but useful as living docs).

## src/api/auth/**tests**/auth.repository.test.ts

- Necessary:
  - findByEmail: should find user by email successfully — verifies base lookup contract.
  - findByEmail: should find user by email (case insensitive) — enforces normalization logic.
  - findByEmail: should return null when email does not exist — confirms null-on-miss.
  - findByGoogleId: should find user by Google ID successfully — validates alt identifier lookup.
  - findByGoogleId: should return null when Google ID does not exist — confirms null-on-miss.
  - updateLastLogin: should update last login timestamp successfully — ensures activity tracking.
  - linkGoogleAccount: should link Google account to existing user — validates account linking write.

- Nice to have:
  - updateLastLogin: should handle Prisma errors during update — documents error propagation.
  - linkGoogleAccount: should handle Prisma errors during linking — documents error propagation.

- Over-test:
  - None identified.

## src/api/auth/**tests**/auth.service.test.ts

- Necessary:
  - loginUser: should login user successfully with valid credentials — exercises full happy-path flow.
  - loginUser: should throw UnauthorizedError when user does not exist — protects against user enumeration.
  - loginUser: should throw UnauthorizedError when user has no password hash (OAuth-only) — prevents wrong auth path.
  - loginUser: should throw UnauthorizedError when password is invalid — ensures credential verification.

- Nice to have:
  - dependency injection: should be constructed with required dependencies — sanity check of wiring.

- Over-test:
  - None identified (DI test low-value but benign).

## src/api/auth/**tests**/auth.controller.test.ts

- Necessary:
  - loginUser: should successfully login a user with valid credentials — validates routing + response shaping.
  - logoutUser: should successfully logout and return success message — confirms expected stateless behavior.
  - transformUserToAPI: should properly transform User domain model to API response format — date to ISO, null handling.

- Nice to have:
  - None identified.

- Over-test:
  - None identified.

## src/api/auth/strategies/**tests**/BcryptStrategy.test.ts

- Necessary:
  - hash: should hash password with correct salt rounds — ensures configured cost is applied.
  - hash: should propagate bcrypt hash errors — surfaces underlying crypto failures.
  - verify: should verify correct password returns true — correctness of comparison.
  - verify: should verify incorrect password returns false — negative-path correctness.
  - verify: should propagate bcrypt compare errors — proper error bubbling.

- Nice to have:
  - constructor: should accept different salt rounds — documents configurability.

- Over-test:
  - None identified.

## src/api/auth/utils/**tests**/jwt.util.test.ts

- Necessary:
  - constructor: should use JWT_SECRET from environment — reads secret from env for signing/verification.
  - constructor: should use default secret in development — sensible defaults for local dev.
  - constructor: should throw error when JWT_SECRET is missing in production — hard fails unsafe config.
  - generateToken: should generate valid JWT token — basic token creation and payload fields.
  - generateToken: should generate token that expires in 8 hours — enforces expiry policy.
  - generateToken: should reject when jwt.sign fails — surfaces signing errors coherently.
  - generateToken: should reject when jwt.sign returns no token — guards unexpected callback outcomes.
  - validateToken: should validate valid token successfully — happy-path verification.
  - validateToken: should reject invalid token — corrupted token handling.
  - validateToken: should reject expired token — enforces exp claims.
  - validateToken: should reject token with wrong issuer — enforces iss claim.
  - validateToken: should reject token with wrong audience — enforces aud claim.
  - validateToken: should reject token signed with different secret — prevents secret mismatch.
  - extractPayload: should extract payload from valid token without verification — lightweight decode use-case.
  - extractPayload: should extract payload from expired token — decode independent of exp.
  - extractPayload: should return null for malformed token — robust decode fallback.
  - extractPayload: should return null for invalid token format — robust decode fallback.
  - extractPayload: should return null for empty token — robust decode fallback.

- Nice to have:
  - extractPayload: should handle jwt.decode throwing error — defensive coding against library errors.
  - extractPayload: should return null when decoded payload is not an object — guards unexpected decode types.
  - integration with different environments: should work in test environment with test secret — documents env parity.
  - integration with different environments: should work in development environment with default secret — documents env parity.

- Over-test:
  - None identified (breadth justified by security surface).

# other

This section covers all unit test files outside `src/api/user` and `src/api/auth`.

## src/**tests**/server.test.ts

- Necessary:
  - GET /health: should return health check status — basic liveness contract.
  - POST /api/v1/user: should handle registration request — verifies controller wiring and response shape.
  - POST /api/v1/auth/login: should handle login request — verifies auth flow and response shape.
  - Express middleware: should parse JSON bodies correctly — confirms body parsing path works end-to-end.
  - Route not found: should return 404 for unknown routes — unknown GET route contract.

- Nice to have:
  - POST /api/v1/user: should handle invalid JSON body — robustness to malformed payloads.
  - POST /api/v1/user: should handle missing content-type header — content-type guardrail.
  - Route not found: should return 404 for unknown POST routes — complements GET 404; somewhat duplicative.

- Over-test:
  - None identified.

## src/middleware/**tests**/request-validator.middleware.test.ts

- Necessary:
  - successful validation: validates body and calls next — happy-path middleware behavior.
  - successful validation: handle optional fields — optional schema correctness.
  - successful validation: transform and clean data through Zod schema — confirms transform usage.
  - validation failures: invalid data throws RequestValidationError — failure contract and logging.
  - validation failures: missing required fields — enforcement of requireds.
  - validation failures: empty body — enforces schema requirements.
  - sensitive field sanitization: sanitize password field in logs — privacy-by-default in logs.
  - sensitive field sanitization: sanitize multiple sensitive fields — broader redaction list.

- Nice to have:
  - sensitive field sanitization: handle non-object body types — logging robustness.
  - sensitive field sanitization: handle null body — logging robustness.
  - sensitive field sanitization: handle undefined body — logging robustness.
  - logging behavior: log request details with correct format — log structure contract.
  - logging behavior: handle missing Content-Type header — fallback logging semantics.

- Over-test:
  - None identified.

## src/middleware/**tests**/jwt-auth.middleware.test.ts

- Necessary:
  - createJwtAuthMiddleware: validate token and attach user — happy-path auth.
  - createJwtAuthMiddleware: reject without authorization header — 401 guardrail.
  - createJwtAuthMiddleware: reject malformed header — 401 guardrail.
  - createJwtAuthMiddleware: reject empty Bearer token — invalid token handling.
  - createJwtAuthMiddleware: handle JWT validation errors — maps UnauthorizedError.
  - createJwtAuthMiddleware: generic validation errors as unauthorized — consistent error mapping.
  - createJwtAuthMiddleware: case sensitive Bearer keyword — rejects non-standard casing.
  - createJwtAuthMiddleware: preserve request context when successful — no side effects on req.
  - initializeJwtMiddleware: create working middleware instance — global middleware works.
  - error handling edge cases: null/undefined authorization header — robust header parsing.
  - error handling edge cases: synchronous JWT errors — unified UnauthorizedError path.

- Nice to have:
  - initializeJwtMiddleware: initialize global middleware instance — existence check.
  - initializeJwtMiddleware: replace existing middleware instance — reinitialization semantics.

- Over-test:
  - None identified.

## src/middleware/**tests**/async-handler.middleware.test.ts

- Necessary:
  - wraps async function and calls it — happy path.
  - catches async errors and passes to next — error propagation contract.
  - does not catch synchronous function errors — documents current behavior.

- Nice to have:
  - functions that call next directly — transparency of next usage.
  - functions returning promises resolving to undefined — tolerant to return types.
  - functions returning non-promise values — tolerant to sync returns.
  - undefined return values — tolerant to undefined returns.
  - preserve original function context — argument forwarding unchanged.

- Over-test:
  - None identified.

## src/config/**tests**/index.test.ts

- Necessary:
  - port: use PORT env when provided — env override.
  - port: default to 3000 when not provided — defaulting.
  - host: use HOST env when provided — env override.
  - host: default to 0.0.0.0 when not provided — defaulting.
  - environment: use NODE_ENV when provided — env override.
  - environment: default to development — defaulting.
  - Redis URL: use REDIS_URL when provided — env override.
  - Redis URL: default to localhost when not provided — defaulting.
  - salt rounds: use SALT_ROUNDS when provided — env override.
  - salt rounds: default to 12 when not provided — defaulting.
  - log level: set warn in production — security posture.
  - log level: set silent in test — test ergonomics.
  - log level: set debug in development — dev ergonomics.
  - prioritize env over defaults — precedence rule.

- Nice to have:
  - port: handle invalid values (NaN) — behavior documented.
  - port: parse valid string numbers (several) — multiple examples of same rule.
  - host: handle various valid formats — acceptance breadth.
  - host: handle empty HOST env — fallback path.
  - Redis URL: handle various URL formats — acceptance breadth.
  - Redis URL: handle empty env — fallback path.
  - salt rounds: handle various valid values — acceptance breadth.
  - salt rounds: handle invalid values (NaN) — behavior documented.
  - salt rounds: handle empty env — fallback to default.
  - environment: custom names default to debug — documented behavior.
  - configuration immutability: only expected properties present — surface stability.
  - type safety: handle type coercion for numeric values — runtime assurance of numbers.
  - integration with dotenv: load from .env — smoke check.
  - edge cases: null/undefined env vars handled — robustness.
  - edge cases: extreme port/salt values — boundaries noted.
  - security: not expose sensitive env variables — defensive config shape.
  - security: appropriate log levels for envs (table-driven) — policy mapping.

- Over-test:
  - configuration immutability: marked as const / TS type checks at runtime — compile-time concern.
  - type safety: “correct types for all configuration values” via typeof — compile-time concern.

## src/api/**tests**/index.test.ts

- Necessary:
  - create and return Express router — basic factory contract.
  - mount auth router with correct path and dependencies — composition contract.
  - mount user router with correct path and dependencies — composition contract.
  - not add other middleware/methods on main router — pure composition layer.
  - consistent path naming convention — API surface contract.

- Nice to have:
  - mount both routers in correct order — predictable ordering.
  - handle missing dependencies gracefully — tolerance to partial DI.
  - create new router instance each time — no caching assumption.
  - pass controllers by reference, not copy — identity preserved.
  - call router factories with isolated dependency objects — DI boundaries.
  - handle router factory failures gracefully — error propagation.
  - not modify original dependencies object — DI immutability.
  - integration patterns: follow DI and separation of concerns — architectural documentation.
  - modular router composition and extensibility — pattern documentation.
  - error handling and edge cases: null/undefined deps — robustness.
  - propagate router creation errors — error visibility.
  - handle Express Router constructor failures — dependency failure surface.

- Over-test:
  - AppDependencies interface tests that compile via runtime — compile-time concern.

## src/infra/redis/**tests**/client.test.ts

- Necessary:
  - should create Redis client with provided URL — passes URL to driver.
  - should create Redis client with custom URL — constructor parameterization.
  - should connect to Redis successfully — happy path + info log.
  - should log error and throw on connection failure — error logging + thrown error.
  - should handle non-Error objects on connection failure — robustness.
  - should disconnect from Redis successfully — happy path + info log.
  - should log error on disconnection failure but not exit — graceful failure.
  - should handle non-Error objects on disconnection failure — robustness.
  - should quit from Redis successfully — happy path + info log.
  - should log error on quit failure but not throw — graceful failure.
  - should delegate multi() to underlying client — delegation contract.
  - should delegate hGetAll() to underlying client — delegation contract.
  - should delegate get() to underlying client — delegation contract.

- Nice to have:
  - None identified.

- Over-test:
  - None identified.

## src/common/logger/**tests**/logger.test.ts

- Necessary:
  - initialization: create pino logger with correct configuration — wiring to pino.
  - initialization: use config.logLevel for level — respects config.
  - initialization: use pino standard serializers — structured logging.
  - methods: debug/info/warn/error with message only — call mapping.
  - methods: with message and metadata — metadata passthrough.
  - error method: handle Error objects/HTTP error-like metadata — realistic logging payloads.
  - interface consistency: provide expected methods and void returns — API contract.

- Nice to have:
  - debug/info/warn/error handle empty strings — parameter tolerance.
  - handle arrays/nested objects/special characters in metadata — serialization breadth.
  - method parameter handling: very long messages — tolerance.
  - respects configured log level (presence) — configuration reflection.
  - pass through all metadata unchanged — no transformations.
  - performance considerations: handle high-frequency logging calls — stress scenario (unit-level approximation).
  - performance considerations: handle large metadata objects — stress scenario.
  - error handling and edge cases: circular references/functions/symbols in metadata — serializer tolerance.

- Over-test:
  - performance considerations with counts (1000 calls) — limited value in unit scope; belongs to benchmarks.

## src/common/error/**tests**/http-errors.test.ts

- Necessary:
  - HttpError: create with status and message, prototype chain, enumerable status — base contract.
  - ConflictError/UnauthorizedError/NotFoundError/BadRequestError: defaults and custom messages — semantics + status.
  - ResponseValidationError/RequestValidationError: defaults, custom name, custom messages — semantics + status + name.
  - error differentiation via instanceof and common HttpError base — polymorphic handling.
  - consistent status codes for HTTP semantics — mapping contract.
  - error serialization: JSON.stringify, toString — logging compatibility.

- Nice to have:
  - HttpError: different status codes variants — breadth of values.
  - HttpError: various message formats — message handling variety.
  - HttpError: edge case status codes — robustness.
  - Request/ResponseValidationError: preserve custom name in error handling — name stability.
  - error matching by status and by name — alternative matching patterns.
  - maintain stack traces and Error.prototype methods — debuggability.
  - edge cases: null/undefined/long/special/numeric messages — coercion and tolerance.
  - prototype integrity after instantiation — class correctness.

- Over-test:
  - None identified.
