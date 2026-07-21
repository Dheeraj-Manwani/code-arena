# Python — 3.8, matching Judge0 language id 71 (Python 3.8.1).
#
# Pin by digest before Phase 6 (see cpp.Dockerfile).
FROM python:3.8-slim

# PYTHONDONTWRITEBYTECODE: /work is mounted read-only, so .pyc writes would fail
# noisily on every run. PYTHONUNBUFFERED: the harness communicates through
# stdout markers — buffered output that is lost when a container is killed for
# TLE would turn a partial pass into a spurious runtime_error.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --shell /usr/sbin/nologin judge
USER judge
WORKDIR /work
