const mongoose = require('mongoose');

class DatabaseService {
  constructor() {
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || process.env.MONGO_URI;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('📊 Database already connected');
        return;
      }

      if (!this.connectionString) {
        console.warn('⚠️  MongoDB connection string not found in environment variables');
        
        // In development with BYPASS_AUTH, allow server to run without DB
        if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
          console.log('🔓 Development mode with BYPASS_AUTH - server will run without database');
          return;
        }
        
        throw new Error('MongoDB connection string not found in environment variables');
      }

      console.log('🔗 Connecting to MongoDB...');
      
      await mongoose.connect(this.connectionString, {
        // This is the most important line to stop the "test" DB
        dbName: 'church_db',
        // Simplified settings for Azure Cosmos DB
        useNewUrlParser: true,
        useUnifiedTopology: true,
        retryWrites: false, // Recommended for Azure Cosmos MongoDB
        serverSelectionTimeoutMS: 5000 // Fail fast in development
      });

      this.isConnected = true;
      console.log('✅ MongoDB Connected:', this.getConnectionInfo());

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📊 MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.isConnected = false;
      
      // In development with BYPASS_AUTH, allow server to continue
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
        console.log('🔓 Development mode with BYPASS_AUTH - continuing without database');
        return;
      }
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('📊 MongoDB disconnected gracefully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Not connected to database' };
      }

      // Simple ping to check connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        connection: this.getConnectionInfo(),
        readyState: mongoose.connection.readyState,
        collections: await this.getCollectionStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        readyState: mongoose.connection.readyState
      };
    }
  }

  getConnectionInfo() {
    if (!mongoose.connection.host) {
      return 'Not connected';
    }
    return `${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async getCollectionStats() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      return collections.map(col => col.name);
    } catch (error) {
      return [];
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;