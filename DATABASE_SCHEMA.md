# Database Schema Documentation

This document provides a comprehensive overview of the database tables used in the application. It explains the purpose of each table, how they relate to one another, and provides a clear description of every column to ensure full maintainability and clarity for future development.

## 1. `users` Table
**Purpose:** This is the core table for managing user identity and profile information. Every individual who signs up for the application gets a unique record here. It ties authentication data (from Firebase) with application-specific details.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `id` | UUID (Primary Key) | Uniquely identifies the user across the database. Used as a foreign key in other tables. |
| `firebase_uid` | VARCHAR(255) | Links the database user to their Firebase Authentication account. Ensures seamless login and security validation. |
| `first_name` | VARCHAR(255) | Stores the user's given name for personalized greetings and UI display. |
| `last_name` | VARCHAR(255) | Stores the user's family name for formal display and complete profiling. |
| `email` | VARCHAR(255) | Primary contact method and alternative login identifier. |
| `mobile_number` | VARCHAR(20) | Alternative contact method, useful for SMS notifications or 2FA. |
| `language_preference` | VARCHAR(50) | Stores the user's preferred language (e.g., 'en', 'fr') to localize the UI. |
| `time_zone` | VARCHAR(100) | Ensures that dates and times (like due dates or event logs) are displayed in the user's local context. |
| `currency` | VARCHAR(10) | User's preferred currency for billing and payments (e.g., 'USD'). |
| `account_active` | BOOLEAN | A flag to quickly disable or enable access without permanently deleting the user's data (soft delete/suspend). |
| `profile_data` | JSONB | A flexible payload to store additional, non-structured user preferences or profile settings (e.g., UI theme, notification settings) without altering the schema. |
| `created_at` | TIMESTAMP | Tracks exactly when the user registered. |
| `updated_at` | TIMESTAMP | Tracks the last time the user's profile was modified. |

---

## 2. `groups` Table
**Purpose:** Allows users to organize tasks, payments, or team members into distinct workspaces. A group acts as an organizational bucket where multiple users can collaborate.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `group_id` | UUID (Primary Key) | Uniquely identifies the group. |
| `user_id` | UUID (Foreign Key) | Refers to the `users` table. Represents the creator or primary owner of the group. If the owner is deleted, the group cascades and is also deleted. |
| `group_name` | VARCHAR(255) | The display name of the group (e.g., "Family Tasks", "Project Alpha"). |
| `group_description` | TEXT | A longer text field to provide context or rules about what this group is used for. |
| `group_members` | UUID[] | Array of User IDs. Provides a quick way to list simple members (legacy/simple reference) although `user_roles` now handles detailed roles. |
| `is_active` | BOOLEAN | Soft delete/archive flag. If false, the group is hidden from the UI but data is preserved. |
| `is_default` | BOOLEAN | Flags whether this is the user's primary "Personal Hub". Every user usually has one default group automatically created upon registration. |
| `created_at` | TIMESTAMP | Tracks when the group was created. |

---

## 3. `payment_info` Table
**Purpose:** Stores the core details of payment methods (like credit cards) added by users. It is decoupled from groups to allow a single payment method to be linked to multiple groups cleanly without data duplication.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `payment_details_id` | UUID (Primary Key) | Uniquely identifies this specific payment method entry. |
| `user_id` | UUID (Foreign Key) | The user who actually owns and added the payment method. |
| `cardholder_name` | VARCHAR(100) | The name exactly as it appears on the credit/debit card. |
| `card_number` | VARCHAR(4) | Stores **only** the last 4 digits for security and PCI compliance. Used for display purposes (e.g., "Visa ending in 1234"). |
| `expiry_date` | VARCHAR(5) | The expiration date of the card (MM/YY format). |
| `provider` | VARCHAR(50) | The payment processor or gateway (e.g., Stripe, PayPal). |
| `card_brand` | VARCHAR(50) | The brand of the card (e.g., Visa, MasterCard, Amex) to display the correct icon in the UI. |
| `funding_type` | VARCHAR(20) | Indicates if it is a credit, debit, or prepaid card. |
| `is_verified` | BOOLEAN | Indicates whether a small authorization hold was successfully processed to verify the card's validity. |
| `is_active` | BOOLEAN | Soft delete flag. Allows a user to remove a card from view without breaking historical transaction logs. |
| `created_at` | TIMESTAMP | When the payment method was added. |
| `updated_at` | TIMESTAMP | When the payment method was last updated (e.g., expiration date changed). |
| *Note: `group_id`* | *UUID* | *Legacy column kept for backwards compatibility, mostly superseded by `group_payments` junction table.* |

---

## 4. `group_payments` Table (Junction Table)
**Purpose:** This table manages a **Many-to-Many relationship** between Groups and Payment Methods. Because a user might want to use the same credit card in "Personal Hub" and "Shared Project", this table links one card to multiple groups without duplicating the card data itself.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `group_id` | UUID (Foreign Key) | Refers to a specific group. Cascades on delete. |
| `payment_details_id` | UUID (Foreign Key) | Refers to a specific payment method. Cascades on delete. |
| **Primary Key** | Composite | The combination of `(group_id, payment_details_id)` acts as the primary key, ensuring a specific card cannot be linked to the same group twice. |

---

## 5. `user_roles` Table
**Purpose:** Manages **Role-Based Access Control (RBAC)** for users inside groups. It tracks which users belong to which groups and what permissions they have (e.g., Admin vs Member). 

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `user_id` | UUID (Foreign Key) | The user being granted permissions. Cascades on delete. |
| `group_id` | UUID (Foreign Key) | The group the user is part of. Cascades on delete. |
| `user_roles` | VARCHAR(50)[] | An array of roles (e.g., `['GROUP_ADMIN', 'GROUP_MEMBER']`). Storing as an array allows a user to hold multiple distinct permissions simultaneously within the same group context. |
| **Primary Key** | Composite | The combination of `(user_id, group_id)` ensures a user only has one role record per group. |

---

## 6. `addresses` Table
**Purpose:** A centralized table to store physical addresses (billing, shipping, etc.). By keeping addresses in their own table, we normalize the data and prevent messy JSON arrays in the group table, improving searchability and reporting.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `address_id` | UUID (Primary Key) | Uniquely identifies the address record. |
| `address_line1` | VARCHAR(255) | Street address, P.O. box, company name, c/o. |
| `address_line2` | VARCHAR(255) | Apartment, suite, unit, building, floor, etc. (Optional) |
| `city` | VARCHAR(100) | City, town, or village name. |
| `state_province` | VARCHAR(100) | State, province, or region. Nullable to support international addresses that lack this concept. |
| `postal_code` | VARCHAR(20) | ZIP or postal code. Nullable for international support. |
| `country` | VARCHAR(100) | The country of the address. |
| `created_at` | TIMESTAMP | When the address was added. |

---

## 7. `group_addresses` Table (Junction Table)
**Purpose:** Manages the **Many-to-Many relationship** between Groups and Addresses. This allows a group to have multiple addresses (e.g., a billing address and a separate shipping address) and allows the same address to potentially be used by multiple groups.

| Column | Data Type | Purpose |
| :--- | :--- | :--- |
| `group_id` | UUID (Foreign Key) | Refers to the group the address belongs to. Cascades on delete. |
| `address_id` | UUID (Foreign Key) | Refers to the specific address details. Cascades on delete. |
| `is_default` | BOOLEAN | Indicates if this address is the primary/default address for the group (e.g., primary billing address). A database index ensures only one default address exists per group. |
| **Primary Key** | Composite | `(group_id, address_id)` ensures the same address isn't linked to the same group multiple times. |
