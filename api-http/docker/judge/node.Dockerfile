# JavaScript — Node.js 12, matching Judge0 language id 63 (Node.js 12.14.0).
#
# Node 12 is long EOL and its Docker Hub tags are archived. That is acceptable
# here (no network, no persistence, no secrets in the container) and is the
# version every submission in the replay corpus was judged against. If the tag
# ever disappears, treat the upgrade as a deliberate change with its own replay
# rather than a silent bump — Array#sort stability and Intl behaviour both moved
# after 12.
#
# Pin by digest before Phase 6 (see cpp.Dockerfile).
FROM node:12-slim

# The base image ships a `node` user already; reuse it rather than adding one.
USER node
WORKDIR /work
