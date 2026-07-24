# Code Standards

The following skills are mandatory engineering standards. Load and apply them before implementation or code review.

## Required skills

- **`tdd`** — drive behavioral changes with isolated, observable tests; work in failing-test / implementation / passing-test cycles.
- **`typescript-best-practices`** — apply the repository's TypeScript conventions, including naming, type safety, module structure, and test colocation.
- **`riteway-test-naming`** — name Vitest/Jest tests with unit-only `describe` blocks and `given …: should …` test descriptions.

## Implementation

Before changing implementation code, load `tdd` and `typescript-best-practices`. Load `riteway-test-naming` whenever adding or editing unit tests.

## Code review

Code review **must load all three skills** — `tdd`, `typescript-best-practices`, and `riteway-test-naming` — and assess the change against their applicable requirements. A review that has not loaded them is incomplete.
