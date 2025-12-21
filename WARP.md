# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is a Hugo static site for Bloc Publishment, a bilingual blog (English/Simplified Chinese) using the Terminal theme. The site automatically translates content between languages using GitHub Actions and the Gemini API, then deploys to GitHub Pages.

## Key Architecture

### Bilingual Content System
- Content is organized by language: `content/en/` and `content/zh-cn/`
- Hugo's multilingual mode is configured in `config.toml` with language-specific menus, titles, and settings
- Language switching is handled automatically by Hugo's built-in language selector

### Automated Translation Pipeline
- **Translation Script**: `scripts/translate_content.py` detects source language using `langdetect`, calls Gemini API via custom endpoint, and creates translated markdown files
- **File Naming Convention**: English posts have no suffix (e.g., `welcome.md`), Chinese translations add `.zh-cn` suffix (e.g., `welcome.zh-cn.md`)
- **Workflow**: `.github/workflows/translate.yml` triggers on content changes, runs translation, commits results, and deploys
- **API Configuration**: Requires `GEMINI_API_KEY` and `GEMINI_ENDPOINT` as GitHub Secrets

### Deployment
- Two GitHub Actions workflows: `translate.yml` (translation + deployment) and `hugo.yml` (deployment only)
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

### Translation Testing (Local)
```bash
# Install Python dependencies
pip install requests python-frontmatter langdetect

# Set environment variables
export GEMINI_API_KEY="your-key"
export GEMINI_ENDPOINT="https://aihubmix.com/v1/chat/completions"

# Run translation script
python scripts/translate_content.py
```

## Project Structure

```
content/
├── en/           # English content
│   ├── posts/    # Blog posts
│   ├── about/    # About page
│   └── contact/  # Contact page
└── zh-cn/        # Chinese content (mirrors en/ structure)

scripts/
└── translate_content.py  # Gemini-based translation

.github/workflows/
├── translate.yml  # Auto-translation + deployment
└── hugo.yml       # Direct deployment (backup)

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

### Translation Behavior
- Script skips files with language suffixes (`.en`, `.zh-cn`) to avoid re-translation
- Translates frontmatter fields: `title` and `description`
- Preserves markdown formatting, code blocks, and HTML tags
- Creates corresponding file in opposite language directory with appropriate suffix

### Linked Translations
Hugo automatically links translations when files share the same base name:
- `content/en/posts/welcome.md` ↔ `content/zh-cn/posts/welcome.md`

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
2. `.github/workflows/translate.yml` triggers
3. Python script detects language and translates missing versions
4. Translations committed back to repository
5. Hugo builds site with all languages
6. Deploys to GitHub Pages at https://wewewexiao2008.github.io/hugo-eternal-blogs/

## Environment Requirements

- **Hugo Extended** v0.128.0 or compatible (Terminal theme requires SCSS support)
- **Python** 3.11+ with `requests`, `python-frontmatter`, `langdetect`
- **Git** with submodule support
- **GitHub Secrets**: `GEMINI_API_KEY`, `GEMINI_ENDPOINT`
