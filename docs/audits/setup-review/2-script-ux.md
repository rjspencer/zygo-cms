# 2. Setup Script UX Review

Line numbers refer to `scripts/setup.mjs`. Source: static read of the full script; the script was not run.

## Walkthrough
- `pnpm setup` runs pnpm's built-in command, not the script. `package.json:25` defines `"setup"`, so only `pnpm run setup` works.
- Startup runs `console.clear()` (L913), a banner, and a silent `npx wrangler whoami` (L918) that takes `accounts[0]`.
- There are 14-18 prompts (L939-1183) and no summary screen before the "Proceed?" confirm (L1185).
- Spinner stages follow: D1, R2, wrangler edits, migrations, Access, zone settings, redirect.
- Deploy is asked about separately (L1276).
- The outro (L1299) prints three URLs and two next steps.

## Friction, ranked by impact
1. **Name collision.** `pnpm setup` never reaches the wizard (`package.json:25`). Rename the script or document `pnpm run setup`.
2. **Failures hidden and "Complete!" always shown.**
   - Migration failure is caught inside the helper (L352), so the spinner still says "Migrations applied".
   - R2 failure is only a warning (L339).
   - Zone, Bot Fight and AI crawl fetch results are never checked (L730-772).
   - A build or deploy failure still reaches the success outro (L1293-1299), with no non-zero exit.
   - Fix: helpers return ok/fail, print a final per-step summary, and exit non-zero on failure.
3. **Garbled spinner output.** Helpers `console.log` inside active clack spinners (L291, L330, L345, L432+, L1200-1269). Step labels [1/5], [2/5] and [4/5] are misnumbered, and 7 stages are shown. Use clack `log.*` or print after `s.stop()`.
4. **Secrets are echoed.** The API token (L1009) and Google client secret (L1066) use visible `text()`. The env token is prefilled via `initialValue` (L1011). Use `password()` and don't prefill.
5. **Config written after the deploy decision.** CF_ACCESS_AUD, team domain and CF_ZONE_ID are written to wrangler.toml (L702-707, L1246). If the user declines deploy (L1276), the admin API is not configured and the outro doesn't say so. The L1185 confirm text "provisioning and deployment" is misleading. Ask about deploy up front, or print "run `pnpm run deploy` to apply".
6. **No non-interactive or CI mode.** No `--help`, `--yes` or flags; only the account ID and token come from env vars. The legacy `promptInput`/`promptYesNo` (L872-910) are dead code and reference an undefined `input`, so they would throw. Delete them, add flags, and fail fast without a TTY.
7. **Re-runs are only partly idempotent.**
   - D1, R2, Access apps and policies, and IdPs are safe to repeat.
   - Answers aren't remembered, so the user retypes ~15 prompts. Persist them to a gitignored file (no secrets), or read defaults back from the tomls.
   - `ensureZeroTrustOrganization` is called twice (L1029 and L1220).
8. **Raw error messages.** Wrangler stderr is hidden (L320). If whoami fails because the user isn't logged in, it returns null silently (L83), so the user is just asked for an account ID. API errors dump raw JSON (L466, L504, L571). Check login up front and map common error codes to one-line fixes.
9. **No preflight.** Nothing checks token validity or scopes, or that the zone exists. A missing zone only shows as "Could not fetch Zone ID... Skipping" (L1267), and the user silently loses zone settings, the redirect and CF_ZONE_ID (needed for cache purge). Verify the token and zone right after the prompts.
10. **Prompt clarity and validation.**
    - Subdomain prompts show no resulting-host preview.
    - Subdomain labels aren't validated (L955, L981, L993).
    - `config.domain` stores the raw input, not the `validateDomain` result (L947), so "https://example.com/" is stored as typed.
    - The apex options "serve_both" and "redirect_to_apex" both map to the same two routes (L134-135).
    - The Google prompt doesn't show the redirect URI to register: `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`.
    - The token prompt doesn't list the required scopes. They only appear on a 1010 error (L457-464).
11. **Too many options up front.** The AI crawl, WAF and 6-item performance prompts lengthen the path. The Bot Fight and AI crawl calls PUT to the same bot_management endpoint (L744, L762), so the second may override the first. Offer "Recommended / Customize", and check the responses.
12. **Accessibility and colour.** `console.clear()` loses scrollback (L913), and emoji are used throughout. Most status lines are uncoloured `console.log`, so success and warning look alike. Drop the clear and use text prefixes plus consistent colours.
13. **Cancel handling is inconsistent.** Early prompts print "Setup cancelled" (L946), later ones exit silently (L1063+). Cancel exits 0, and `main()` has no top-level catch (L1311).
14. **Thin done screen.** It shows the apex as the public URL even when the apex redirects or isn't served (L1301). It omits the OTP/PIN first-login flow, the DNS and certificate wait, and a re-run hint. It also omits the Access AUD/team values written to the tomls and the fact that `workers_dev` is false.

## Quick wins
#1, #4, #2/#3 together, #6 flags and `--help`, and #10 normalising the domain and previewing hosts.
