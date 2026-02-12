# Authentication Strategy & Roadmap

This document outlines the authentication strategy for the VQA application, prioritizing **accessibility**, **security**, and **seamless integration** with Next.js.

## Core Objectives
1.  **Accessibility First**: Login flows must be fully navigable via screen readers and keyboard. Avoid complex CAPTCHAs or timed distinct steps if possible.
2.  **State Persistence**: Authenticated users can save their chat history and clarify previous ambiguity sessions.
3.  **Minimal Friction**: Use "Magic Links" or "Social Login" to reduce typing needs for blind/low-vision users.

## Recommended Tech Stack
-   **Auth Library**: [Auth.js (NextAuth.js v5)](https://authjs.dev/) - The standard for Next.js.
-   **Database**: PostgreSQL (e.g., Supabase, Neon) or even a simple SQLite for local dev.
-   **ORM**: Prisma or Drizzle (for type-safe database interactions).

---

## Roadmap Phases

### Phase 1: Setup & Configuration
- [ ] **Install Dependencies**:
    ```bash
    npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client
    ```
- [ ] **Environment Variables**:
    -   `AUTH_SECRET` (generated via `openssl rand -base64 32`)
    -   `AUTH_URL` (for local dev)
    -   Provider IDs/Secrets (Google, GitHub, Resend/Email)

### Phase 2: Authentication Providers
We implement providers that offer the best accessibility:
1.  **Email (Magic Links)**:
    -   **Why**: No passwords to remember or type. Just click a link.
    -   **Tool**: `Resend` or `Nodemailer`.
2.  **Social Login (Google)**:
    -   **Why**: Single click, familiar flow, usually accessible.

### Phase 3: Database Integration
- [ ] **Schema Design**:
    -   `User` (id, name, email, image)
    -   `Account` (for OAuth linking)
    -   `Session` (if using database strategy)
    -   `ChatSession` (linked to User)
- [ ] **Prisma Setup**:
    -   Initialize generic schema.
    -   Run migrations.

### Phase 4: Middleware & Session Management
- [ ] **Middleware (`middleware.ts`)**:
    -   Protect `/chat` and `/history` routes.
    -   Redirect unauthenticated users to `/login`.
- [ ] **Session Provider**:
    -   Wrap the app layout or specific components to provide session state context.

### Phase 5: UI Implementation (Accessible)
- [ ] **Login Page (`/login`)**:
    -   High-contrast buttons.
    -   Clear status messages ("Check your email").
    -   `aria-live` regions for error handling.
- [ ] **User Profile**:
    -   Simple "Sign Out" button.
    -   "Delete Account" option (GDPR compliance/good practice).

---

## Security Best Practices
-   **HTTPOnly Cookies**: NextAuth handles this by default.
-   **CSRF Protection**: Native to Next.js/NextAuth.
-   **Role-Based Access Control (RBAC)**: (Future proofing) If we add "Admin" for study researchers to view logs.

## Accessibility Checklist for Auth
-   [ ] All form inputs have associated `<label>` elements.
-   [ ] Error messages are announced by screen readers (`role="alert"`).
-   [ ] Focus management handles the redirect after login smoothly.
-   [ ] "Sign in with Google" button has correct `alt` text or `aria-label`.
