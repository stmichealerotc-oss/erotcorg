#!/usr/bin/env ruby

# Simple script to delete all users from DocuSeal database
# This will allow fresh admin signup

puts "🔥 DELETING ALL USERS FROM DOCUSEAL DATABASE..."

begin
  # Connect to database using DATABASE_URL
  require 'pg'
  
  db_url = ENV['DATABASE_URL']
  if db_url.nil?
    puts "❌ DATABASE_URL not found!"
    exit 1
  end
  
  puts "📡 Connecting to database..."
  conn = PG.connect(db_url)
  
  # Delete all users
  puts "🗑️  Deleting all users..."
  result = conn.exec("DELETE FROM users;")
  puts "✅ Deleted #{result.cmd_tuples} users"
  
  # Delete all accounts
  puts "🗑️  Deleting all accounts..."
  result = conn.exec("DELETE FROM accounts;")
  puts "✅ Deleted #{result.cmd_tuples} accounts"
  
  # Delete all sessions
  puts "🗑️  Deleting all sessions..."
  result = conn.exec("DELETE FROM sessions;")
  puts "✅ Deleted #{result.cmd_tuples} sessions"
  
  puts "🎉 ALL USERS DELETED! DocuSeal is ready for fresh admin signup!"
  
rescue PG::UndefinedTable => e
  puts "⚠️  Table not found: #{e.message}"
  puts "This might be normal if the database structure is different"
rescue => e
  puts "❌ Error: #{e.message}"
  puts "Trying alternative table names..."
  
  # Try alternative table names that DocuSeal might use
  ['user', 'admin', 'account', 'profile'].each do |table|
    begin
      result = conn.exec("DELETE FROM #{table};")
      puts "✅ Deleted #{result.cmd_tuples} records from #{table}"
    rescue => table_error
      puts "⚠️  Table '#{table}' not found or error: #{table_error.message}"
    end
  end
ensure
  conn&.close
end