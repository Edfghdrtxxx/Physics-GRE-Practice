#!/usr/bin/env python3
"""Versioned disk snapshots of Physics GRE Prep Studio progress.

Writes the exact committed progress JSON the page already saved, wrapped in an
envelope (schema, time, epoch, rev, SHA-256). Does not replace the OrbitOS
status bridge and does not read or write ~/.orbitos/pgre-status.json.

This script is the writer. It is not installed, started, or registered by
shipping the pull request. Run it while studying, or install it later.

Install (manual, while studying):
  python3 tools/pgre-backup-helper.py --init
  # prints a token; paste it into Library -> Backup token
  python3 tools/pgre-backup-helper.py

Default directory: ~/.orbitos/pgre-backups/physics-gre/
Default bind: 127.0.0.1:4790
Override with PGRE_BACKUP_DIR, PGRE_BACKUP_PORT, PGRE_BACKUP_TOKEN.

Install as a LaunchAgent (needs an explicit decision; this PR does not):
  python3 tools/pgre-backup-helper.py --print-launchagent
  # review the plist, copy to ~/Library/LaunchAgents/com.pgre.backup-helper.plist
  # launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pgre.backup-helper.plist

Authentication: Authorization: Bearer <token> and X-PGRE-Client:
physics-gre-prep-studio. Origin: null is not enough.
"""

from __future__ import print_function

import hashlib
import json
import os
import re
import secrets
import sys
import tempfile
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("PGRE_BACKUP_PORT", "4790"))
BACKUP_DIR = Path(
    os.environ.get(
        "PGRE_BACKUP_DIR", "~/.orbitos/pgre-backups/physics-gre"
    )
).expanduser()
TOKEN_ENV = os.environ.get("PGRE_BACKUP_TOKEN", "").strip()
MAX_BODY_BYTES = 16 * 1024 * 1024
CLIENT_NAME = "physics-gre-prep-studio"
SCHEMA = 1
KIND = "pgre-progress-snapshot"
RECENT_KEEP = 12
DAILY_DAYS = 30
RATE_MAX = 30
RATE_WINDOW_S = 60
SNAP_NAME = re.compile(
    r"^snap-\d{8}T\d{6}Z-rev-\d+-[0-9a-f]{12}\.json$"
)


def utc_now():
    return datetime.now(timezone.utc)


def iso_z(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_dir(path):
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path, 0o700)


def write_atomically(path, payload):
    """Write payload, flush, fsync, chmod 0600, then replace."""
    ensure_dir(path.parent)
    fd, temporary_name = tempfile.mkstemp(
        dir=str(path.parent),
        prefix=".{0}.".format(path.name),
    )
    try:
        with os.fdopen(fd, "wb") as temporary_file:
            temporary_file.write(payload)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, path)
        os.chmod(path, 0o600)
    finally:
        try:
            os.unlink(temporary_name)
        except OSError:
            pass


def token_path():
    return BACKUP_DIR / ".token"


def load_token():
    if TOKEN_ENV:
        return TOKEN_ENV
    path = token_path()
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def init_token():
    ensure_dir(BACKUP_DIR)
    path = token_path()
    existing = ""
    try:
        existing = path.read_text(encoding="utf-8").strip()
    except OSError:
        existing = ""
    if existing:
        return existing
    token = secrets.token_hex(32)
    write_atomically(path, (token + "\n").encode("utf-8"))
    return token


def sha256_hex(data):
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def counts_from_state(state):
    def n_list(key):
        value = state.get(key)
        return len(value) if isinstance(value, list) else 0

    def n_map(key):
        value = state.get(key)
        return len(value) if isinstance(value, dict) else 0

    return {
        "attempts": n_list("attempts"),
        "cards": n_map("cards"),
        "cardReviews": n_list("cardReviews"),
        "mistakes": n_map("mistakes"),
        "exams": n_list("exams"),
    }


def snapshot_id(saved_at, rev, digest):
    # saved_at is YYYY-MM-DDTHH:MM:SSZ -> YYYYMMDDTHHMMSSZ
    stamp = (
        saved_at[0:4]
        + saved_at[5:7]
        + saved_at[8:10]
        + "T"
        + saved_at[11:13]
        + saved_at[14:16]
        + saved_at[17:19]
        + "Z"
    )
    return "snap-{0}-rev-{1}-{2}".format(stamp, int(rev), digest[:12])


def list_snapshot_files():
    if not BACKUP_DIR.is_dir():
        return []
    out = []
    for path in BACKUP_DIR.iterdir():
        if not path.is_file() or not SNAP_NAME.match(path.name):
            continue
        out.append(path)
    return out


def read_envelope(path):
    raw = path.read_bytes()
    envelope = json.loads(raw.decode("utf-8"))
    if not isinstance(envelope, dict):
        raise ValueError("envelope is not an object")
    return envelope


