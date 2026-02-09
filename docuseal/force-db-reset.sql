-- Force database reset for DocuSeal
-- This will completely wipe all data and reset the database

-- Drop all tables in the public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all views
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;

-- Verify cleanup
SELECT 'Database reset complete - all tables dropped' as status;