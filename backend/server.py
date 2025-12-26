"""
ConfuSense Backend Server v4.0 — WebSocket Only
================================================
Flask + Flask-SocketIO
Added: confusion_confirmed, intervention events
"""

import eventlet
eventlet.monkey_patch()

import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import sqlite3
import logging

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ConfuSense')

# Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'confusense-secret-2024')
CORS(app, resources={r"/*": {"origins": "*"}})

# Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)

# Database
DATABASE_PATH = os.environ.get('DATABASE_PATH', 'confusense.db')

# In-memory store
active_rooms = {}


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            meeting_id TEXT,
            host_name TEXT,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS participant_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id TEXT,
            session_id TEXT,
            participant_id TEXT,
            participant_name TEXT,
            detection_enabled INTEGER DEFAULT 1,
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(meeting_id, participant_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS confusion_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id TEXT,
            participant_id TEXT,
