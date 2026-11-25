"""Background file system watcher using watchdog."""

import asyncio
import logging
from pathlib import Path
from typing import Callable, Optional

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)


class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, callback: Callable[[str, str], None]):
        super().__init__()
        self.callback = callback

    def on_created(self, event):
        if not event.is_directory:
            self.callback("created", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self.callback("deleted", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self.callback("modified", event.src_path)


class FileWatcherManager:
    """Manages per-user watchdog observers."""

    def __init__(self):
        self._observers: dict[int, Observer] = {}
        self._callbacks: dict[int, Callable] = {}

    def start(self, user_id: int, path: str, callback: Callable[[str, str], None]) -> bool:
        self.stop(user_id)
        p = Path(path)
        if not p.exists():
            return False

        handler = FileChangeHandler(callback)
        observer = Observer()
        observer.schedule(handler, str(p.resolve()), recursive=True)
        observer.start()
        self._observers[user_id] = observer
        self._callbacks[user_id] = callback
        logger.info("Watcher started for user %s on %s", user_id, path)
        return True

    def stop(self, user_id: int) -> None:
        obs = self._observers.pop(user_id, None)
        self._callbacks.pop(user_id, None)
        if obs:
            obs.stop()
            obs.join(timeout=5)
            logger.info("Watcher stopped for user %s", user_id)


watcher_manager = FileWatcherManager()
