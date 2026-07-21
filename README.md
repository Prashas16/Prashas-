# December Trip Board

A shared website for planning your December trips with friends — add trips, photos, and
see them on a map, all from the page itself.

## 1. Put it on GitHub

1. Go to https://github.com and create a new **public** repository (e.g. `december-trip`).
2. Upload these files to the repo root: `index.html`, `style.css`, `script.js`, `trips.json`.
3. Repo → **Settings → Pages** → Source: `Deploy from a branch`, branch `main`, folder `/ (root)`. Save.
4. Your site goes live at `https://[your-username].github.io/[repo-name]/` within a minute or two.

Open `script.js` and check the three lines near the top match your repo:

```js
const REPO_OWNER = 'your-github-username';
const REPO_NAME = 'your-repo-name';
const REPO_BRANCH = 'main';
```

## 2. Add friends as collaborators

Repo → **Settings → Collaborators → Add people** → enter their GitHub username or email.
They'll need a free GitHub account (github.com/join), nothing else.

## 3. Editing trips on the site

Anyone can **view** the board without any setup. To **add or edit** a trip, each person needs
their own GitHub token, connected once in their own browser:

1. Click the ⚙ icon (top right of the page).
2. Follow the steps shown there: GitHub → Settings → Developer settings → Personal access
   tokens → **Fine-grained tokens** → create one scoped to just this repo, with
   **Contents: read and write** permission.
3. Paste the token in and click **Save token**.

That's it — the "+ Add a trip" button and the pencil icon on each card become clickable,
and saving a trip commits straight to `trips.json` on GitHub.

**About the token:** it's stored only in that person's own browser (`localStorage`) and is
sent only to GitHub's API — never to any other server, never shared with other visitors.
Each friend does this once on their own device.

## 4. Photos and maps

- When adding or editing a trip, paste a **photo URL** in the "Photo URL" field — any direct
  image link works (right-click an image online → "Copy image address"). If left blank, the
  card shows a simple placeholder instead.
- Every card has a **View map** button that shows an embedded map for that destination —
  no setup needed, it just uses the destination name you typed.

## 5. If someone doesn't want to set up a token

They can still view the board freely. To add a trip without a token, they can just edit
`trips.json` directly on GitHub (click the file → pencil icon → edit → commit), following the
same JSON format used in the file.

## Local preview (optional)

```
python3 -m http.server 8000
```
then visit `http://localhost:8000`. Note: token-based saving requires the site to actually be
on GitHub Pages (or any HTTPS host) since GitHub's API needs a proper origin — local preview
works fine for viewing, layout, and the map toggle.
