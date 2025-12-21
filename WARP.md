# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is a Hugo static site for Bloc Publishment, a bilingual blog (English/Simplified Chinese) using the Terminal theme. The site automatically translates content between languages using GitHub Actions and the Gemini API, then deploys to GitHub Pages.

## Key Architecture

### Bilingual Content System
- Content is organized by language: `content/en/` and `content/zh-cn/`
- Hugo's multilingual mode is configured in `config.toml` with language-specific menus, titles, and settings
- Language switching is handled automatically by Hugo's built-in language selector

### Content Organization
- **File Naming Convention**: English posts have no suffix (e.g., `welcome.md`), Chinese translations add `.zh-cn` suffix (e.g., `welcome.zh-cn.md`)
- **Directory Structure**: Both languages share the same directory structure, with Hugo automatically linking translations
- **Linked Translations**: Hugo automatically links translations when files share the same base name

### Deployment
- GitHub Actions workflow builds and deploys the site to GitHub Pages
- Hugo Extended v0.128.0 is required (Terminal theme uses SCSS)
- Site deploys to GitHub Pages automatically on push to `main`

## Common Commands

### Local Development
```bash
# Start local server with drafts
hugo server -D

# View at http://localhost:1313
# English: http://localhost:1313/
# Chinese: http://localhost:1313/zh-cn/
```

### Content Creation
```bash
# Create new English post
hugo new en/posts/my-post.md

# Create new Chinese post
hugo new zh-cn/posts/my-post.md
```

### Build
```bash
# Build for production
hugo --minify

# Output is in ./public/
```


## Project Structure

```
content/
├── en/           # English content
│   ├── posts/    # Blog posts
│   ├── about/    # About page
│   └── contact/  # Contact page
└── zh-cn/        # Chinese content (mirrors en/ structure)

.github/workflows/
└── hugo.yml       # Build and deployment workflow

config.toml        # Hugo configuration (languages, theme, menus)
themes/terminal/   # Git submodule for Terminal theme
```

## Working with Content

### Frontmatter Requirements
All posts must have:
```yaml
---
title: "Post Title"
date: 2025-12-20T10:00:00Z
description: "Brief description"
tags: ["tag1", "tag2"]
---
```



## Theme Customization

The Terminal theme is included as a Git submodule. When cloning:
```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Or initialize submodules after cloning
git submodule update --init --recursive
```

## Deployment Pipeline

1. Push markdown files to `main` branch
2. GitHub Actions workflow (`hugo.yml`) triggers
3. Hugo builds site with all languages
4. Deploys to GitHub Pages at https://wewewexiao2008.github.io/hugo-eternal-blogs/

## Environment Requirements

- **Hugo Extended** v0.128.0 or compatible (Terminal theme requires SCSS support)
## Custom Prompts

### /trans-check - Check & Translate Missing Files

Audit content directories for missing translations and fill gaps manually.

**Protocol**:

1. **Tree & Audit**:
   - Run `find content -name "*.md" -type f` to get full file list.
   - Compare `content/en/` vs `content/zh-cn/` to identify missing pairs.
   - Check if `article.md` exists but `article.zh-cn.md` (or vice-versa) is missing.

2. **Report**:
   - List all missing translation pairs (e.g., "Missing zh-cn for: content/en/posts/foo.md").
   - If no missing files found, stop.
   - If missing files found, ask user: "Should I translate these files?"

3. **Translate & Create**:
   - If user confirms:
     - For each missing file:
       - Read the source file (`read_files`).
       - Translate content preserving frontmatter/markdown (En <-> Zh).
       - Create the new file in the target directory (`create_file`).

4. **Verify & Commit**:
   - Ask user to verify created files.
   - Run `git add .` and `git commit -m "Add missing translations"`
   - Run `git push origin main`

**Example Usage**:
User: `/trans-check`
Agent: [Runs audit, reports missing files, translates, commits]

