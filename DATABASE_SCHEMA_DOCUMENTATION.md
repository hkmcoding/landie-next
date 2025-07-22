# Database Schema Documentation

This document provides a comprehensive overview of the database table structures used in the Landie Next application, extracted from migration files, RPC functions, and TypeScript interface definitions.

## Core Tables

### 1. landing_pages

**Primary table for user landing pages**

```sql
-- Columns identified from RPC functions and TypeScript interfaces
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL (references auth.users)
name                TEXT
username            TEXT
headline            TEXT
subheadline         TEXT
cta_text            TEXT
cta_url             TEXT
bio                 TEXT
profile_image_url   TEXT
theme_side          TEXT
contact_email       TEXT
show_contact_form   BOOLEAN
instagram_url       TEXT
youtube_url         TEXT
tiktok_url          TEXT
onboarding_data     JSONB
ai_uses             INTEGER DEFAULT 0
created_at          TIMESTAMPTZ
```

**Key Fields:**
- `id`: Primary key, UUID
- `user_id`: Foreign key to auth.users
- `username`: Unique username for public URLs
- `bio`, `cta_text`, `cta_url`: Call-to-action and bio fields
- `instagram_url`, `youtube_url`, `tiktok_url`: Social media links
- `onboarding_data`: JSONB field for wizard data
- `ai_uses`: Counter for AI feature usage

### 2. services

**Services offered by landing page owners**

```sql
-- Columns identified from RPC functions and TypeScript interfaces
id                  UUID PRIMARY KEY
landing_page_id     UUID NOT NULL (references landing_pages(id))
title               TEXT
description         TEXT
price               TEXT
button_text         TEXT
button_url          TEXT
image_urls          TEXT[] (array of image URLs)
youtube_url         TEXT
ai_uses             INTEGER DEFAULT 0
order_index         INTEGER NOT NULL DEFAULT 0  -- Added in migration 20250716
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Key Fields:**
- `landing_page_id`: Foreign key to landing_pages
- `image_urls`: Array of image URLs
- `order_index`: For drag-and-drop ordering (added July 2025)
- `ai_uses`: Counter for AI feature usage

**Indexes:**
- `idx_services_landing_page_order` ON (landing_page_id, order_index)

### 3. highlights

**Key highlights or features displayed on landing pages**

```sql
-- Columns identified from RPC functions and TypeScript interfaces
id                  UUID PRIMARY KEY
landing_page_id     UUID NOT NULL (references landing_pages(id))
header              TEXT NOT NULL
content             TEXT
ai_uses             INTEGER DEFAULT 0
order_index         INTEGER NOT NULL DEFAULT 0  -- Added in migration 20250716
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Key Fields:**
- `landing_page_id`: Foreign key to landing_pages
- `header`: Required title/header text
- `content`: Optional description content
- `order_index`: For drag-and-drop ordering (added July 2025)
- `ai_uses`: Counter for AI feature usage

**Indexes:**
- `idx_highlights_landing_page_order` ON (landing_page_id, order_index)

### 4. testimonials

**Customer testimonials and reviews**

```sql
-- Columns identified from RPC functions and TypeScript interfaces
id                  UUID PRIMARY KEY
landing_page_id     UUID NOT NULL (references landing_pages(id))
quote               TEXT
author_name         TEXT
description         TEXT
image_urls          TEXT[] (array of image URLs)
youtube_url         TEXT
ai_uses             INTEGER DEFAULT 0
order_index         INTEGER NOT NULL DEFAULT 0  -- Added in migration 20250716
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Key Fields:**
- `landing_page_id`: Foreign key to landing_pages
- `quote`: Testimonial text
- `author_name`: Name of person giving testimonial
- `description`: Additional context or role
- `image_urls`: Array of image URLs (profile pictures, etc.)
- `order_index`: For drag-and-drop ordering (added July 2025)
- `ai_uses`: Counter for AI feature usage

**Indexes:**
- `idx_testimonials_landing_page_order` ON (landing_page_id, order_index)

### 5. user_pro_status

**User subscription/pro status tracking**

```sql
-- Columns identified from RPC functions and TypeScript interfaces
user_id             UUID PRIMARY KEY (references auth.users)
is_pro              BOOLEAN NOT NULL DEFAULT FALSE
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Key Fields:**
- `user_id`: Primary key and foreign key to auth.users
- `is_pro`: Boolean flag for pro subscription status

## Analytics Tables (Schema: analytics)

### 6. analytics.page_views

**Track page view events**

```sql
-- From migration files
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL
landing_page_id     UUID NOT NULL
visitor_id          TEXT
ip_address          TEXT
user_agent          TEXT
referer             TEXT
url                 TEXT
session_id          UUID
created_at          TIMESTAMPTZ
```

### 7. analytics.unique_visitors

**Track unique visitor metrics**

