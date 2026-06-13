import sqlite3
import os
from contextlib import contextmanager


class DatabaseManager:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        self.db_path = "data/cybershield.db"
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.create_tables()

    @contextmanager
    def get_connection(self):
        """Context manager để phone_scanner dùng 'with self.db.get_connection() as conn'"""
        try:
            yield self.conn
        except Exception:
            self.conn.rollback()
            raise

    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                target TEXT,
                score INTEGER,
                level TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                target TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_history_target ON history(target)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target)')
        self.conn.commit()

    def get_stats(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM reports")
        total_reports = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM history WHERE level IN ('Nguy hiểm', 'Cao', 'Nguy cơ cao') AND type='website'")
        dangerous_web = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM history WHERE level IN ('Nguy hiểm', 'Nguy cơ cao') AND type='email'")
        leaked_email = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM history WHERE level IN ('Nguy hiểm', 'Nguy cơ cao') AND type='phone'")
        reported_phones = cursor.fetchone()[0]
        return {
            "total_reports": total_reports,
            "dangerous_web": dangerous_web,
            "leaked_email": leaked_email,
            "reported_phones": reported_phones
        }

    def get_recent_reports(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT type, target, description, created_at FROM reports ORDER BY created_at DESC LIMIT 10")
        rows = cursor.fetchall()
        return [{"type": r[0], "target": r[1], "description": r[2], "created_at": r[3]} for r in rows]

    def add_history(self, t_type, target, score, level):
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO history (type, target, score, level) VALUES (?, ?, ?, ?)",
                       (t_type, target, score, level))
        self.conn.commit()

    def add_report(self, r_type, target, description):
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO reports (type, target, description) VALUES (?, ?, ?)",
                       (r_type, target, description))
        self.conn.commit()

    def reset_all_data(self):
        """Xoá toàn bộ lịch sử và báo cáo, reset stats về 0"""
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM history")
        cursor.execute("DELETE FROM reports")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('history', 'reports')")
        self.conn.commit()
