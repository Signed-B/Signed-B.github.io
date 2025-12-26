# Repository Guidelines

## Current Repo Context
- Static site repo with `index.html`, `styles.css`, and `reservoir.js`.
- `render.js` exists and is intended to become the standardized build/render script.
- `CNAME` is present for GitHub Pages hosting.

## Site Goals
I am building a personal website. It will have a homepage, an about page, and a page called writing that has a list of all my articles. There will be a directory of markdown files for essays.

Here's the rub:
- The personal site is hosted on gh-pages.
- On deploy (which I want to be a clean process), I want the markdown files to be translated into html pages of a standard format matching the rest of the site.
- There will be multiple markdown files for each essay sometimes with a standard naming convention (essay-name.01.md, essay-name.02.md).
- The most recent file will be the main html file (i.e. /writing/essay-name/, and at the bottom will be a list of all the changes in order from most recent (highest number) to oldest, with a little line with dots on it on the side like a git changelog.
- By each dot will be the version number, date, and a description of the change.
- At the bottom of each MD file will be "------CHANGELOG -----
Date: 01-01-1970
Message: The message, as long as needed."
- When any of the changes are clicked, the link goes to /writing/essay-name/change?f=number, which shows the changes since the previous version. There will be a dropdown in the top right to compare it to a different change (.../change?f=number,s=number).
- The "/writing/" page will update automatically.
- There will be a standardized script to build everything on deploy (render.js, feel free to move it).
- There will also be an "/about/" and "/files/cv.pdf" file.

## Workflow Guardrails
Stay on the new-site branch, do not deploy.

## Workflow Expectations
- One logical change per commit.
- After each commit, wait for human-in-the-loop verification before starting the next change.
- Keep commits small and reversible; avoid unrelated refactors.
- Prefer `rg` for searches and `apply_patch` for single-file edits.
- Do not run networked commands without explicit approval.
