# Source publication record

The maintainer authorized a new public repository and an update of the existing private repository on 2026-10-19.

## Repository separation

- Public source: https://github.com/ironlegends/music-downloader
- Legacy private development history: https://github.com/ironlegends/music-converter

The public repository is initialized independently from the reviewed source files. It does not clone, fetch, share object storage with, or push refs from the private repository. Its initial history consists of one root commit. No legacy commits, tags, releases, issue bodies or raw audit assets are imported. The published source tree matches the updated private source tree.

The private repository retains its visibility and existing history. Its source update uses the repository's normal protected-branch pull request process. No force push, history rewrite, visibility change or legacy release deletion is part of this publication.

## Scope and evidence

This is an MIT source publication, not a new stable binary release or browser-store submission. Version 2.0.0 remains the legacy baseline; current changes remain Unreleased. Real Chrome/SpotMate QA on Windows and macOS remains PENDING, and Safari is deferred.

Publication validation checks the source snapshot without any .git directory, browser artifact generation, version metadata, source and fresh-history secret scans, public root-commit ancestry and source-tree identity between the repositories. Independent review covers this publication boundary separately from the earlier browser/release code review. Remote visibility, refs and commit identities are verified after upload.

The maintainer confirmed initial-script authorship and chose MIT. The source inventory consists of authored JavaScript, CSS, manifests, tests, tools and documentation. There are no declared npm dependencies, bundled music files, third-party logos or downloaded service scripts. Pinned GitHub Actions and the external service remain separate supply-chain dependencies. MIT grants no rights to third-party music or services.

The [readiness assessment](open-source-readiness.md) records the historical finding, coverage limits and remaining stable-release gates. Issue numbers in that assessment refer to the private legacy tracker; they are not issue numbers in the new public repository.
