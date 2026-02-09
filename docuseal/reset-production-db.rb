#!/usr/bin/env ruby

# Database reset script for DocuSeal production
# This script will completely wipe all user data and reset the database

puts "🔥 STARTING PRODUCTION DATABASE RESET..."
puts "⚠️  WARNING: This will delete ALL user data!"

# Connect to Rails environment
require 'bundler/setup'
Bundler.require(:default, :production)

# Load Rails environment
ENV['RAILS_ENV'] = 'production'
require_relative 'config/environment' rescue nil

begin
  # Alternative approach - direct database connection
  require 'pg'
  
  # Parse DATABASE_URL
  db_url = ENV['DATABASE_URL']
  if db_url.nil?
    puts "❌ DATABASE_URL not found!"
    exit 1
  end
  
  puts "📡 Connecting to database..."
  
  # Connect to PostgreSQL
  conn = PG.connect(db_url)
  
  puts "🗑️  Dropping all tables..."
  
  # Get all table names
  result = conn.exec("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
  tables = result.map { |row| row['tablename'] }
  
  puts "Found tables: #{tables.join(', ')}"
  
  # Drop all tables
  tables.each do |table|
    puts "Dropping table: #{table}"
    conn.exec("DROP TABLE IF EXISTS #{table} CASCADE;")
  end
  
  puts "🔄 Running database migrations..."
  
  # Run migrations to recreate tables
  system("bundle exec rails db:migrate RAILS_ENV=production")
  
  puts "✅ DATABASE RESET COMPLETE!"
  puts "🎉 DocuSeal is now ready for fresh admin signup!"
  
rescue => e
  puts "❌ Error during database reset: #{e.message}"
  puts "📋 Full error: #{e.backtrace.first(5).join("\n")}"
  exit 1
ensure
  conn&.close
end