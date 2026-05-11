// Mock database to bypass better-sqlite3 native compilation issues on Node 24

const mockUsers = [];
let mockIdCounter = 1;

class MockStatement {
  constructor(query) {
    this.query = query;
  }
  
  get(...args) {
    // Check if it's querying a user by email
    if (this.query.includes('FROM users WHERE email = ?')) {
        const email = args[0];
        return mockUsers.find(u => u.email === email);
    }
    // Check if checking for existing review
    if (this.query.includes('FROM reviews WHERE')) return null;
    
    // Default stats or user
    return { c: 0, avg: 0, count: 0, value: '10' };
  }
  
  all(...args) {
    if (this.query.includes('FROM site_config')) return [];
    if (this.query.includes('sitters s ON u.id = s.user_id')) return [];
    if (this.query.includes('FROM bookings')) return [];
    return [];
  }
  
  run(...args) {
    // If inserting a user, add it to mock storage
    if (this.query.includes('INSERT INTO users')) {
        const [id, email, password, role, full_name] = args;
        mockUsers.push({ id, email, password, role, full_name, is_active: 1 });
    }
    return { changes: 1, lastInsertRowid: mockIdCounter++ };
  }
}

const db = {
  pragma: () => {},
  exec: () => {},
  prepare: (query) => new MockStatement(query),
  transaction: (fn) => {
    return function(...args) {
      return fn(...args);
    }
  }
};

module.exports = db;
