class LocalDB {
  constructor() {
    this.dbName = 'LaundryKingPOS';
    this.dbVersion = 2;
    this.db = null;
    this.ready = this.initializeDB();
  }

  initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject('Failed to open database');
        // Create inventoryItems store
        if (!db.objectStoreNames.contains('inventoryItems')) {
          const inventoryStore = db.createObjectStore('inventoryItems', { keyPath: 'id' });
          inventoryStore.createIndex('item_name', 'item_name', { unique: false });
        }
  storeInventoryItems(items) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      try {
        const transaction = this.db.transaction('inventoryItems', 'readwrite');
        const store = transaction.objectStore('inventoryItems');
        let completed = 0;
        items.forEach(item => {
          const request = store.put(item);
          request.onsuccess = () => {
            completed++;
            if (completed === items.length) {
              console.log(`✅ Stored ${items.length} inventory items locally`);
              resolve();
            }
          };
          request.onerror = () => {
            console.error('Failed to store inventory item:', request.error);
            reject(request.error);
          };
        });
        if (items.length === 0) resolve();
      } catch (error) {
        console.error('Error storing inventory items:', error);
        reject(error);
      }
    });
  }

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('📦 Upgrading database structure...');
        
        // Create employeeProfiles store
        if (!db.objectStoreNames.contains('employeeProfiles')) {
          console.log('Creating employeeProfiles store...');
          const employeeStore = db.createObjectStore('employeeProfiles', { keyPath: 'id' });
          employeeStore.createIndex('full_name', 'full_name', { unique: false });
          employeeStore.createIndex('email', 'email', { unique: true });
          
          // Add default test employee
          const testEmployee = {
            id: crypto.randomUUID(),
            full_name: 'Test Employee',
            email: 'test@example.com',
            role: 'employee'
          };
          
          employeeStore.add(testEmployee);
          console.log('✅ Added test employee to store');
        }
        
        // Create ticketSequence store
        if (!db.objectStoreNames.contains('ticketSequence')) {
          const ticketStore = db.createObjectStore('ticketSequence', { keyPath: 'id' });
          ticketStore.add({ id: 'current', lastNumber: 0 });
        }
        
        // Create pendingChanges store
        if (!db.objectStoreNames.contains('pendingChanges')) {
          db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  getAllEmployees() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]); // Return empty if DB not ready
        return;
      }

      try {
        const transaction = this.db.transaction('employeeProfiles', 'readonly');
        const store = transaction.objectStore('employeeProfiles');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const employees = request.result || [];
          console.log(`✅ Found ${employees.length} employees in local DB`);
          resolve(employees);
        };
        
        request.onerror = () => {
          console.error('Failed to get employees:', request.error);
          resolve([]); // Resolve with empty array on error
        };
      } catch (error) {
        console.error('Error accessing employee store:', error);
        resolve([]); // Resolve with empty array on error
      }
    });
  }

  storeEmployeeProfile(profile) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction('employeeProfiles', 'readwrite');
        const store = transaction.objectStore('employeeProfiles');
        const emailIndex = store.index('email');
        const emailQuery = emailIndex.get(profile.email);

        emailQuery.onsuccess = () => {
          if (emailQuery.result) {
            // Employee with this email already exists, skip insert
            console.log(`⚠️ Employee with email ${profile.email} already exists, skipping insert.`);
            resolve();
          } else {
            // Insert new employee
            const request = store.put({
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              role: profile.role
            });
            request.onsuccess = () => {
              console.log(`✅ Stored employee profile: ${profile.full_name}`);
              resolve();
            };
            request.onerror = () => {
              console.error('Failed to store employee:', request.error);
              reject(request.error);
            };
          }
        };
        emailQuery.onerror = () => {
          console.error('Error checking employee email:', emailQuery.error);
          reject(emailQuery.error);
        };
      } catch (error) {
        console.error('Error storing employee:', error);
        reject(error);
      }
    });
  }

  getNextTicketNumber() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        const timestamp = Date.now().toString().slice(-3);
        resolve(timestamp.padStart(3, '0'));
        return;
      }

      try {
        const transaction = this.db.transaction(['ticketSequence'], 'readwrite');
        const store = transaction.objectStore('ticketSequence');
        const request = store.get('current');
        
        request.onsuccess = () => {
          const data = request.result || { id: 'current', lastNumber: 0 };
          const nextNumber = (data.lastNumber + 1).toString().padStart(3, '0');
          store.put({ ...data, lastNumber: data.lastNumber + 1 });
          resolve(nextNumber);
        };
        
        request.onerror = () => {
          console.error('Error getting next ticket number:', request.error);
          const timestamp = Date.now().toString().slice(-3);
          resolve(timestamp.padStart(3, '0'));
        };
      } catch (error) {
        console.error('Error getting next ticket number:', error);
        const timestamp = Date.now().toString().slice(-3);
        resolve(timestamp.padStart(3, '0'));
      }
    });
  }
}

export const localDB = new LocalDB();