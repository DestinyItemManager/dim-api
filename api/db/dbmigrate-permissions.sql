-- Grant permissions to dbmigrate user for defaultdb schema
GRANT USAGE ON SCHEMA public TO dbmigrate;

-- Grant CREATE privilege on schema to allow table creation
GRANT CREATE ON SCHEMA public TO dbmigrate;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO dbmigrate;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dimapi;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO dbmigrate;
