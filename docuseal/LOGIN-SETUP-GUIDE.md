# DocuSeal First-Time Login Setup

## 🎯 Current Situation
Based on the logs, you're accessing:
- **SessionsController**: Login page at http://localhost:3001
- **DashboardController**: Main dashboard (requires login)

## 📋 Step-by-Step First-Time Setup

### 1. Access DocuSeal
Go to: **http://localhost:3001**

### 2. What You Should See
You'll likely see one of these screens:

#### Option A: Login Screen
- Email field
- Password field
- "Sign In" button
- Maybe a "Sign Up" or "Create Account" link

#### Option B: Registration/Setup Screen
- Name field
- Email field
- Password field
- "Create Account" or "Setup Admin" button

#### Option C: Welcome/Setup Wizard
- Initial setup prompts
- Admin account creation

### 3. Creating Your First Account

#### If you see a "Sign Up" option:
1. Click "Sign Up" or "Create Account"
2. Fill in:
   - **Name**: Your full name
   - **Email**: debesay304@gmail.com (matches your SMTP config)
   - **Password**: Choose a secure password
3. Click "Create Account"

#### If you only see login fields:
DocuSeal might need an admin user created. Let me help with that.

### 4. Alternative: Create Admin via Environment Variables

Let me add admin credentials to your .env file: