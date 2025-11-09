mode: agent
## Refactor Code Guidelines

### Core Intent
- Prioritise clarity, maintainability, and reuse; refactors should make behaviour easier to understand, modify, and extend.
- Ensure every change reduces technical debt (rigidity, fragility, immobility, unnecessary complexity) while keeping behaviour intact.
- Optimise for readability first; defer micro-optimisations unless a proven hotspot exists.

### Detecting Code Smells
- **Rigidity**: A small behavioural tweak forces edits across unrelated modules; look for hidden couplings or missing abstractions.
- **Complexity**: Logic requires excessive mental effort (deep nesting, magic flows, duplicated algorithms); prefer straightforward, intention-revealing structures.
- **Fragility**: Recent fixes trigger regressions; add tests around unstable paths before altering them.
- **Immobility**: Useful behaviour cannot be reused without copy/paste; isolate shared logic into well-named helpers or modules.

### Refactor Principles
- **DRY**: Consolidate duplicated behaviour behind shared functions, traits, or hooks; keep variants parameterised with explicit context.
- **KISS**: Replace clever constructs with simple control flow; express decisions through readable branches or pattern matches.
- **YAGNI**: Remove unused features, parameters, and dead branches discovered during refactors; keep interfaces minimal.
- **SRP**: Split mixed responsibilities into focused functions, components, or structs; ensure names reflect single intent.
- **Positive Paths**: Eliminate “Hadouken” conditionals with guard clauses; favour positive boolean expressions and extracted predicates (`is_ready?`, `eligible_for_offer`).
- **Encapsulation**: Wrap complex boolean logic or configuration-building inside named helpers to document intent.
- **No Flag Arguments**: Replace boolean parameters with descriptive enums/strings or dedicated functions that encode behaviour.
- **Naming**: Rename symbols to communicate purpose; prefer pronounceable, searchable identifiers aligned with domain language.
- **Vertical Formatting**: Organise files top-to-bottom—high-level flows first, helpers nearby, related logic grouped together.
- **Deletion Beats Addition**: Prefer removing redundant code over layering new indirections; simplify APIs when possible.
- **Boy Scout Rule**: Leave each touched file cleaner—consistent formatting, clarified names, removed dead code.

### Workflow Expectations
- Add or update tests around refactored behaviour (Rust unit tests, TypeScript Jest/RTL) to prove correctness.
- Replace comments that explain “what” with clearer code; keep only “why” comments when intent cannot be encoded directly.
- Use existing logging (`tracing` on backend) and hook patterns on the frontend; avoid ad hoc I/O or globals.
- Ensure new abstractions integrate with project state models (backend `AppState`, frontend hooks/reducers) and preserve REST contracts.
- Document notable architectural changes in relevant README/protocol notes when behaviour or interfaces shift.

### Trade-offs
- Prefer maintainable designs over premature optimisation; only pursue performance tweaks with data.
- Maintain backwards compatibility unless the refactor explicitly targets contract changes; coordinate frontend/backed adjustments together.

