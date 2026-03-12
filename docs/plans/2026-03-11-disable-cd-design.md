# Design: Temporarily Disable CD Pipeline

**Date**: 2026-03-11

## Context

AWS infrastructure (ECS Fargate, ECR, RDS, ALB) is temporarily disabled. CD must not run while infrastructure is down.

## Change

Add `if: false` to the `cd` job in `.github/workflows/cicd.yml`.

- CI continues to run on PRs and pushes to main (lint, build, tests)
- CD job is skipped (shown as skipped in GitHub Actions UI)

## Re-enabling

Remove the `if: false` line when infrastructure is restored.