def metadata_of(path, envelope=None):
    if envelope is None:
        envelope = read_envelope(path)
    return {
        "id": path.name[:-5] if path.name.endswith(".json") else path.name,
        "file": path.name,
        "savedAt": envelope.get("savedAt"),
        "epoch": envelope.get("epoch"),
        "rev": envelope.get("rev"),
        "sha256": envelope.get("sha256"),
        "counts": envelope.get("counts") or {},
        "origin": envelope.get("origin"),
    }


def prune_snapshots(keep_path):
    """Keep the 12 newest plus one daily file for 30 days. Prune only after
    another validated snapshot (keep_path) exists."""
    if keep_path is None or not keep_path.is_file():
        return
    files = list_snapshot_files()
    records = []
    for path in files:
        try:
            envelope = read_envelope(path)
            saved_at = str(envelope.get("savedAt") or "")
            records.append((saved_at, path.name, path))
        except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError):
            continue
    records.sort()
    keep = set()
    for _saved_at, _name, path in records[-RECENT_KEEP:]:
        keep.add(path)
    cutoff = utc_now() - timedelta(days=DAILY_DAYS)
    latest_by_day = {}
    for saved_at, _name, path in records:
        day = saved_at[:10]
        try:
            day_dt = datetime.strptime(day, "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            continue
        if day_dt < cutoff:
            continue
        latest_by_day[day] = path
    for path in latest_by_day.values():
        keep.add(path)
    keep.add(keep_path)
    if not keep:
        return
    for _saved_at, _name, path in records:
        if path not in keep:
            try:
                path.unlink()
            except OSError:
                pass


class RateLimiter(object):
    def __init__(self):
        self.events = deque()

    def allow(self):
        now = time.time()
        while self.events and now - self.events[0] > RATE_WINDOW_S:
            self.events.popleft()
        if len(self.events) >= RATE_MAX:
            return False
        self.events.append(now)
        return True


LIMITER = RateLimiter()


def constant_time_eq(left, right):
    if not isinstance(left, str) or not isinstance(right, str):
        return False
    if len(left) != len(right):
        return False
    return secrets.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def extract_token(handler):
    auth = handler.headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return (handler.headers.get("X-PGRE-Backup-Token") or "").strip()


class BackupHandler(BaseHTTPRequestHandler):
    server_version = "PGREBackupHelper/1.0"
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super(BackupHandler, self).end_headers()

    def send_json(self, status, payload):
        if not isinstance(payload, (bytes, bytearray)):
            payload = (
                json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
                + "\n"
            ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, status, message):
        self.send_json(status, {"ok": False, "error": message})

    def authorized(self):
        expected = load_token()
        if not expected:
            self.send_error_json(503, "backup token is not initialized")
            return False
        client = (self.headers.get("X-PGRE-Client") or "").strip()
        if client != CLIENT_NAME:
            self.send_error_json(401, "studio client header required")
            return False
        provided = extract_token(self)
        if not provided or not constant_time_eq(provided, expected):
            self.send_error_json(401, "invalid backup token")
            return False
        return True

    def do_OPTIONS(self):
        parsed = urlparse(self.path)
        if parsed.path != "/pgre-backup":
            self.send_error_json(404, "not found")
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, X-PGRE-Client, X-PGRE-Backup-Token",
        )
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        super(BackupHandler, self).end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/pgre-backup":
            self.send_error_json(404, "not found")
            return
        if not self.authorized():
            return
        query = parse_qs(parsed.query)
        snap_id = (query.get("id") or [""])[0].strip()
        if snap_id:
            name = snap_id if snap_id.endswith(".json") else snap_id + ".json"
            if not SNAP_NAME.match(name):
                self.send_error_json(400, "invalid snapshot id")
                return
            path = BACKUP_DIR / name
            try:
                envelope = read_envelope(path)
            except FileNotFoundError:
                self.send_error_json(404, "snapshot not found")
                return
            except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError):
                self.send_error_json(400, "snapshot unreadable")
                return
            blob = envelope.get("blob")
            digest = envelope.get("sha256")
            if not isinstance(blob, str) or not isinstance(digest, str):
                self.send_error_json(400, "snapshot envelope incomplete")
                return
            if sha256_hex(blob) != digest:
                self.send_error_json(409, "checksum mismatch")
                return
            self.send_json(200, envelope)
            return
        snapshots = []
        for path in list_snapshot_files():
            try:
                snapshots.append(metadata_of(path))
            except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError):
                continue
        snapshots.sort(key=lambda row: str(row.get("savedAt") or ""), reverse=True)
        self.send_json(200, {"ok": True, "snapshots": snapshots})

    def read_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            content_length = -1
        if content_length < 0:
            return None, 411
        if content_length > MAX_BODY_BYTES:
            if content_length > 0:
                remaining = content_length
                while remaining > 0:
                    chunk = self.rfile.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
            return None, 413
        return self.rfile.read(content_length), 0

    def do_POST(self):
        parsed = urlparse(self.path)
        raw_body, body_error = self.read_body()
        if parsed.path != "/pgre-backup":
            self.send_error_json(404, "not found")
            return
        if not self.authorized():
            return
        if body_error == 411:
            self.send_error_json(411, "Content-Length required")
            return
        if body_error == 413:
            self.send_error_json(413, "backup body too large")
            return
        if not LIMITER.allow():
            self.send_error_json(429, "too many backup requests")
            return
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error_json(400, "invalid JSON")
            return
        if not isinstance(body, dict):
            self.send_error_json(400, "body must be a JSON object")
            return
        if body.get("client") != CLIENT_NAME:
            self.send_error_json(401, "studio client field required")
            return
        if body.get("schema") != SCHEMA or body.get("kind") != KIND:
            self.send_error_json(400, "unsupported snapshot schema")
            return
        blob = body.get("blob")
        digest = body.get("sha256")
        if not isinstance(blob, str) or not blob:
            self.send_error_json(400, "blob (committed JSON string) required")
            return
        if not isinstance(digest, str) or len(digest) != 64:
            self.send_error_json(400, "sha256 required")
            return
        actual = sha256_hex(blob)
        if actual != digest.lower():
            self.send_error_json(400, "checksum mismatch")
            return
        try:
            state = json.loads(blob)
        except (ValueError, json.JSONDecodeError):
            self.send_error_json(400, "blob is not JSON")
            return
        if not isinstance(state, dict):
            self.send_error_json(400, "committed state must be an object")
            return
        epoch = body.get("epoch", state.get("_epoch", 0))
        rev = body.get("rev", state.get("_rev", 0))
        try:
            epoch = int(epoch)
            rev = int(rev)
        except (TypeError, ValueError):
            self.send_error_json(400, "epoch and rev must be numbers")
            return
        saved_at = body.get("savedAt")
        if not isinstance(saved_at, str) or len(saved_at) < 19:
            saved_at = iso_z(utc_now())
        origin = body.get("origin")
        if not isinstance(origin, str):
            origin = ""
        snap_id = snapshot_id(saved_at, rev, actual)
        path = BACKUP_DIR / (snap_id + ".json")
        envelope = {
            "schema": SCHEMA,
            "kind": KIND,
            "savedAt": saved_at,
            "origin": origin,
            "epoch": epoch,
            "rev": rev,
            "sha256": actual,
            "counts": counts_from_state(state),
            "blob": blob,
        }
        payload = (
            json.dumps(envelope, ensure_ascii=False, separators=(",", ":"))
            + "\n"
        ).encode("utf-8")
        write_atomically(path, payload)
        prune_snapshots(path)
        ack = {
            "ok": True,
            "id": snap_id,
            "file": path.name,
            "savedAt": saved_at,
            "sha256": actual,
            "epoch": epoch,
            "rev": rev,
            "counts": envelope["counts"],
        }
        self.send_json(200, ack)

    def log_message(self, message_format, *args):
        print(
            "{0} - {1}".format(self.address_string(), message_format % args),
            file=sys.stderr,
            flush=True,
        )


