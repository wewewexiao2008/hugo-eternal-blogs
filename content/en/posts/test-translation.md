---
title: "测试自动翻译工作流"
date: 2025-12-20T18:00:00Z
description: "用于验证自动翻译工作流是否正常工作的测试文章"
tags: ["测试", "工作流", "自动化"]
draft: false
---

## Introduction

This is a test article used to verify if the automatic translation workflow is functioning correctly. When this file is pushed to the main branch, the GitHub Actions workflow should automatically translate it and create the corresponding file in the target language content directory.

## How It Works

1. You write content in either language
2. Push to the main branch
3. GitHub Actions automatically detects the language
4. Gemini API translates the content
5. Creates the translated file
6. Automatically deploys the website

## Features

- Automatic language detection
- Preserves all Markdown formatting
- Translates frontmatter (title, description)
- Correctly handles code blocks
- Creates corresponding files for each language

## Next Steps

Now you can:
1. Write content in either language
2. Let automation handle the translation
3. Review generated files before deployment
4. Enjoy the convenience of bilingual content!

Once the workflow is verified, you can delete this test file.
