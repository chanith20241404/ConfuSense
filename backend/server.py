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
            participant_name TEXT,
            confusion_rate REAL,
            confirmed INTEGER DEFAULT 0,
            intervention_by TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ps_meeting ON participant_status(meeting_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_meeting ON sessions(meeting_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ce_meeting ON confusion_events(meeting_id)')

    conn.commit()
    conn.close()
    logger.info(f"Database initialized: {DATABASE_PATH}")


init_db()


# ==================== REST API ====================

@app.route('/')
def index():
    return jsonify({
        'name': 'ConfuSense API',
        'version': '4.1.0',
        'websocket': True,
        'rest_fallback': False,
        'active_rooms': len(active_rooms)
    })


@app.route('/api/health')
def health():
    active_count = sum(len(p) for p in active_rooms.values())
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'websocket': True,
        'active_participants': active_count
    })


@app.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.json or {}

    session_id = data.get('session_id') or str(uuid.uuid4())[:8]
    meeting_id = data.get('meeting_id', '')
    host_name = data.get('host_name', 'Unknown')

    db = get_db()
    cursor = db.cursor()

    cursor.execute('SELECT id FROM sessions WHERE meeting_id = ? AND is_active = 1', (meeting_id,))
    existing = cursor.fetchone()

    if existing:
        return jsonify({'success': True, 'session_id': existing['id'], 'meeting_id': meeting_id, 'existing': True})

    cursor.execute('INSERT INTO sessions (id, meeting_id, host_name) VALUES (?, ?, ?)',
                   (session_id, meeting_id, host_name))
    db.commit()

    if meeting_id not in active_rooms:
        active_rooms[meeting_id] = {}

    logger.info(f"Session created: {session_id}")
    return jsonify({'success': True, 'session_id': session_id, 'meeting_id': meeting_id})


@app.route('/api/sessions/by-meeting/<meeting_id>')
def get_session_by_meeting(meeting_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM sessions WHERE meeting_id = ? AND is_active = 1 ORDER BY start_time DESC LIMIT 1',
                   (meeting_id,))
    session = cursor.fetchone()

    if not session:
        return jsonify({'error': 'No session found'}), 404

    return jsonify({'success': True, 'session_id': session['id'], 'meeting_id': meeting_id})


# ==================== WEBSOCKET EVENTS ====================

@socketio.on('connect')
def handle_connect():
    logger.info(f"WS connected: {request.sid}")
    emit('connected', {'status': 'connected', 'sid': request.sid})


@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"WS disconnected: {request.sid}")

    for meeting_id, participants in list(active_rooms.items()):
        for pid, pdata in list(participants.items()):
            if pdata.get('sid') == request.sid:
                del active_rooms[meeting_id][pid]
                emit('participant_left', {
                    'participant_id': pid,
                    'participant_name': pdata.get('name', 'Unknown')
                }, room=meeting_id)


