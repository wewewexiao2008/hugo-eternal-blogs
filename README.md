# Bloc Publishment

This repository contains a Hugo site using the [Terminal theme](https://github.com/panr/hugo-theme-terminal). It captures project updates and longer write-ups for Bloc-related work in both English and Simplified Chinese.

## Prerequisites

1. [Install Go](https://go.dev/doc/install) (Hugo requires Go when installing from source).
2. Install [Hugo Extended](https://gohugo.io/installation/) (the Terminal theme relies on the extended build).
3. Confirm the installation:

   ```bash
   hugo version
   ```

## Local development

1. Clone this repository (with submodules):

   ```bash
   git clone --recurse-submodules https://github.com/wewewexiao2008/hugo-eternal-blogs.git
   ```

2. Start the local server from the project root:

   ```bash
   hugo server -D
   ```

   Visit `http://localhost:1313` to preview. Use the language switch in the header to swap between English (`/`) and Simplified Chinese (`/zh-cn/`).

## Publishing

Simply push your changes to the `main` branch. GitHub Actions will automatically:
- Build the Hugo site
- Deploy to GitHub Pages at https://wewewexiao2008.github.io/hugo-eternal-blogs/

No manual deployment steps needed.

## Content workflow

- English content lives in `content/en/`, Simplified Chinese content in `content/zh-cn/`.
- Create new posts with:

  ```bash
  hugo new en/posts/my-new-entry.md
  hugo new zh-cn/posts/my-new-entry.md  # optional translation
  ```

- Give translated files the same relative path so Hugo links them together (e.g., `content/en/posts/welcome.md` ↔ `content/zh-cn/posts/welcome.md`).
- Add tags and descriptions to keep listings useful, and update both languages to keep the language switch consistent.

