#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/scripts/github-tasks.manifest.json"

DRY_RUN=0
FORCE_CLOSED=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --force-closed) FORCE_CLOSED=1 ;;
  esac
done

if [[ "${SYNC_DRY_RUN:-}" == "1" ]]; then
  DRY_RUN=1
fi

if [[ "${SYNC_FORCE_CLOSED:-}" == "1" ]]; then
  FORCE_CLOSED=1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for parsing $MANIFEST" >&2
  exit 1
fi

is_ci() {
  [[ "${GITHUB_ACTIONS:-}" == "true" ]]
}

is_dry_run() {
  [[ "$DRY_RUN" -eq 1 ]]
}

is_force_closed() {
  [[ "$FORCE_CLOSED" -eq 1 ]]
}

has_gh_token() {
  [[ -n "${GH_TOKEN:-}" || -n "${GITHUB_TOKEN:-}" ]]
}

if ! is_ci && ! has_gh_token && ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

parse_remote_repo() {
  local url="$1"
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    echo "${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
}

resolve_repo() {
  local repo="" remote_url=""
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    echo "$GITHUB_REPOSITORY"
    return
  fi
  repo="$(gh repo view "$ROOT" --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
  if [[ -n "$repo" ]]; then
    echo "$repo"
    return
  fi
  remote_url="$(git -C "$ROOT" config --get remote.origin.url 2>/dev/null || true)"
  repo="$(parse_remote_repo "$remote_url")"
  if [[ -n "$repo" ]]; then
    echo "$repo"
    return
  fi
  jq -r '.repo' "$MANIFEST"
}

is_issue_number() {
  [[ "${1:-}" =~ ^[0-9]+$ ]]
}

verify_repo_access() {
  if is_ci || has_gh_token; then
    if ! gh api "repos/$REPO" --jq .full_name >/dev/null 2>&1; then
      echo "Cannot access repo: $REPO (token auth)" >&2
      exit 1
    fi
    echo "Token auth → $REPO" >&2
    return
  fi

  local login=""
  if ! login="$(gh api user --jq .login 2>/dev/null)"; then
    echo "GitHub auth failed. Run: gh auth login" >&2
    exit 1
  fi
  if ! gh api "repos/$REPO" --jq .full_name >/dev/null 2>&1; then
    echo "Cannot access repo: $REPO (authenticated as $login)" >&2
    echo "Check git remote and refresh scopes: gh auth refresh -s repo,project" >&2
    exit 1
  fi
  echo "Authenticated as $login → $REPO" >&2
}

closed_issue_error() {
  local issue_number="$1" id="$2"
  echo "Issue #$issue_number ($id) is closed and will not be updated." >&2
  echo "Reopen it manually or run: pnpm run sync:github-tasks:force" >&2
  exit 1
}

REPO="$(resolve_repo)"
PROJECT_TITLE="$(jq -r '.projectTitle' "$MANIFEST")"
PROJECT_OWNER="@me"

verify_repo_access

if is_dry_run; then
  echo "Dry run — no GitHub issues will be modified" >&2
fi

ensure_label() {
  local name="$1" color="$2" description="$3"
  local output=""
  if is_dry_run; then
    if gh label list --repo "$REPO" --json name --jq '.[].name' 2>/dev/null | grep -qx "$name"; then
      return 0
    fi
    echo "[dry-run] missing label: $name (would create on sync)" >&2
    return 0
  fi
  if output="$(gh label create "$name" --repo "$REPO" --color "$color" --description "$description" 2>&1)"; then
    echo "Label created: $name" >&2
    return 0
  fi
  if [[ "$output" == *"already exists"* ]]; then
    return 0
  fi
  echo "$output" >&2
  return 1
}

