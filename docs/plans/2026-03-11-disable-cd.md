# Disable CD Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Temporarily disable the CD job in both backend and frontend GitHub Actions workflows while keeping CI running.

**Architecture:** Add `if: false` to the `cd` job in each repo's `cicd.yml`. CI continues unchanged. One commit per repo pushed directly to main.

**Tech Stack:** GitHub Actions YAML

---

### Task 1: Disable CD in backend

**Files:**
- Modify: `backend/.github/workflows/cicd.yml:43`

**Step 1: Add `if: false` to the `cd` job**

In `.github/workflows/cicd.yml`, find the `cd:` job definition and add `if: false` immediately below it:

```yaml
  cd:
    name: Continuous Deployment
    runs-on: ubuntu-latest
    needs: ci
    if: false
```

**Step 2: Commit and push to main**

```bash
cd /home/rzgholizadeh/Workspaces/onemployment/backend
git add .github/workflows/cicd.yml docs/plans/2026-03-11-disable-cd-design.md docs/plans/2026-03-11-disable-cd.md
git commit -m "chore: temporarily disable CD pipeline while AWS infrastructure is down"
git push origin main
```

Expected: push succeeds, GitHub Actions shows CI running and CD skipped.

---

### Task 2: Disable CD in frontend

**Files:**
- Modify: `frontend/.github/workflows/cicd.yml:46`

**Step 1: Add `if: false` to the `cd` job**

In `.github/workflows/cicd.yml`, find the `cd:` job definition and add `if: false` immediately below it:

```yaml
  cd:
    name: Continuous Deployment
    runs-on: ubuntu-latest
    needs: ci
    if: false
```

**Step 2: Commit and push to main**

```bash
cd /home/rzgholizadeh/Workspaces/onemployment/frontend
git add .github/workflows/cicd.yml docs/plans/2026-03-11-disable-cd-design.md docs/plans/2026-03-11-disable-cd.md
git commit -m "chore: temporarily disable CD pipeline while AWS infrastructure is down"
git push origin main
```

Expected: push succeeds, GitHub Actions shows CI running and CD skipped.

---

## Re-enabling later

Remove the `if: false` line from both `cicd.yml` files, commit, and push.
