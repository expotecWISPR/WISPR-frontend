#!/usr/bin/env python3
"""Simulated CTF target: opens configurable fake TCP ports with banners.

Reads TARGET_PORTS_JSON, a JSON array like:
  [{"port": 80, "banner": "HTTP/1.1 200 OK\\r\\n...\\r\\n"}, ...]

Each port accepts a connection, writes the banner once, then keeps the
socket open briefly so tools like nmap -sV can fingerprint it. This is a
recon-flavor prop for the lab, not a full protocol implementation.
"""
import json
import os
import socketserver
import threading

DEFAULT_PORTS = [
    {"port": 8080, "banner": "HTTP/1.1 200 OK\r\nServer: wispr-lab/1.0\r\n\r\n<html>practice target</html>"},
]


def load_ports():
    raw = os.environ.get("TARGET_PORTS_JSON", "")
    try:
        parsed = json.loads(raw) if raw else DEFAULT_PORTS
        if isinstance(parsed, list) and parsed:
            return parsed
    except Exception:
        pass
    return DEFAULT_PORTS


def make_handler(banner):
    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            try:
                self.request.sendall(banner.encode("utf-8", "replace"))
                self.request.settimeout(2)
                self.request.recv(1024)
            except Exception:
                pass
    return Handler


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    servers = []
    for entry in load_ports():
        port = int(entry.get("port", 0))
        banner = str(entry.get("banner", ""))
        if not port:
            continue
        srv = ThreadedTCPServer(("0.0.0.0", port), make_handler(banner))
        servers.append(srv)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        print(f"[target] listening on {port}")
    if not servers:
        print("[target] no ports configured, idling")
    threading.Event().wait()


if __name__ == "__main__":
    main()
