# C++ — GCC 9, matching Judge0 language id 54 (GCC 9.2.0).
#
# Pin by digest before Phase 6: a silent upstream retag would change verdicts
# with no diff to review. `docker/judge/build.sh --print-digests` emits the
# lines to paste here.
FROM gcc:9

# Precompile <bits/stdc++.h>.
#
# The generated C++ harness always includes it (util/boilerplate/judgeBoilerplate.ts),
# and parsing that header costs ~1.5s on EVERY C++ submission. Precompiling makes
# it a memory-map instead.
#
# GCC finds a PCH by looking for `<header>.gch` beside the header on the include
# path, hence the /opt/pch/bits layout plus `-I/opt/pch` at compile time.
#
# The flags below MUST match LANGUAGE_SPECS.cpp.compile exactly. GCC silently
# ignores a PCH built with different flags — no warning, no error, just the slow
# path back. If C++ compiles get slower, check this first.
RUN mkdir -p /opt/pch/bits \
    && cp /usr/local/include/c++/9.*/x86_64-linux-gnu/bits/stdc++.h /opt/pch/bits/stdc++.h 2>/dev/null \
    || cp "$(find / -name stdc++.h -path '*bits*' -print -quit)" /opt/pch/bits/stdc++.h
RUN g++ -std=gnu++14 -x c++-header /opt/pch/bits/stdc++.h -o /opt/pch/bits/stdc++.h.gch \
    && test -f /opt/pch/bits/stdc++.h.gch

# Unprivileged execution user. The container also runs with --user, --cap-drop
# ALL and --read-only; this is defence in depth, not the only control.
RUN useradd --create-home --shell /usr/sbin/nologin judge
USER judge
WORKDIR /work
