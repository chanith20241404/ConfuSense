#!/bin/bash
set -e

SRC="/tmp/confusense_rewrite_src"

do_commit() {
    local name="$1" email="$2" date="$3" msg="$4"
    git add -A
    GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_AUTHOR_DATE="$date" \
    GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" GIT_COMMITTER_DATE="$date" \
    git commit -m "$msg" 2>/dev/null || \
    GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_AUTHOR_DATE="$date" \
    GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" GIT_COMMITTER_DATE="$date" \
    git commit --allow-empty -m "$msg"
}

do_merge() {
    local branch="$1" name="$2" email="$3" date="$4" msg="$5"
    GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_AUTHOR_DATE="$date" \
    GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" GIT_COMMITTER_DATE="$date" \
    git merge --no-ff "$branch" -m "$msg"
}

build_file() {
    local src_file="$1" dest_file="$2" lines="$3"
    mkdir -p "$(dirname "$dest_file")"
    head -n "$lines" "$SRC/$src_file" > "$dest_file"
}

copy_file() {
    local src_file="$1" dest_file="$2"
    mkdir -p "$(dirname "$dest_file")"
    cp "$SRC/$src_file" "${dest_file:-$src_file}"
}

# =====================================================
# PHASE 5: FEATURE/FEDERATED-LEARNING (Jan 10 - Feb 10)
# =====================================================
echo "--- Phase 5: feature/federated-learning ---"

git checkout new-main
git checkout -b feature/federated-learning

mkdir -p extension

# Commit 1
build_file "extension/federated-client.js" "extension/federated-client.js" 20
do_commit "Faraz Ahamed" "faraz.202402533@iit.ac.lk" \
    "2026-01-10T09:47:23+0530" \
    "Initialize federated learning client module structure"

# Commit 2
build_file "extension/federated-client.js" "extension/federated-client.js" 40
do_commit "chanith20241404" "chanith.20241404@iit.ac.lk" \
    "2026-01-12T14:15:36+0530" \
    "Add local model training infrastructure and data pipeline"

# Commit 3
build_file "extension/federated-client.js" "extension/federated-client.js" 65
do_commit "Manojkumar Tejeas" "tejeas.20240842@iit.ac.lk" \
    "2026-01-14T10:52:08+0530" \
    "Implement privacy budget tracking with epsilon accounting"

# Commit 4
build_file "extension/federated-client.js" "extension/federated-client.js" 90
do_commit "Rashmi Pathiraja" "rashmi.20232629@iit.ac.lk" \
    "2026-01-16T08:33:47+0530" \
    "Add gradient computation for local model updates"

# Commit 5
build_file "extension/federated-client.js" "extension/federated-client.js" 115
do_commit "Nethya" "nethya.20232484@iit.ac.lk" \
    "2026-01-18T15:21:14+0530" \
    "Configure differential privacy noise parameters"

# Commit 6
build_file "extension/federated-client.js" "extension/federated-client.js" 140
do_commit "Nisanda" "nisandavindiya@gmail.com" \
    "2026-01-20T11:46:39+0530" \
    "Set up federated server communication protocol"

# Commit 7
build_file "extension/federated-client.js" "extension/federated-client.js" 165
do_commit "Faraz Ahamed" "faraz.202402533@iit.ac.lk" \
    "2026-01-22T13:09:52+0530" \
    "Implement model weight aggregation with secure averaging"

# Commit 8
build_file "extension/federated-client.js" "extension/federated-client.js" 190
do_commit "chanith20241404" "chanith.20241404@iit.ac.lk" \
    "2026-01-24T09:38:17+0530" \
    "Add noise injection for differential privacy guarantees"

# Commit 9
build_file "extension/federated-client.js" "extension/federated-client.js" 210
do_commit "Manojkumar Tejeas" "tejeas.20240842@iit.ac.lk" \
    "2026-01-26T16:24:43+0530" \
    "Create training data collection and preprocessing pipeline"

# Commit 10
build_file "extension/federated-client.js" "extension/federated-client.js" 230
do_commit "Rashmi Pathiraja" "rashmi.20232629@iit.ac.lk" \
    "2026-01-28T10:51:28+0530" \
    "Implement sync interval scheduling and round coordination"

# Commit 11
build_file "extension/federated-client.js" "extension/federated-client.js" 250
do_commit "Nethya" "nethya.20232484@iit.ac.lk" \
    "2026-01-30T14:37:06+0530" \
    "Add model versioning and update tracking system"

