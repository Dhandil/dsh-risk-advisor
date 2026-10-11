# Phase 15.3A synthetic browser fixture

This validation-only fixture mounts the real exported React components from the source-identified `lib/client.js` artifact and lets that artifact install its embedded production CSS Modules. It supplies the actual pinned-Harness `Button`, `Modal`, `StateDot`, `Tag`, and clipboard modules from tracked source at `ddefc45fbc7f8e46dd73185e68295696d1297887` through the external-module seam used by the supported browser bundle. React and ReactDOM are deduplicated to the Risk Advisor workspace instance. The full Harness module table and normal Web host are not started.

All bridge/store clients are in-memory synthetic adapters. They never call RPC or any Harness API. The conspicuous banner is part of every captured state. The approval example renders only the Risk Advisor detail extension; it does not render or simulate Allow/Reject controls. The fixture is not a substitute for the normal Harness Web host or evidence of Host classification.

Run from the repository root with `node validation/phase15-3/run.mjs`. The runner starts Vite on loopback and a fresh temporary-profile installed Google Chrome process. Chrome request interception only continues requests to that exact loopback origin and fails other page requests. It writes at most seven PNGs into the Phase 15.3A evidence directory and removes its temporary browser profile when it exits.