def print_launchagent():
    helper = str(Path(__file__).resolve())
    backup_dir = str(BACKUP_DIR)
    plist = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pgre.backup-helper</string>
  <key>ProgramArguments</key>
  <array>
    <string>{python}</string>
    <string>{helper}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PGRE_BACKUP_DIR</key>
    <string>{backup_dir}</string>
    <key>PGRE_BACKUP_PORT</key>
    <string>4790</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
""".format(python=sys.executable, helper=helper, backup_dir=backup_dir)
    print(plist)
    print(
        "Copy to ~/Library/LaunchAgents/com.pgre.backup-helper.plist and run:\n"
        "  launchctl bootstrap gui/$(id -u) "
        "~/Library/LaunchAgents/com.pgre.backup-helper.plist",
        file=sys.stderr,
    )


def main(argv):
    if "--help" in argv or "-h" in argv:
        print(__doc__)
        return 0
    if "--print-launchagent" in argv:
        print_launchagent()
        return 0
    if "--init" in argv:
        token = init_token()
        print("Backup directory: {0}".format(BACKUP_DIR))
        print("Token: {0}".format(token))
        print("Paste the token into Library -> Backup token, then start:")
        print("  python3 tools/pgre-backup-helper.py")
        return 0
    token = load_token()
    if not token:
        print(
            "No backup token. Run: python3 tools/pgre-backup-helper.py --init",
            file=sys.stderr,
        )
        return 1
    ensure_dir(BACKUP_DIR)
    server = ThreadingHTTPServer((HOST, PORT), BackupHandler)
    print(
        "Physics GRE backup helper listening on http://{0}:{1}; "
        "writing to {2}".format(HOST, PORT, BACKUP_DIR),
        file=sys.stderr,
        flush=True,
    )
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
