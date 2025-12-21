#!/usr/bin/env python3
"""
Local translation script for Hugo content.
Run this locally before committing to review translations.

Usage:
    python scripts/translate_local.py <source_file>
    
Example:
    python scripts/translate_local.py content/en/posts/my-article.md
    python scripts/translate_local.py content/zh-cn/posts/我的文章.md
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Tuple
import frontmatter
import langdetect
import requests


def get_api_key() -> str:
    """Get API key from environment variable."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return api_key


def get_endpoint() -> str:
    """Get endpoint from environment variable."""
    endpoint = os.getenv('GEMINI_ENDPOINT')
    if not endpoint:
        raise ValueError("GEMINI_ENDPOINT environment variable not set")
    return endpoint


def detect_language(text: str) -> str:
    """Detect if text is primarily English or Chinese."""
    try:
        lang = langdetect.detect(text)
        return lang
    except:
        return 'en'


def translate_text(text: str, source_lang: str, target_lang: str, api_key: str, endpoint: str) -> str:
    """Translate text using Gemini API via custom endpoint."""
    lang_map = {
        'en': 'English',
        'zh': 'Simplified Chinese',
        'zh-cn': 'Simplified Chinese'
    }
    
    source_name = lang_map.get(source_lang, 'English')
    target_name = lang_map.get(target_lang, 'Simplified Chinese')
    
    prompt = f"""Translate the following content from {source_name} to {target_name}.
Preserve all markdown formatting, code blocks, and HTML tags exactly as they are.
Only translate the actual text content.

Content to translate:
{text}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gemini-2-flash-preview",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": 4096
    }
    
    try:
        print(f"Calling API... (this may take a moment)")
        response = requests.post(endpoint, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        
        if 'choices' in result and len(result['choices']) > 0:
            return result['choices'][0]['message']['content'].strip()
        elif 'content' in result:
            return result['content'].strip()
        else:
            raise ValueError(f"Unexpected API response format: {result}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error calling translation API: {e}")
        raise


def translate_file(filepath: str, api_key: str, endpoint: str) -> Tuple[str, str]:
    """
    Translate a single file and return source and target paths.
    
    Returns:
        Tuple of (source_path, target_path)
    """
    filepath = Path(filepath)
    
    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
    
    print(f"\n{'='*60}")
    print(f"📄 Processing: {filepath}")
    print(f"{'='*60}\n")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)
    
    content = post.content
    lang = detect_language(content)
    
    # Determine source and target
    if lang.startswith('zh'):
        source_lang = 'zh'
        target_lang = 'en'
        new_lang_suffix = ''  # English is default, no suffix
        target_dir = filepath.parent
    else:
        source_lang = 'en'
        target_lang = 'zh'
        new_lang_suffix = '.zh-cn'
        target_dir = filepath.parent
    
    print(f"🔍 Detected language: {lang}")
    print(f"📝 Translating {source_lang.upper()} → {target_lang.upper()}...\n")
    
    # Translate content
    translated_content = translate_text(content, source_lang, target_lang, api_key, endpoint)
    post.content = translated_content
    
    # Translate title if it exists
    if 'title' in post.metadata:
        title = post.metadata['title']
        print(f"Translating title: {title}")
        title_translated = translate_text(title, source_lang, target_lang, api_key, endpoint)
        post.metadata['title'] = title_translated
        print(f"Translated to: {title_translated}\n")
    
    # Translate description if it exists
    if 'description' in post.metadata:
        desc = post.metadata['description']
        print(f"Translating description: {desc}")
        desc_translated = translate_text(desc, source_lang, target_lang, api_key, endpoint)
        post.metadata['description'] = desc_translated
        print(f"Translated to: {desc_translated}\n")
    
    # Determine output path
    output_path = target_dir / (filepath.stem + new_lang_suffix + filepath.suffix)
    
    # Check if target already exists
    if output_path.exists():
        print(f"⚠️  File already exists: {output_path}")
        response = input("Overwrite? (y/n): ").lower()
        if response != 'y':
            print("❌ Cancelled.")
            return str(filepath), str(output_path)
    
    # Write translated file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(frontmatter.dumps(post))
    
    print(f"✅ Created: {output_path}\n")
    return str(filepath), str(output_path)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Translate Hugo markdown content locally',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/translate_local.py content/en/posts/my-article.md
  python scripts/translate_local.py content/zh-cn/posts/我的文章.md
        """
    )
    parser.add_argument('filepath', help='Path to markdown file to translate')
    parser.add_argument('--no-review', action='store_true', help='Skip review step')
    
    args = parser.parse_args()
    
    try:
        api_key = get_api_key()
        endpoint = get_endpoint()
        
        source_path, target_path = translate_file(args.filepath, api_key, endpoint)
        
        print(f"{'='*60}")
        print(f"Translation complete!")
        print(f"Source: {source_path}")
        print(f"Target: {target_path}")
        print(f"{'='*60}\n")
        
        if not args.no_review:
            print("📋 Review the translated file:")
            print(f"  cat {target_path}\n")
            response = input("Is the translation OK? (y/n): ").lower()
            if response != 'y':
                print("\n⚠️  Please manually review and edit the file:")
                print(f"  nano {target_path}")
                print("\nAfter editing, you can commit both files.")
            else:
                print("\n✅ Ready to commit!")
                print(f"  git add {source_path} {target_path}")
                print(f"  git commit -m 'Add bilingual article: ...'")
                print(f"  git push")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