ensure_labels_from_manifest() {
  ensure_label "feature" "1D76DB" "Tracked feature from docs/features"
  ensure_label "status-deferred" "BFD4F2" "Deferred — revisit later"

  local phase_json id label name color
  while IFS= read -r phase_json; do
    id="$(jq -r '.id' <<<"$phase_json")"
    label="$(jq -r '.label // empty' <<<"$phase_json")"
    name="$(jq -r '.name // empty' <<<"$phase_json")"
    color="$(jq -r '.color // "5319E7"' <<<"$phase_json")"
    if [[ -z "$label" ]]; then
      if [[ "$id" == "0+" ]]; then
        label="phase-0+"
      else
        label="phase-$id"
      fi
    fi
    if [[ -z "$name" ]]; then
      name="Phase $id"
    fi
    ensure_label "$label" "$color" "$name"
  done < <(jq -c '.phases[]' "$MANIFEST")
}

phase_label() {
  local phase_id="$1"
  local label
  label="$(jq -r --arg id "$phase_id" '
    (.phases // [])
    | map(select(.id == $id))
    | .[0].label // empty
  ' "$MANIFEST")"
  if [[ -n "$label" ]]; then
    echo "$label"
    return
  fi
  if [[ "$phase_id" == "0+" ]]; then
    echo "phase-0+"
    return
  fi
  echo "phase-$phase_id"
}

ensure_labels_from_manifest

find_issue_number() {
  local id="$1"
  local num line
  num="$(gh issue list --repo "$REPO" --search "[$id] in:title" --state all --limit 1 --json number --jq '.[0].number // empty' 2>/dev/null || true)"
  if is_issue_number "$num"; then
    echo "$num"
    return 0
  fi
  line="$(gh issue list --repo "$REPO" --search "[$id] in:title" --state all --limit 1 2>/dev/null | head -1 || true)"
  num="$(awk 'NF && $1 ~ /^[0-9]+$/ { print $1; exit }' <<<"$line")"
  if is_issue_number "$num"; then
    echo "$num"
  fi
}

get_issue_state() {
  local issue_number="$1"
  gh issue view "$issue_number" --repo "$REPO" --json state --jq .state 2>/dev/null || true
}

issue_body() {
  local id="$1" phase="$2" status="$3" spec="$4"
  pnpm exec tsx "$ROOT/scripts/render-github-issue-body.ts" \
    --id "$id" \
    --phase "$phase" \
    --status "$status" \
    --spec "$spec" \
    --repo "$REPO" \
    --root "$ROOT"
}

create_issue_cli() {
  local full_title="$1" body="$2"
  shift 2
  local -a labels=("$@")
  local -a args=(issue create --repo "$REPO" -t "$full_title" -b "$body")
  local label url number
  for label in "${labels[@]}"; do
    args+=(-l "$label")
  done
  url="$(gh "${args[@]}" 2>/dev/null | tail -1)"
  number="${url##*/}"
  if ! is_issue_number "$number"; then
    echo "Failed to create issue (unexpected output): $url" >&2
    return 1
  fi
  echo "$number"
}

update_issue_cli() {
  local issue_number="$1" full_title="$2" body="$3"
  shift 3
  local -a labels=("$@")
  local label
  gh issue edit "$issue_number" --repo "$REPO" -t "$full_title" -b "$body" >/dev/null
  for label in "${labels[@]}"; do
    gh issue edit "$issue_number" --repo "$REPO" --add-label "$label" >/dev/null 2>&1 || true
  done
}

set_issue_state() {
  local issue_number="$1" state="$2"
  if [[ "$state" == "closed" ]]; then
    gh issue close "$issue_number" --repo "$REPO" >/dev/null 2>&1 || true
    return 0
  fi
  gh issue reopen "$issue_number" --repo "$REPO" >/dev/null 2>&1 || true
}

handle_closed_issue() {
  local issue_number="$1" id="$2" status="$3" full_title="$4"
  if [[ "$(get_issue_state "$issue_number")" != "CLOSED" ]]; then
    return 1
  fi
  if [[ "$status" == "done" ]] && ! is_force_closed; then
    if is_dry_run; then
      echo "[dry-run] skip closed #$issue_number — $full_title" >&2
    else
      echo "Skip closed #$issue_number — $full_title" >&2
    fi
    echo "$issue_number"
    return 0
  fi
  if is_force_closed; then
    return 1
  fi
  closed_issue_error "$issue_number" "$id"
}

sync_issue() {
  local id title phase status spec full_title body issue_number
  local -a labels
  id="$(jq -r '.id' <<<"$1")"
  title="$(jq -r '.title' <<<"$1")"
  phase="$(jq -r '.phase' <<<"$1")"
  status="$(jq -r '.status' <<<"$1")"
  spec="$(jq -r '.spec' <<<"$1")"
  full_title="[$id] $title"
  labels=("feature" "$(phase_label "$phase")")
  if [[ "$status" == "deferred" ]]; then
    labels+=("status-deferred")
  fi
  body="$(issue_body "$id" "$phase" "$status" "$spec")"
  issue_number="$(find_issue_number "$id")"

  if is_issue_number "$issue_number"; then
    if handle_closed_issue "$issue_number" "$id" "$status" "$full_title"; then
      return 0
    fi
  fi

  if is_dry_run; then
    if ! is_issue_number "$issue_number"; then
      echo "[dry-run] would create — $full_title" >&2
      return 0
    fi
    echo "[dry-run] would update #$issue_number — $full_title" >&2
    return 0
  fi

  if ! is_issue_number "$issue_number"; then
    issue_number="$(create_issue_cli "$full_title" "$body" "${labels[@]}")"
    echo "Created #$issue_number — $full_title" >&2
  else
    update_issue_cli "$issue_number" "$full_title" "$body" "${labels[@]}"
    echo "Updated #$issue_number — $full_title" >&2
  fi

  if [[ "$status" == "done" ]]; then
    set_issue_state "$issue_number" "closed"
  elif [[ "$status" == "todo" || "$status" == "deferred" ]]; then
    set_issue_state "$issue_number" "open"
  fi

  echo "$issue_number"
}

sync_project() {
  local issue_number="$1"
  local issue_url="https://github.com/$REPO/issues/$issue_number"
  if [[ -z "${PROJECT_NUMBER:-}" ]]; then
    return 0
  fi
  gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$issue_url" >/dev/null 2>&1 || true
}

if is_dry_run; then
  echo "Validating feature issues for $REPO ..."
else
  echo "Syncing feature issues to $REPO ..."
fi

ISSUE_NUMBERS=()
while IFS= read -r feature; do
  if is_dry_run; then
    sync_issue "$feature"
    continue
  fi
  num="$(sync_issue "$feature")"
  if ! is_issue_number "$num"; then
    echo "Aborting: invalid issue number for feature (got: $(printf '%q' "$num"))" >&2
    exit 1
  fi
  ISSUE_NUMBERS+=("$num")
done < <(jq -c '.features[]' "$MANIFEST")

if is_dry_run; then
  echo ""
  echo "Dry run complete — auth and issue sync checks passed."
  echo "Issues:  https://github.com/$REPO/issues?q=is%3Aissue+label%3Afeature"
  exit 0
fi

PROJECT_NUMBER=""
if is_ci; then
  echo "Skipped GitHub Project sync in CI (GITHUB_TOKEN has no project scope)" >&2
else
  if PROJECT_NUMBER="$(gh project list --owner "$PROJECT_OWNER" --format json --limit 100 2>/dev/null | jq -r --arg t "$PROJECT_TITLE" '.projects[] | select(.title == $t) | .number' | head -1)" && [[ -n "$PROJECT_NUMBER" ]]; then
    echo "Using existing project #$PROJECT_NUMBER — $PROJECT_TITLE" >&2
  elif PROJECT_URL="$(gh project create --owner "$PROJECT_OWNER" --title "$PROJECT_TITLE" --format json --jq .url 2>/dev/null)"; then
    PROJECT_NUMBER="${PROJECT_URL##*/}"
    echo "Created project: $PROJECT_URL" >&2
  else
    echo "Warning: skipped GitHub Project sync (needs gh with project support + project scope)" >&2
  fi

  GH_USER="$(gh api user --jq .login)"
  for num in "${ISSUE_NUMBERS[@]}"; do
    sync_project "$num"
  done
fi

echo ""
echo "Done."
echo "Issues:  https://github.com/$REPO/issues?q=is%3Aissue+label%3Afeature"
if [[ -n "${GH_USER:-}" && -n "$PROJECT_NUMBER" ]]; then
  echo "Project: https://github.com/users/$GH_USER/projects/$PROJECT_NUMBER"
fi
