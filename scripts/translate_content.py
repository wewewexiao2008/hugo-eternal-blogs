#!/usr/bin/env python3
"""
Translate Hugo markdown content using Gemini API via custom endpoint.
Translates between English and Chinese while preserving frontmatter.
"""

import os
import sys
import json
import glob
import requests
from pathlib import Path
from typing import Tuple
import frontmatter
import langdetect


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
        # Default to en if detection fails
        return 'en'


def translate_text(text: str, source_lang: str, target_lang: str, api_key: str, endpoint: str) -> str:
    """
    Translate text using Gemini API via custom endpoint.
    
    Args:
        text: Text to translate
        source_lang: Source language code (en, zh)
        target_lang: Target language code (en, zh)
        api_key: API key for the endpoint
        endpoint: API endpoint URL
    
    Returns:
        Translated text
    """
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
        response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        # Handle different response formats
        if 'choices' in result and len(result['choices']) > 0:
            return result['choices'][0]['message']['content'].strip()
        elif 'content' in result:
            return result['content'].strip()
        else:
            raise ValueError(f"Unexpected API response format: {result}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error calling translation API: {e}")
        raise


def process_file(filepath: str, api_key: str, endpoint: str) -> Tuple[str, bool]:
    """
    Process a single markdown file and create translation if needed.
    
    Args:
        filepath: Path to the markdown file
        api_key: API key for translation
        endpoint: API endpoint
    
    Returns:
        Tuple of (target_filepath, was_translated)
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        post = frontmatter.load(f)
    
    content = post.content
    lang = detect_language(content)
    
    # Determine source and target
    if lang.startswith('zh'):
        source_lang = 'zh'
        target_lang = 'en'
        new_lang_suffix = ''  # English is default, no suffix
    else:
        source_lang = 'en'
        target_lang = 'zh'
        new_lang_suffix = '.zh-cn'
    
    print(f"Detected language: {source_lang}")
    print(f"Translating {filepath} to {target_lang}...")
    
    # Translate content
    translated_content = translate_text(content, source_lang, target_lang, api_key, endpoint)
    
    # Create new post with translated content
    post.content = translated_content
    
    # Update title if it exists
    if 'title' in post.metadata:
        title = post.metadata['title']
        title_translated = translate_text(title, source_lang, target_lang, api_key, endpoint)
        post.metadata['title'] = title_translated
    
    # Update description if it exists
    if 'description' in post.metadata:
        desc = post.metadata['description']
        desc_translated = translate_text(desc, source_lang, target_lang, api_key, endpoint)
        post.metadata['description'] = desc_translated
    
    # Determine output path
    path_obj = Path(filepath)
    output_path = path_obj.parent / (path_obj.stem + new_lang_suffix + path_obj.suffix)
    
    # Write translated file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(frontmatter.dumps(post))
    
    print(f"✓ Created: {output_path}")
    return str(output_path), True


def main():
    """Main entry point."""
    api_key = get_api_key()
    endpoint = get_endpoint()
    
    # Find all markdown files in content/en and content/zh-cn
    en_posts = glob.glob('content/en/posts/*.md')
    zh_posts = glob.glob('content/zh-cn/posts/*.md')
    
    all_posts = en_posts + zh_posts
    
    if not all_posts:
        print("No markdown files found in content directories")
        return
    
    print(f"Found {len(all_posts)} markdown files")
    print(f"Starting translation process...")
    print(f"API Endpoint: {endpoint}")
    print()
    
    translated_count = 0
    failed_count = 0
    
    for filepath in all_posts:
        try:
            # Skip files that already have language suffix (already translated)
            path_obj = Path(filepath)
            if path_obj.stem.endswith('.en') or path_obj.stem.endswith('.zh-cn'):
                print(f"⊘ Skipping already translated file: {filepath}")
                continue
            
            output_path, was_translated = process_file(filepath, api_key, endpoint)
            translated_count += 1
            
        except Exception as e:
            print(f"✗ Error processing {filepath}: {e}")
            failed_count += 1
            continue
        
        print()
    
    print(f"\n{'='*60}")
    print(f"Translation complete!")
    print(f"Successfully translated: {translated_count}")
    print(f"Failed: {failed_count}")
    print(f"{'='*60}")
    
    if failed_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
