-- Create the user 'runner' with the password 'your_password'
CREATE USER testuser WITH PASSWORD 'testpassword';

-- Create the database 'testdb'
CREATE DATABASE testdb;

-- Grant all privileges on the database 'testdb' to the user 'runner'
GRANT ALL PRIVILEGES ON DATABASE testdb TO runner;

-- Connect to the 'testdb' database
\c testdb

-- Create the 'access_policies' table
CREATE TABLE access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  effect TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  conditions JSONB,
  nested_conditions JSONB,
  overrides JSONB,
  time_constraints JSONB,
  geo_constraints JSONB,
  validity JSONB,
  custom_logic TEXT,
  audit JSONB,
  metadata JSONB
);
