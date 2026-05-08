-- Add 'rider' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'rider';
