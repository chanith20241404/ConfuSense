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
