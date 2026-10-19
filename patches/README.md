# Local dependency security guards

These patches mitigate two currently unpatched upstream advisories without changing
package names or versions, suppressing audit entries, or migrating site tooling.

- `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm: parsed brace/parenthesis nesting is capped at
  128 blocks; compile, expand and stringify also bound recursive AST traversal.
  Quoted, escaped and bracketed literal braces do not count as parsed nesting.
  Inputs exceeding the limit produce a deliberate `SyntaxError` before native
  stack exhaustion. This limit does not change brace-expansion cardinality or
  replace the existing range/input-length limits.
- `sprintf-js@1.0.3`, GHSA-hp3w-g68c-fv3c: numeric precision must fit the supported
  Node runtime's bounds (`e`/`f`: 0–100; `g`: 1–100). Invalid precision produces a
  deliberate `SyntaxError` before argument functions or numeric formatters run.
  String precision and normal numeric output retain their existing behavior.
  Callers processing untrusted formats must still catch invalid-format errors,
  as required for the package's other invalid-placeholder errors.

`npm install`/`npm ci` run `scripts/apply-dependency-security-patches.mjs` through
`postinstall`. The script verifies the package version and original SHA-256,
uses unique literal replacements, and verifies the resulting SHA-256. It checks
all targets before writing, supports repeated execution, and fails closed if an
upstream package changes. Dependencies installed with `--ignore-scripts` must
run the patch script explicitly before use. `npm run security:patch-check`
verifies installed patch checksums without editing files.

`npm run test:dependency-security` exercises valid output, literal nesting,
under-length-limit malicious patterns, direct/cyclic ASTs, precision boundaries,
and manipulated formatter caches. These tests are also part of `npm test`.

Keep the upstream npm audit findings in reports until the packages publish
patched releases. Review source/API changes before updating these package
versions. Once an upstream fix is adopted and its adversarial tests pass, remove
that package's local patch entries; do not bypass version/hash verification.