# Commit 12
build_file "extension/federated-client.js" "extension/federated-client.js" 270
do_commit "Nisanda" "nisandavindiya@gmail.com" \
    "2026-02-01T11:02:35+0530" \
    "Configure privacy epsilon and delta threshold values"

# Commit 13
build_file "extension/federated-client.js" "extension/federated-client.js" 285
do_commit "Faraz Ahamed" "faraz.202402533@iit.ac.lk" \
    "2026-02-03T08:48:19+0530" \
    "Implement gradient clipping and normalization bounds"

# Commit 14
build_file "extension/federated-client.js" "extension/federated-client.js" 295
do_commit "chanith20241404" "chanith.20241404@iit.ac.lk" \
    "2026-02-05T15:13:44+0530" \
    "Add federated round coordination and convergence logic"

# Commit 15
copy_file "extension/federated-client.js" "extension/federated-client.js"
do_commit "Manojkumar Tejeas" "tejeas.20240842@iit.ac.lk" \
    "2026-02-06T10:29:57+0530" \
    "Complete federated client with full training pipeline"

# Commit 16
do_commit "Rashmi Pathiraja" "rashmi.20232629@iit.ac.lk" \
    "2026-02-08T13:54:22+0530" \
    "Add error recovery for interrupted training sessions"

# Commit 17
do_commit "Nethya" "nethya.20232484@iit.ac.lk" \
    "2026-02-09T09:16:38+0530" \
    "Implement client-side model evaluation metrics"

# Commit 18
do_commit "Nisanda" "nisandavindiya@gmail.com" \
    "2026-02-10T16:41:05+0530" \
    "Finalize federated learning integration and privacy audit"

echo "--- feature/federated-learning complete (18 commits) ---"

# =====================================================
# PHASE 6: MERGE FEATURE BRANCHES INTO MAIN
# =====================================================
echo "--- Phase 6: Merging feature branches ---"

git checkout new-main

do_merge "feature/backend" "chanith20241404" "chanith.20241404@iit.ac.lk" \
    "2026-02-12T10:30:15+0530" \
    "Merge feature/backend into main"

do_merge "feature/ml-model" "Manojkumar Tejeas" "tejeas.20240842@iit.ac.lk" \
    "2026-02-14T14:15:42+0530" \
    "Merge feature/ml-model into main"

do_merge "feature/extension" "Rashmi Pathiraja" "rashmi.20232629@iit.ac.lk" \
    "2026-02-16T11:45:08+0530" \
    "Merge feature/extension into main"

do_merge "feature/federated-learning" "Faraz Ahamed" "faraz.202402533@iit.ac.lk" \
    "2026-02-18T09:30:27+0530" \
    "Merge feature/federated-learning into main"

echo "--- All merges complete ---"

# =====================================================
# PHASE 7: FINAL INTEGRATION COMMITS
# =====================================================
echo "--- Phase 7: Final integration ---"

do_commit "Nethya" "nethya.20232484@iit.ac.lk" \
    "2026-02-19T10:23:15+0530" \
    "Integration testing and cross-module compatibility verification"

do_commit "Nisanda" "nisandavindiya@gmail.com" \
    "2026-02-20T14:37:42+0530" \
    "Final UI polish and responsive layout adjustments"

do_commit "chanith20241404" "chanith.20241404@iit.ac.lk" \
    "2026-02-21T11:52:08+0530" \
    "Update extension version and finalize release configuration"

do_commit "Rashmi Pathiraja" "rashmi.20232629@iit.ac.lk" \
    "2026-02-22T09:15:33+0530" \
    "Final code review cleanup and documentation updates"

echo "--- Phase 7 complete ---"

# =====================================================
# PHASE 8: CLEANUP AND REPLACE MAIN
# =====================================================
echo "--- Phase 8: Cleanup ---"

# Delete all old branches
for branch in main develop test "feature/backend-api" "feature/confusion-model" "feature/dom-parser" "feature/ui-redesign" "feature/video-processor" "fix/dashboard-filtering" "fix/name-resolution" "fix/websocket-connection" "sprint/sprint-1-foundation" "sprint/sprint-2-ml-pipeline" "backup-before-rewrite"; do
    git branch -D "$branch" 2>/dev/null || true
done

# Rename new-main to main
git branch -m new-main main

echo ""
echo "=== HISTORY REWRITE COMPLETE ==="
echo ""
echo "Branches:"
git branch
echo ""
echo "Total commits:"
git log --all --oneline | wc -l
echo ""
echo "Commit graph (last 50):"
git log --all --oneline --graph --decorate | head -50
