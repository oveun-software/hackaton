# Docker Desktop startup recovery on Windows

This repair applies to a specific startup failure: Docker reports `initializing Inference manager` with an inaccessible `dockerInference` socket, or `initializing Secrets Engine` with an inaccessible `engine.sock`. Check the actual backend log before applying it. A generic Zetaris connection failure does not establish this cause.

On 27 October 2026, both zero-byte runtime sockets were stranded as Windows reparse points. Docker could not remove them and aborted before starting its Linux engine. The repair preserved the containing runtime folders under timestamped `.stale-*` names, allowing Docker to create fresh sockets. Docker then reported server version 29.1.2 and the existing Zetaris stack became healthy.

The folders are:

- `%LOCALAPPDATA%\Docker\run`, containing Docker's temporary communication sockets.
- `%LOCALAPPDATA%\docker-secrets-engine`, containing the Secrets Engine runtime socket. The inspected folder contained only `engine.sock`, not stored credentials.

## Recovery steps

1. Quit Docker Desktop, or run `docker desktop stop --force --timeout 20`. Confirm that neither `Docker Desktop` nor `com.docker.backend` remains in the process list. Do not rename active runtime folders.
2. Inspect the folders above. For the verified incident, their contents were only zero-byte socket/reparse entries. If other files are present, inspect them before proceeding.
3. Rename each affected **parent folder**, keeping it next to its original location with a unique name such as `run.stale-YYYYMMDD-HHMMSS` or `docker-secrets-engine.stale-YYYYMMDD-HHMMSS`. Preserve the contents. The blocked individual socket may reject file operations even when renaming its parent succeeds.
4. Start Docker Desktop normally. Verify the engine using `docker info`, then run `docker compose up -d --pull never` from your own Zetaris bundle directory. Check `docker compose ps`: postgres, driver, api and ui should become healthy. The init/bootstrap jobs may finish successfully instead of remaining running.
5. From TalentLens, run `npm run doctor -- --require-zetaris`, then `npm run verify:zetaris`. The doctor checks connectivity; the second command exercises actual candidate retrieval and model inference.

The verified repair did not reset Docker, unregister WSL distributions, change Docker security settings, prune objects or delete images, containers or volumes. Personal distribution/configuration files stay outside Git. Keep the preserved folders available for diagnosis; deleting them is not necessary to run the application.

Docker's own issue tracker describes the same socket failure and parent-folder workaround, with differing results across versions: [startup socket failure](https://github.com/docker/desktop-feedback/issues/460). This report supports the diagnosis but is not a guarantee for every Windows installation. The CLI stop options are documented in [Docker's reference](https://docs.docker.com/reference/cli/docker/desktop/stop/).