@socketio.on('join_meeting')
def handle_join_meeting(data):
    meeting_id = data.get('meeting_id')
    participant_id = data.get('participant_id')
    participant_name = data.get('participant_name', 'Unknown')
    role = data.get('role', 'student')
    detection_enabled = data.get('detection_enabled', True)

    if not meeting_id:
        emit('error', {'message': 'meeting_id required'})
        return

    if not participant_name or participant_name == 'Unknown':
        logger.warning(f"Rejecting join — name not resolved yet (pid={participant_id})")
        emit('error', {'message': 'name_not_resolved'})
        return

    join_room(meeting_id)
    logger.info(f"{participant_name} ({role}) joined {meeting_id}")

    if meeting_id not in active_rooms:
        active_rooms[meeting_id] = {}

    active_rooms[meeting_id][participant_id] = {
        'sid': request.sid,
        'name': participant_name,
        'role': role,
        'detection_enabled': detection_enabled
    }

    # Broadcast to room
    emit('participant_joined', {
        'participant_id': participant_id,
        'participant_name': participant_name,
        'role': role,
        'detection_enabled': detection_enabled
    }, room=meeting_id)

    # Send participant list to joiner
    participants_list = [
        {
            'participant_id': pid,
            'participant_name': pdata['name'],
            'role': pdata.get('role', 'student'),
            'detection_enabled': pdata.get('detection_enabled', True)
        }
        for pid, pdata in active_rooms[meeting_id].items()
    ]
    emit('participants_list', {'meeting_id': meeting_id, 'participants': participants_list})

    # Save to DB
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO participant_status (meeting_id, participant_id, participant_name, detection_enabled, last_update)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(meeting_id, participant_id) DO UPDATE SET last_update = CURRENT_TIMESTAMP
        ''', (meeting_id, participant_id, participant_name, 1 if detection_enabled else 0))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"DB error on join: {e}")


@socketio.on('leave_meeting')
def handle_leave_meeting(data):
    meeting_id = data.get('meeting_id')
    participant_id = data.get('participant_id')
    participant_name = data.get('participant_name', 'Unknown')

    if meeting_id and meeting_id in active_rooms:
        if participant_id in active_rooms[meeting_id]:
            del active_rooms[meeting_id][participant_id]
        if len(active_rooms[meeting_id]) == 0:
            del active_rooms[meeting_id]
            logger.info(f"Room {meeting_id} cleaned up — no participants remaining")

    leave_room(meeting_id)
    emit('participant_left', {
        'participant_id': participant_id,
        'participant_name': participant_name
    }, room=meeting_id)

    logger.info(f"{participant_name} left {meeting_id}")


@socketio.on('participant_status_update')
def handle_status_update(data):
    meeting_id = data.get('meeting_id')
    participant_id = data.get('participant_id')
    participant_name = data.get('participant_name', 'Unknown')
    detection_enabled = data.get('detection_enabled', True)

    if not participant_name or participant_name == 'Unknown':
        logger.warning(f"Rejecting status update — name not resolved (pid={participant_id})")
        return

    logger.info(f"*** WS STATUS: {participant_name} -> {detection_enabled} ***")

    if meeting_id in active_rooms and participant_id in active_rooms[meeting_id]:
        active_rooms[meeting_id][participant_id]['detection_enabled'] = detection_enabled

    emit('participant_status_changed', {
        'participant_id': participant_id,
        'participant_name': participant_name,
        'detection_enabled': detection_enabled,
        'timestamp': datetime.utcnow().isoformat()
    }, room=meeting_id, include_self=False)

    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO participant_status (meeting_id, participant_id, participant_name, detection_enabled, last_update)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(meeting_id, participant_id)
            DO UPDATE SET detection_enabled = excluded.detection_enabled, last_update = CURRENT_TIMESTAMP
        ''', (meeting_id, participant_id, participant_name, 1 if detection_enabled else 0))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"DB error: {e}")


@socketio.on('confusion_update')
def handle_confusion_update(data):
    meeting_id = data.get('meeting_id')
    emit('student_confusion_update', {
        'participant_id': data.get('participant_id'),
        'participant_name': data.get('participant_name'),
        'confusion_rate': data.get('confusion_rate', 0),
        'timestamp': datetime.utcnow().isoformat()
    }, room=meeting_id, include_self=False)


@socketio.on('confusion_confirmed')
def handle_confusion_confirmed(data):
    """When a student confirms they are confused via popup"""
    meeting_id = data.get('meeting_id')
    participant_id = data.get('participant_id')
    participant_name = data.get('participant_name', 'Unknown')
    confirmed = data.get('confirmed', True)

    logger.info(f"*** CONFUSION CONFIRMED: {participant_name} -> {confirmed} ***")

    # Save to DB
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO confusion_events (meeting_id, participant_id, participant_name, confusion_rate, confirmed)
            VALUES (?, ?, ?, ?, ?)
        ''', (meeting_id, participant_id, participant_name, data.get('confusion_rate', 0), 1 if confirmed else 0))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"DB error on confusion confirm: {e}")

    # Broadcast to tutor so they get the Intervene button immediately
    emit('confusion_confirmed', {
        'participant_id': participant_id,
        'participant_name': participant_name,
        'confirmed': confirmed,
        'confusion_rate': data.get('confusion_rate', 0),
        'timestamp': datetime.utcnow().isoformat()
    }, room=meeting_id, include_self=False)


@socketio.on('intervention')
def handle_intervention(data):
    """When a tutor intervenes for a student"""
    meeting_id = data.get('meeting_id')
    participant_id = data.get('participant_id')
    tutor_name = data.get('tutor_name', 'Tutor')
    cooldown_duration = data.get('cooldown_duration', 300000)

    logger.info(f"*** INTERVENTION: {tutor_name} -> {participant_id} ***")

    # Save to DB
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE confusion_events SET intervention_by = ?
            WHERE meeting_id = ? AND participant_id = ? AND intervention_by IS NULL
            ORDER BY timestamp DESC LIMIT 1
        ''', (tutor_name, meeting_id, participant_id))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"DB error on intervention: {e}")

    # Broadcast intervention to student (so they know tutor is helping)
    emit('intervention', {
        'participant_id': participant_id,
        'tutor_name': tutor_name,
        'cooldown_duration': cooldown_duration,
        'timestamp': datetime.utcnow().isoformat()
    }, room=meeting_id)


# ==================== MAIN ====================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))

    print("=" * 60)
    print("  ConfuSense Server v4.0.0")
    print("  WebSocket Only + Confusion Confirmed + Intervention")
    print("=" * 60)
    print(f"  Port: {port}")
    print("=" * 60)

    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)