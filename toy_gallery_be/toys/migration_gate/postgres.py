"""Reserved for v2: Postgres CandidatePipeline implementation.

See docs/migration-safety-plan.md, "v2: Postgres support" for the proposed
design. Two strategies are documented (separate database via CREATE DATABASE
WITH TEMPLATE, and schema rename) — both fit behind the same interface as
SqliteCandidatePipeline without changing the gate orchestration.

This module is intentionally empty in v1.
"""
