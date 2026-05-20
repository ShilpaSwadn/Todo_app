# Swadn - Premium Pre-Flight Meal Booking & Group Settings Platform

Swadn is an elegant, full-stack web application designed to manage premium pre-flight meal bookings and collaborative group configurations. It allows passengers to personalize their in-flight dining experiences while enabling corporate or private groups to manage shared addresses, payment methods, and role-based permissions seamlessly.

---

## 🛠️ Technologies Used (The Stack)

Swadn is built using modern, industry-standard web technologies:

*   **Frontend Framework**: `Next.js 14` (App Router) & `React 18`
*   **Styling & UI**: `Tailwind CSS` & Vanilla CSS (incorporating modern glassmorphism, responsive designs, and smooth hover animations)
*   **Database**: `PostgreSQL` (powered by high-performance connection pooling and transaction retries via the `pg` client)
*   **Authentication**: `Firebase Authentication` (Client & Admin SDKs) supporting Email, Google Login, and Phone OTP validation
*   **Translations & Localization**: `i18next` with adaptive browser language detection
*   **Transactional Mailer**: `Nodemailer` for dispatching verification links and account activation emails
*   **Utilities**: `card-validator` for real-time payment validation, and `uuid` for secure entity indexing

---

## 🚀 Key Functionalities & Features

### 1. Dynamic Meal Configurator
*   **3-Stage Selection Flow**: Interactive selection of dietary profile ➔ main course dish ➔ individual ingredient exclusions.
*   **Cultural Exclusions Rules**: Smart filtering logic (e.g., selecting a *Jain* meal automatically disables and hides forbidden ingredients such as root vegetables).

### 2. Multi-Tenant Group Hub
*   **Workspace Creation**: Users can create and manage up to 5 organizational groups to group profile data, shared addresses, and billing configurations.
*   **Interactive Invitations**: Real-time auto-complete user searches by name or email with live feedback states for seamless team additions.

### 3. Granular Role-Based Access Control (RBAC)
Custom workspace security roles tailored to individual members within groups:
*   `GROUP_ADMIN`: Full administrative access (inviting/removing members, bulk updating roles, managing group lifecycle).
*   `PAYMENT_ADMIN`: Add, update, or remove masked group credit cards.
*   `PAYMENT_USER`: View and select shared group cards for meal purchases.
*   `GROUP_ADDRESS_ADMIN`: Manage shipping/delivery physical addresses linked to the group.
*   `GROUP_MEMBER`: Base read-only membership access.

### 4. Dynamic Group Address Manager
*   **Localization Support**: Form structures and label names (ZIP Code vs Pin Code vs Postcode) adjust dynamically based on the country selected.
*   **Many-to-Many Group Syncing**: Links a physical address to multiple groups simultaneously, automatically syncing updates across all linked workspaces.

### 5. Verified Payment Vault
*   **Brand Parser**: Real-time visual identification and badge rendering of card brands (Visa, Mastercard, American Express, Discover, Diners Club).
*   **Secure Masking**: Visual masking of sensitive card details on both client and backend servers (saving only public metadata and masked representations).
*   **Many-to-Many Group Linking**: Similar to group addresses, a single payment method can be linked or assigned to multiple groups simultaneously, allowing shared group billing configurations.

### 6. Robust Authentication Gate
*   **Multi-Auth Portal**: Seamless transitions for social sign-ins (Google) and stateless high-entropy SMS/OTP login workflows.
*   **Activation Safeguards**: Protects account routes by requiring an email verification token before granting dashboard access.

---

## 🚥 Getting Started

To run the Swadn platform locally:

```bash
# 1. Navigate to the Next.js workspace
cd frontend

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser to experience Swadn.
