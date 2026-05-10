const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    if (!MONGO_URI) throw new Error('MONGO_URI is not set');
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
