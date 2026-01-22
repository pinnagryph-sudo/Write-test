#!/usr/bin/env python3
"""
Novel Engine Context Loader
Loads and assembles source materials for generation.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

from utils import (
    ROOT_DIR, CONFIG_DIR, SOURCE_DIR, PROMPTS_DIR,
    load_json, load_markdown, get_chapter_filepath
)


@dataclass
class GenerationContext:
    """Complete context for prose generation."""
    # Configuration
    style_framework: str = ""
    blacklist: Dict = field(default_factory=dict)
    thresholds: Dict = field(default_factory=dict)
    system_prompt: str = ""
    scene_template: str = ""

    # Source materials
    world_bible: str = ""
    story_outline: str = ""
    story_state: Dict = field(default_factory=dict)
    characters: Dict[str, str] = field(default_factory=dict)

    # Previous chapter context
    previous_chapter: str = ""
    previous_summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "style_framework_loaded": bool(self.style_framework),
            "blacklist_words": len(self.blacklist.get("tier1_eliminate", [])),
            "world_bible_loaded": bool(self.world_bible),
            "story_outline_loaded": bool(self.story_outline),
            "characters_loaded": list(self.characters.keys()),
            "current_chapter": self.story_state.get("chapters", {}).get("current_chapter", 0),
            "word_count": self.story_state.get("metadata", {}).get("current_word_count", 0)
        }


def load_config_files() -> tuple[str, Dict, Dict]:
    """Load all configuration files."""
    style_framework = load_markdown(CONFIG_DIR / "style-framework.md")
    blacklist = load_json(CONFIG_DIR / "ai-vocabulary-blacklist.json")
    thresholds = load_json(CONFIG_DIR / "quality-thresholds.json")
    return style_framework, blacklist, thresholds


def load_prompts() -> tuple[str, str]:
    """Load prompt templates."""
    system_prompt = load_markdown(PROMPTS_DIR / "system-prompt.md")
    scene_template = load_markdown(PROMPTS_DIR / "scene-generation.md")
    return system_prompt, scene_template


def load_world_bible() -> str:
    """Load the world bible."""
    return load_markdown(SOURCE_DIR / "world-bible.md")


def load_story_outline() -> str:
    """Load the story outline."""
    return load_markdown(SOURCE_DIR / "story-outline.md")


def load_story_state() -> Dict:
    """Load current story state."""
    return load_json(SOURCE_DIR / "story-state.json")


def save_story_state(state: Dict):
    """Save updated story state."""
    filepath = SOURCE_DIR / "story-state.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


def load_character(name: str) -> str:
    """Load a character profile by name."""
    # Try exact filename first
    char_dir = SOURCE_DIR / "characters"
    filepath = char_dir / f"{name.lower()}.md"
    if filepath.exists():
        return load_markdown(filepath)

    # Try to find partial match
    if char_dir.exists():
        for char_file in char_dir.glob("*.md"):
            if name.lower() in char_file.stem.lower():
                return load_markdown(char_file)

    return ""


def load_all_characters() -> Dict[str, str]:
    """Load all character profiles."""
    characters = {}
    char_dir = SOURCE_DIR / "characters"

    if char_dir.exists():
        for char_file in char_dir.glob("*.md"):
            if char_file.stem != "character-template":
                content = load_markdown(char_file)
                if content:
                    characters[char_file.stem] = content

    return characters


def load_previous_chapter(chapter_num: int) -> str:
    """Load a previous chapter's content."""
    if chapter_num <= 0:
        return ""
    filepath = get_chapter_filepath(chapter_num)
    return load_markdown(filepath)


def get_chapter_summary(chapter_num: int, story_state: Dict) -> str:
    """Get summary of a chapter from story state."""
    summaries = story_state.get("chapter_summaries", {})
    return summaries.get(str(chapter_num), "")


def load_generation_context(
    chapter_num: int,
    character_names: Optional[List[str]] = None
) -> GenerationContext:
    """
    Load complete context for generating a chapter.

    Args:
        chapter_num: The chapter number to generate
        character_names: Specific characters to load (loads all if None)

    Returns:
        GenerationContext with all loaded data
    """
    context = GenerationContext()

    # Load configuration
    context.style_framework, context.blacklist, context.thresholds = load_config_files()

    # Load prompts
    context.system_prompt, context.scene_template = load_prompts()

    # Load source materials
    context.world_bible = load_world_bible()
    context.story_outline = load_story_outline()
    context.story_state = load_story_state()

    # Load characters
    if character_names:
        for name in character_names:
            char_content = load_character(name)
            if char_content:
                context.characters[name] = char_content
    else:
        context.characters = load_all_characters()

    # Load previous chapter context
    if chapter_num > 1:
        context.previous_chapter = load_previous_chapter(chapter_num - 1)
        context.previous_summary = get_chapter_summary(chapter_num - 1, context.story_state)

    return context


def validate_context(context: GenerationContext) -> tuple[bool, List[str]]:
    """
    Validate that context is ready for generation.

    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []

    # Check critical files
    if not context.style_framework:
        issues.append("Missing: config/style-framework.md")

    if not context.blacklist:
        issues.append("Missing: config/ai-vocabulary-blacklist.json")

    if not context.system_prompt:
        issues.append("Missing: prompts/system-prompt.md")

    # Check source materials (warnings, not errors)
    warnings = []
    if not context.world_bible:
        warnings.append("Warning: source-materials/world-bible.md not found")

    if not context.story_outline:
        warnings.append("Warning: source-materials/story-outline.md not found")

    if not context.characters:
        warnings.append("Warning: No character profiles loaded")

    return len(issues) == 0, issues + warnings


def print_context_status(context: GenerationContext):
    """Print status of loaded context."""
    print("\n" + "=" * 60)
    print("GENERATION CONTEXT STATUS")
    print("=" * 60)

    print("\nConfiguration:")
    print(f"  Style Framework: {'✅ Loaded' if context.style_framework else '❌ Missing'}")
    print(f"  AI Blacklist: {'✅ Loaded' if context.blacklist else '❌ Missing'}")
    print(f"  Quality Thresholds: {'✅ Loaded' if context.thresholds else '❌ Missing'}")

    print("\nPrompts:")
    print(f"  System Prompt: {'✅ Loaded' if context.system_prompt else '❌ Missing'}")
    print(f"  Scene Template: {'✅ Loaded' if context.scene_template else '❌ Missing'}")

    print("\nSource Materials:")
    print(f"  World Bible: {'✅ Loaded' if context.world_bible else '⚠️  Not found'}")
    print(f"  Story Outline: {'✅ Loaded' if context.story_outline else '⚠️  Not found'}")
    print(f"  Story State: {'✅ Loaded' if context.story_state else '⚠️  Not found'}")

    print("\nCharacters:")
    if context.characters:
        for name in context.characters:
            print(f"  ✅ {name}")
    else:
        print("  ⚠️  No characters loaded")

    print("\nPrevious Context:")
    print(f"  Previous Chapter: {'✅ Available' if context.previous_chapter else '—'}")
    print(f"  Previous Summary: {'✅ Available' if context.previous_summary else '—'}")

    print("=" * 60 + "\n")


if __name__ == "__main__":
    import sys

    chapter_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    print(f"Loading context for Chapter {chapter_num}...")
    context = load_generation_context(chapter_num)
    print_context_status(context)

    is_valid, issues = validate_context(context)
    if issues:
        print("Issues found:")
        for issue in issues:
            print(f"  - {issue}")

    if is_valid:
        print("\n✅ Context is ready for generation")
    else:
        print("\n❌ Critical files missing - cannot proceed")
