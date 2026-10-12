# Local development artifact policy

- Keep task-owned temporary scripts, builds, caches, logs, and test evidence under `.dev/runs/<YYYYMMDD-task>/`. Create the run directory only when the task needs it; do not add empty placeholder directories.
- Keep diagnostic material across tasks under `.dev/retained/`, creating it only when needed. Add a nearby `README.md` that records its originating task/date, contents and provenance, reason for retention, sensitivity, and a cleanup condition. Do not copy credentials, tokens, cookies, or session transcripts there unless the task explicitly authorizes it.
- If an isolated run must live outside the repository, use a Risk Advisor-specific task directory under the system temporary area, record its exact path in the task notes or report, and remove that task-owned directory when finished. Never use the real `~/.dsh`, the formal installed plugin, or another project's directory as a scratch workspace.
- At task end, remove only regenerable artifacts created by that task in its own run directory. Preserve necessary diagnostic evidence with its retention reason, and never remove pre-existing ignored or untracked files as incidental cleanup.
- Do not move, replace, or delete existing `lib/`, `node_modules/`, package archives, or other existing project data without explicit task authorization.
- Keep product source, tests, validation code, build configuration, dependency declarations, and necessary documentation trackable. Stage only files required by the task; do not use broad staging that could include local artifacts.
