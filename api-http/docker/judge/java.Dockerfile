# Java — OpenJDK 13.0.1, matching Judge0 language id 62 exactly.
#
# JDK 13 was a non-LTS release, so most of its tags are gone from Docker Hub:
# `13`, `13-jdk`, `13-slim` and `13-jdk-slim` all 404. The point-release tag
# survives and happens to be the precise build Judge0 ran, so this is an exact
# toolchain match rather than an approximation. No -slim variant exists; the
# larger image is worth an exact match during migration.
#
# If this tag ever disappears, the fallback is eclipse-temurin:17-jdk — but that
# is a REAL behaviour change (switch expressions, text blocks, different GC
# ergonomics), so run the Phase 5 replay before trusting it, not after.
#
# Pin by digest before Phase 6 (see cpp.Dockerfile).
FROM openjdk:13.0.1

RUN useradd --create-home --shell /usr/sbin/nologin judge
USER judge
WORKDIR /work
