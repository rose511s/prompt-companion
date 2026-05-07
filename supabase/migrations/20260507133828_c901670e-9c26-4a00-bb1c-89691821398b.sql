
DO $do$
DECLARE
  seed_user uuid;
BEGIN
  SELECT id INTO seed_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF seed_user IS NULL THEN RETURN; END IF;

  INSERT INTO public.prompts (user_id, title, description, content, category, tags, framework, is_public) VALUES

  (seed_user, 'Implement a Feature (CO-STAR)',
   'Generate production-ready code for a new feature with full context.',
$body$# Context
You are working on [PROJECT_NAME], a [PROJECT_TYPE] built with [TECH_STACK].

# Objective
Implement [FEATURE_NAME] that allows users to [USER_GOAL].

# Style
Follow [CODING_STANDARD] conventions. Prefer composition over inheritance.

# Tone
Concise, professional, no filler.

# Audience
Senior engineers reviewing the PR.

# Response Format
1. File-by-file changes in fenced code blocks.
2. Brief rationale (max 5 bullets).
3. Tests to add.$body$,
   'Development', ARRAY['feature','co-star','implementation'], 'CO-STAR', true),

  (seed_user, 'Refactor Legacy Module',
   'Refactor messy code into clean, testable modules.',
$body$Refactor the following [LANGUAGE] code from [FILE_PATH].

Goals:
- Reduce cyclomatic complexity below [MAX_COMPLEXITY].
- Extract pure functions for testability.
- Preserve public API: [PUBLIC_API].

Code:
[CODE]

Output:
1. Refactored code.
2. Diff summary.
3. Risks & migration notes.$body$,
   'Development', ARRAY['refactor','cleanup'], 'Custom', true),

  (seed_user, 'Pull Request Review',
   'Thorough, structured PR review.',
$body$Act as a senior [LANGUAGE] reviewer for [REPO_NAME].

Review the following diff for:
- Correctness and edge cases
- Performance (Big-O, N+1, allocations)
- Security (injection, authz, secrets)
- Readability and naming
- Test coverage gaps

Diff:
[DIFF]

Return findings grouped by severity (Blocker / Major / Minor / Nit) with file:line references and suggested fixes.$body$,
   'Code Review', ARRAY['pr','review','quality'], 'CO-STAR', true),

  (seed_user, 'Architectural Review of a Change',
   'Evaluate a PR against system architecture.',
$body$You are reviewing changes to [SERVICE_NAME] which is part of [SYSTEM_OVERVIEW].

Change description: [CHANGE_DESCRIPTION]

Evaluate:
1. Does it respect existing boundaries (modules: [MODULES])?
2. Coupling impact on [DOWNSTREAM_SERVICES]?
3. Backward compatibility for [API_CONSUMERS]?
4. Observability (logs/metrics/traces) added?

Output a verdict: APPROVE / REQUEST_CHANGES / REJECT with reasoning.$body$,
   'Code Review', ARRAY['architecture','review'], 'Chain-of-Thought', true),

  (seed_user, 'Debug Stack Trace',
   'Root-cause analysis from a stack trace plus context.',
$body$Act as a [LANGUAGE] debugging expert.

Error:
[STACK_TRACE]

Recent change: [RECENT_CHANGE]
Environment: [ENVIRONMENT]
Reproduction steps: [REPRO_STEPS]

Walk through step-by-step:
1. Identify the failing line and call path.
2. Hypothesize the top 3 root causes, ranked by likelihood.
3. Propose a fix with code.
4. Suggest a regression test.$body$,
   'Debugging', ARRAY['stacktrace','rca'], 'Chain-of-Thought', true),

  (seed_user, 'Production Incident Triage',
   'Rapid triage prompt for an active incident.',
$body$INCIDENT: [INCIDENT_TITLE]
Severity: [SEVERITY]
Service: [SERVICE_NAME]
Symptoms: [SYMPTOMS]
Recent deploys (last 24h): [RECENT_DEPLOYS]
Relevant metrics: [METRICS]
Relevant logs:
[LOGS]

Produce in under 2 minutes:
1. Most likely root cause (1 sentence).
2. Immediate mitigation (rollback / feature flag / scale).
3. Verification steps.
4. Comms update for stakeholders (2 sentences).$body$,
   'Debugging', ARRAY['incident','sre','triage'], 'CO-STAR', true),

  (seed_user, 'Generate a Dockerfile',
   'Production-grade multi-stage Dockerfile.',
$body$Generate a multi-stage Dockerfile for a [LANGUAGE] [APP_TYPE] application.

Requirements:
- Base image: [BASE_IMAGE]
- Build tool: [BUILD_TOOL]
- Run as non-root user [RUN_USER]
- Expose port [PORT]
- Healthcheck on [HEALTHCHECK_PATH]
- Final image must be under [MAX_SIZE_MB] MB
- Pin all versions

Output the Dockerfile and a .dockerignore.$body$,
   'DevOps & Infrastructure', ARRAY['docker','container'], 'Custom', true),

  (seed_user, 'Terraform Module Skeleton',
   'Scaffold a reusable Terraform module.',
$body$Create a Terraform module for [RESOURCE_TYPE] on [CLOUD_PROVIDER].

Inputs (variables): [INPUT_VARS]
Outputs: [OUTPUT_VARS]
Required tags: [REQUIRED_TAGS]
Provider version constraint: [PROVIDER_VERSION]

Deliverables:
- main.tf, variables.tf, outputs.tf, versions.tf
- README.md with usage example
- examples/basic/main.tf$body$,
   'DevOps & Infrastructure', ARRAY['terraform','iac'], 'Custom', true),

  (seed_user, 'README from Codebase',
   'Generate a complete README.md for a repo.',
$body$Generate a README.md for [PROJECT_NAME].

Source signals:
- Description: [DESCRIPTION]
- Tech stack: [TECH_STACK]
- Install command: [INSTALL_CMD]
- Run command: [RUN_CMD]
- Test command: [TEST_CMD]
- License: [LICENSE]

Sections required: Title plus badges, Overview, Features, Quickstart, Configuration ([ENV_VARS]), Project structure, Contributing, License.

Tone: clear, professional, scannable.$body$,
   'Documentation', ARRAY['readme','docs'], 'CO-STAR', true),

  (seed_user, 'API Endpoint Documentation',
   'Document a REST endpoint in OpenAPI-friendly prose.',
$body$Document the endpoint:

Method: [HTTP_METHOD]
Path: [PATH]
Purpose: [PURPOSE]
Auth: [AUTH_TYPE]
Request body: [REQUEST_SCHEMA]
Response 200: [RESPONSE_SCHEMA]
Error codes: [ERROR_CODES]

Produce:
1. One-paragraph summary.
2. Request example (curl plus JSON).
3. Response examples for success and each error.
4. Notes on rate limits, idempotency, and pagination.$body$,
   'Documentation', ARRAY['api','rest','openapi'], 'Custom', true),

  (seed_user, 'System Design Proposal',
   'Draft a system design doc for a new service.',
$body$Design [SYSTEM_NAME] to solve [PROBLEM_STATEMENT].

Constraints:
- Scale: [SCALE_REQUIREMENTS]
- Latency target: [LATENCY_TARGET]
- Consistency: [CONSISTENCY_MODEL]
- Budget: [BUDGET]

Reason step-by-step, then output:
1. Context and goals
2. Non-goals
3. High-level architecture (components plus data flow)
4. Data model
5. APIs
6. Failure modes and mitigations
7. Alternatives considered
8. Rollout plan$body$,
   'Architecture', ARRAY['design-doc','system-design'], 'Chain-of-Thought', true),

  (seed_user, 'Choose Between Two Architectures',
   'Trade-off analysis between two designs.',
$body$Compare [OPTION_A] vs [OPTION_B] for [USE_CASE].

Evaluation criteria (weighted): [CRITERIA_WITH_WEIGHTS]
Constraints: [CONSTRAINTS]

Produce:
1. Side-by-side comparison table.
2. Weighted scorecard.
3. Recommendation with justification.
4. Conditions under which the other option becomes preferable.$body$,
   'Architecture', ARRAY['tradeoff','decision'], 'Custom', true),

  (seed_user, 'Generate Unit Tests',
   'Comprehensive unit tests for a function.',
$body$Write [TEST_FRAMEWORK] unit tests for the following [LANGUAGE] function.

Function:
[CODE]

Cover:
- Happy path
- Edge cases: empty / null / boundary / large input
- Error paths
- Property-based ideas (if applicable)

Aim for [COVERAGE_TARGET] percent line coverage. Use AAA structure and descriptive names.$body$,
   'Testing', ARRAY['unit-test','coverage'], 'Few-Shot', true),

  (seed_user, 'E2E Test Plan',
   'Generate a realistic end-to-end test plan.',
$body$Build an E2E test plan for [FEATURE_NAME] in [APP_NAME] using [E2E_TOOL].

User flows to cover: [USER_FLOWS]
Critical assertions: [ASSERTIONS]
Test data strategy: [DATA_STRATEGY]
Environments: [ENVIRONMENTS]

Output:
1. Test matrix (flow x browser/device)
2. Test cases with steps and expected results
3. Setup/teardown notes
4. Flake-mitigation tactics$body$,
   'Testing', ARRAY['e2e','qa'], 'CO-STAR', true),

  (seed_user, 'Threat Model a Feature (STRIDE)',
   'STRIDE-based threat model for a new feature.',
$body$Threat model [FEATURE_NAME] in [SYSTEM_NAME].

Architecture summary: [ARCH_SUMMARY]
Trust boundaries: [TRUST_BOUNDARIES]
Sensitive data: [SENSITIVE_DATA]

For each STRIDE category (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege):
1. Identify concrete threats.
2. Rate likelihood/impact.
3. Propose mitigations mapped to controls.

Output a prioritized remediation backlog.$body$,
   'Security', ARRAY['threat-model','stride'], 'Chain-of-Thought', true),

  (seed_user, 'Security Code Audit',
   'Audit a snippet for common vulnerabilities.',
$body$Audit the following [LANGUAGE] code for security issues.

Code:
[CODE]

Context: [CONTEXT]

Check for: injection (SQL/NoSQL/command), XSS, SSRF, insecure deserialization, weak crypto, hardcoded secrets, insecure defaults, missing authz checks, race conditions, path traversal.

Return findings with: severity, CWE id, exploit scenario, and a fixed code snippet.$body$,
   'Security', ARRAY['audit','vulnerabilities'], 'Custom', true);
END
$do$;
