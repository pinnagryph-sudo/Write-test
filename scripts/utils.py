#!/usr/bin/env python3
"""
Novel Engine Utilities
Common functions for file handling, text processing, and configuration.
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional


# Base paths
ROOT_DIR = Path(__file__).parent.parent
CONFIG_DIR = ROOT_DIR / "config"
SOURCE_DIR = ROOT_DIR / "source-materials"
OUTPUT_DIR = ROOT_DIR / "output"
CHAPTERS_DIR = OUTPUT_DIR / "chapters"
PROMPTS_DIR = ROOT_DIR / "prompts"


def ensure_directories():
    """Create necessary directories if they don't exist."""
    CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)


def load_json(filepath: Path) -> Dict:
    """Load a JSON file and return its contents."""
    if not filepath.exists():
        return {}
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(filepath: Path, data: Dict, indent: int = 2):
    """Save data to a JSON file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent)


def load_markdown(filepath: Path) -> str:
    """Load a markdown file and return its contents."""
    if not filepath.exists():
        return ""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def save_markdown(filepath: Path, content: str):
    """Save content to a markdown file."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def word_count(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def get_chapter_filepath(chapter_num: int) -> Path:
    """Get the filepath for a chapter."""
    return CHAPTERS_DIR / f"chapter-{chapter_num:02d}.md"


def list_chapters() -> List[Path]:
    """List all existing chapter files."""
    if not CHAPTERS_DIR.exists():
        return []
    return sorted(CHAPTERS_DIR.glob("chapter-*.md"))


def get_latest_chapter_number() -> int:
    """Get the number of the latest chapter."""
    chapters = list_chapters()
    if not chapters:
        return 0
    # Extract number from filename like chapter-01.md
    latest = chapters[-1].stem  # "chapter-01"
    try:
        return int(latest.split("-")[1])
    except (IndexError, ValueError):
        return 0


def format_chapter_header(chapter_num: int, title: Optional[str] = None) -> str:
    """Format a chapter header."""
    header = f"# Chapter {chapter_num}"
    if title:
        header += f": {title}"
    header += f"\n\n<!-- Generated: {datetime.now().isoformat()} -->\n\n"
    return header


def extract_dialogue(text: str) -> List[str]:
    """Extract all dialogue from text."""
    pattern = r'["""]([^"""]*)["""]'
    return re.findall(pattern, text)


def count_dialogue_percentage(text: str) -> float:
    """Calculate the percentage of text that is dialogue."""
    dialogue = extract_dialogue(text)
    dialogue_chars = sum(len(d) for d in dialogue)
    total_chars = len(text)
    if total_chars == 0:
        return 0.0
    return dialogue_chars / total_chars


def validate_chapter(text: str, genre: str = "default") -> Dict[str, Any]:
    """
    Quick validation of chapter text.
    Returns basic metrics without running full quality check.
    """
    words = word_count(text)
    dialogue_pct = count_dialogue_percentage(text)
    paragraphs = len([p for p in text.split('\n\n') if p.strip()])

    return {
        "word_count": words,
        "dialogue_percentage": round(dialogue_pct * 100, 1),
        "paragraph_count": paragraphs,
        "avg_words_per_paragraph": round(words / max(paragraphs, 1), 1)
    }


def clean_text_for_display(text: str, max_length: int = 500) -> str:
    """Clean and truncate text for display."""
    # Remove multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    if len(text) > max_length:
        text = text[:max_length] + "..."
    return text


if __name__ == "__main__":
    # Test utilities
    print("Novel Engine Utilities")
    print(f"Root directory: {ROOT_DIR}")
    print(f"Config directory: {CONFIG_DIR}")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Latest chapter: {get_latest_chapter_number()}")

    ensure_directories()
    print("Directories verified.")