```sql
-- From migration files
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL
landing_page_id     UUID NOT NULL
visitor_id          TEXT NOT NULL
first_visit         TIMESTAMPTZ
last_visit          TIMESTAMPTZ
total_visits        INTEGER DEFAULT 1
total_page_views    INTEGER DEFAULT 1
total_session_duration INTEGER DEFAULT 0
ip_address          TEXT
user_agent          TEXT
referer             TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### 8. analytics.cta_clicks

**Track call-to-action button clicks**

```sql
-- From migration files
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL
landing_page_id     UUID NOT NULL
button_text         TEXT
button_url          TEXT
visitor_id          TEXT
ip_address          TEXT
user_agent          TEXT
referer             TEXT
url                 TEXT
session_id          UUID
cta_text            TEXT
cta_position        TEXT
created_at          TIMESTAMPTZ
```

### 9. analytics.page_sessions

**Track user session data**

```sql
-- From migration files
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL
landing_page_id     UUID NOT NULL
visitor_id          TEXT NOT NULL
session_start       TIMESTAMPTZ
session_end         TIMESTAMPTZ
duration_seconds    INTEGER
page_views          INTEGER DEFAULT 1
ip_address          TEXT
user_agent          TEXT
referer             TEXT
created_at          TIMESTAMPTZ
```

### 10. analytics.content_changes

**Track content modification history for analytics**

```sql
-- From migration files
id                  UUID PRIMARY KEY
user_id             UUID NOT NULL
landing_page_id     UUID NOT NULL
section             TEXT NOT NULL
field_name          TEXT NOT NULL
old_value           TEXT
new_value           TEXT
change_type         TEXT NOT NULL -- 'create', 'update', 'delete'
created_at          TIMESTAMPTZ
```

## AI Assistant Tables (Schema: public)

### 11. ai_suggestions

**AI-generated suggestions for content improvement**

```sql
-- From migration files
id                  UUID PRIMARY KEY
landing_page_id     UUID NOT NULL (references landing_pages(id))
section_type        TEXT NOT NULL
suggestion_text     TEXT NOT NULL
suggestion_data     JSONB
priority_score      DECIMAL(3,2)
status              TEXT DEFAULT 'pending'
feedback_score      INTEGER
feedback_comment    TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### 12. suggestion_implementations

**Track which AI suggestions have been implemented**

```sql
-- From migration files
id                  UUID PRIMARY KEY
suggestion_id       UUID NOT NULL (references ai_suggestions(id))
user_id             UUID NOT NULL
implemented_at      TIMESTAMPTZ
implementation_type TEXT NOT NULL
before_value        TEXT
after_value         TEXT
success             BOOLEAN DEFAULT TRUE
notes               TEXT
created_at          TIMESTAMPTZ
```

### 13. ai_analysis_sessions

**Track AI analysis sessions for performance measurement**

```sql
-- From migration files
id                  UUID PRIMARY KEY
landing_page_id     UUID NOT NULL (references landing_pages(id))
user_id             UUID NOT NULL
analysis_type       TEXT NOT NULL
status              TEXT DEFAULT 'pending'
metrics_before      JSONB
metrics_after       JSONB
suggestions_count   INTEGER DEFAULT 0
implementations_count INTEGER DEFAULT 0
performance_impact  DECIMAL(5,2)
started_at          TIMESTAMPTZ
completed_at        TIMESTAMPTZ
created_at          TIMESTAMPTZ
```

### 14. suggestion_feedback

**User feedback on AI suggestions**

```sql
-- From migration files
id                  UUID PRIMARY KEY
suggestion_id       UUID NOT NULL (references ai_suggestions(id))
user_id             UUID NOT NULL
feedback_type       TEXT NOT NULL
rating              INTEGER
comment             TEXT
is_helpful          BOOLEAN
created_at          TIMESTAMPTZ
```

## Key RPC Function: get_dashboard_data_optimized

**Primary function for fetching dashboard data efficiently**

```sql
-- Function signature
get_dashboard_data_optimized(p_user_id UUID) RETURNS JSON

-- Returns JSON object with structure:
{
  "landing_page": LandingPage | null,
  "services": Service[],
  "highlights": Highlight[],
  "testimonials": Testimonial[],
  "user_pro_status": UserProStatus
}
```

## Recent Schema Changes

### July 2025 - Order Index Columns
**Migration: 20250716_add_order_index_columns.sql**
- Added `order_index INTEGER NOT NULL DEFAULT 0` to:
  - `services` table
  - `highlights` table  
  - `testimonials` table
- Added corresponding indexes for efficient ordering queries
- Enables drag-and-drop reordering functionality

### January 2025 - Landing Page Field Fixes
**Migrations: 20250122000000 & 20250122000001**
- Fixed RPC function to properly include bio, CTA, and social media fields
- Ensured all landing page fields are accessible in dashboard queries

## Column Summary by Table

### Core Content Tables
- **landing_pages**: 21 columns (includes social, bio, CTA fields)
- **services**: 12 columns (includes order_index, image arrays)
- **highlights**: 8 columns (includes order_index)
- **testimonials**: 10 columns (includes order_index, image arrays)
- **user_pro_status**: 4 columns (simple subscription tracking)

### Analytics Tables
- **page_views**: 10 columns (comprehensive view tracking)
- **unique_visitors**: 13 columns (visitor aggregation)
- **cta_clicks**: 13 columns (button interaction tracking)
- **page_sessions**: 10 columns (session duration tracking)
- **content_changes**: 9 columns (content modification history)

### AI Assistant Tables
- **ai_suggestions**: 11 columns (AI recommendations)
- **suggestion_implementations**: 10 columns (implementation tracking)
- **ai_analysis_sessions**: 12 columns (analysis session data)
- **suggestion_feedback**: 7 columns (user feedback)

## Notes on Missing Information

Since the core tables (landing_pages, services, highlights, testimonials, user_pro_status) don't have CREATE TABLE statements in the migration files, they were likely:
1. Created during initial Supabase setup
2. Created via Supabase dashboard
3. Created in earlier migrations not present in this repository

The column information has been reconstructed from:
- RPC function queries and SELECT statements
- TypeScript interface definitions
- ALTER TABLE statements for order_index columns
- Service method calls in dashboard service