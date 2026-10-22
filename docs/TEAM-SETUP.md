# Team setup

Everyone can work on the same source repository without sharing personal accounts or passwords. Each developer supplies their own credentials locally. Repository access alone does not grant access to anyone's Google, NVIDIA or Zetaris account.

## Each developer's machine

1. Clone the repository and install Node.js 22.16+ and the dependencies with `npm ci`.
2. Install Nightshift from [Meterless](https://meterless.ai/windows.html). Generate your own NVIDIA API key and save it in Nightshift's Providers settings. The submitted app does not need the NVIDIA key.
3. Start Nightshift, then run `npm run setup`. This creates a private `.env` from `.env.example` if needed and imports the token issued by Nightshift on this computer. Existing settings are preserved. After rotating the runtime token, use `npm run setup -- --refresh-token`.

   The live-tested text-CV configuration uses `nvidia/nemotron-3.5-lightning-30b-a3b`, the **fast** TalentLens application profile, and only that NVIDIA model enabled in compute sources. Leave privacy and cross-check settings unchanged. Nightshift's application profile can override the requested model, so confirm the actual model with `npm run doctor -- --infer`. The setup script preserves existing model choices; update `METERLESS_MODEL` manually if you previously selected Super VL.
4. Create your own [Zetaris Cloud account](https://cloud.enterprise.zetaris.com/register). On Run locally, obtain your own distribution and registry sign-in. The portal requires acknowledging that the registry credentials are personal and must not be shared. The repository contains neither the distribution nor anyone's registry credentials.
5. Follow Zetaris's [local installation guide](https://github.com/zetaris/getting-started/blob/main/docs/install/updated_zetaris_installation_guide.md). Windows uses Docker Desktop with WSL2. Allow at least 8 GB of memory, 4 CPUs and 15 GB of free disk space. Set your own administrator password before the first startup, keep the matching supplied image/configuration files together, and keep them outside Git.
6. In the local Zetaris instance, obtain the organization ID and create a dedicated GENERAL user with SELECT only on the candidate view; generate an API key while signed in as that user. Keys inherit the user's permissions. Put `ZETARIS_ORG_ID`, `ZETARIS_API_KEY` and the view name in your private `.env`. See the [fictional-source recipe](../examples/zetaris/README.md) for the tested view/grant steps. Track the key's expiry and renew it locally.
7. Run `npm run doctor`. Both services must report online and the selected Nemotron model must be advertised. `npm run doctor -- --infer` also sends a small JSON test through Nightshift. It sends no CVs and makes no hiring decisions.
8. Run `npm start` and open `http://127.0.0.1:4317`. Keep Nightshift and Zetaris running while using live integrations.

## Shared Zetaris instance

A shared instance can use separate named users and roles. Its administrator grants each developer only the required data access and each developer generates their own API key. Do not share an administrator login or personal image-registry login. Account, role and licensing availability depends on the instance and entitlement; verify these before choosing a shared deployment. [Zetaris user management](https://kbase.zetaris.com/knowledge/user-management).

TalentLens currently binds to localhost and has no multi-user authentication. Run one local TalentLens workspace per developer. A shared remote Zetaris endpoint must use HTTPS. Do not expose the local app or Nightshift runtime publicly to make it a team service.

## What belongs in Git

Commit source, configuration templates, tests, synthetic examples and setup instructions. `.env`, `.env.*` except `.env.example`, `.secrets/`, `data/`, local databases, installers and service credentials stay on each developer's machine. `npm run secrets:check` checks shared source for credential files and recognized secret patterns; CI runs it without provider keys. This scan is a guardrail, not a guarantee that arbitrary credentials cannot be committed.

Do not put personal keys in README examples, issues, PR descriptions, screenshots or demo recordings. If a credential reaches a commit or public output, revoke it and generate a replacement before continuing.

## Delivery status

Passing local service checks is separate from the hackathon's functional requirements. A working Meterless Engine feature, real data retrieval from Zetaris, an evidence-led workflow, and final submission materials must all be demonstrated. See [submission notes](SUBMISSION.md) for the verified status.
