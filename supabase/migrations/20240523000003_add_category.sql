-- Add category column to clockins table
ALTER TABLE clockins
ADD COLUMN category VARCHAR(50) DEFAULT '日常';
