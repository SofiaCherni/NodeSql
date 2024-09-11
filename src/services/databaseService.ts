import sqlite3 from 'sqlite3';

class DatabaseService {
    private db: sqlite3.Database;

    constructor() {
        this.db = new sqlite3.Database('mydatabase.db');
        this.initializeDatabase();
    }

    initializeDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)', (err: Error | null) => {
                if (err) reject(err);
                else resolve(); 
            });
        });
    }

    createItem(name: string): Promise<{ id: number, name: string }> {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO items (name) VALUES (?)', [name], function (this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, name });
            });
        });
    }

    getItems(): Promise<{ items: { id: number, name: string }[] }> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM items', (err: Error | null, rows: { id: number, name: string }[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ items: rows });
            });
        });
    }

    getItemById(id: number): Promise<{ id: number, name: string } | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM items WHERE id = ?', [id], (err: Error | null, row: { id: number, name: string } | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    updateItem(id: number, name: string): Promise<{ id: number, name: string }> {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE items SET name = ? WHERE id = ?', [name, id], function (this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id, name });
            });
        });
    }

    deleteItem(id: number): Promise<{ id: number }> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM items WHERE id = ?', [id], function (this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id });
            });
        });
    }
}

export default new DatabaseService();