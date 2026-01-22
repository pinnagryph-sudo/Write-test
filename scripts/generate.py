#!/usr/bin/env python3
"""
Novel Engine Generator
Main orchestrator for chapter generation and quality validation.

Usage:
    python generate.py chapter <number> --beats "beat1, beat2, beat3"
    python generate.py state
    python generate.py validate <filepath>
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

from utils import (
    ROOT_DIR, CHAPTERS_DIR,
    ensure_directories, load_json, save_json, load_markdown, save_markdown,
    word_count, get_chapter_filepath, get_latest_chapter_number,
    format_chapter_header, validate_chapter
)
from load_context import (
    load_generation_context, validate_context, print_context_status,
    load_story_state, save_story_state, GenerationContext
)


def show_state():
    """Display current story state."""
    state = load_story_state()

    if not state:
        print("No story state found. Initialize with a story first.")
        return

    print("\n" + "=" * 60)
    print("STORY STATE")
    print("=" * 60)

    meta = state.get("metadata", {})
    print(f"\nTitle: {meta.get('title', 'Untitled')}")
    print(f"Genre: {meta.get('genre', 'Not set')}")
    print(f"Heat Level: {meta.get('heat_level', 'Not set')}")
    print(f"Word Count: {meta.get('current_word_count', 0):,} / {meta.get('target_word_count', 80000):,}")

    timeline = state.get("timeline", {})
    print(f"\nTimeline: {timeline.get('current_date', 'Day 1')}, {timeline.get('current_time_of_day', 'morning')}")
    print(f"Days Elapsed: {timeline.get('days_elapsed', 0)}")

    chapters = state.get("chapters", {})
    print(f"\nChapters: {len(chapters.get('completed_chapters', []))} / {chapters.get('total_planned', 25)}")
    print(f"Current: Chapter {chapters.get('current_chapter', 0)}")

    next_ch = state.get("next_chapter", {})
    if next_ch.get("number"):
        print(f"\nNext Chapter: {next_ch.get('number')}")
        print(f"  POV: {next_ch.get('pov_character', 'Not set')}")
        print(f"  Type: {next_ch.get('scene_type', 'Not set')}")
        beats = next_ch.get('planned_beats', [])
        if beats:
            print(f"  Beats: {', '.join(beats)}")

    print("=" * 60 + "\n")


def prepare_chapter(chapter_num: int, beats: List[str], pov: Optional[str] = None) -> Dict[str, Any]:
    """
    Prepare context and prompt for chapter generation.
    Returns generation specification that can be used with an LLM.
    """
    ensure_directories()

    # Load context
    context = load_generation_context(chapter_num)
    is_valid, issues = validate_context(context)

    if not is_valid:
        print("❌ Cannot prepare chapter - missing critical files:")
        for issue in issues:
            print(f"  - {issue}")
        return {}

    # Build generation specification
    spec = {
        "chapter_number": chapter_num,
        "beats": beats,
        "pov_character": pov or context.story_state.get("characters", {}).get("protagonist", {}).get("name", ""),
        "genre": context.story_state.get("metadata", {}).get("genre", "fantasy_romance"),
        "heat_level": context.story_state.get("metadata", {}).get("heat_level", 4),
        "target_word_count": context.thresholds.get("pacing_metrics", {}).get("chapter_length", {}).get("fantasy", {}).get("min", 3000),
        "context_loaded": context.to_dict(),
        "previous_summary": context.previous_summary,
        "continuity_notes": context.story_state.get("continuity_notes", [])[-5:]  # Last 5 notes
    }

    return spec


def build_generation_prompt(spec: Dict[str, Any], context: GenerationContext) -> str:
    """Build the complete prompt for chapter generation."""
    prompt_parts = []

    # System context
    prompt_parts.append("# GENERATION CONTEXT\n")
    prompt_parts.append(f"Chapter: {spec['chapter_number']}")
    prompt_parts.append(f"Genre: {spec['genre']}")
    prompt_parts.append(f"Heat Level: {spec['heat_level']}")
    prompt_parts.append(f"Target Word Count: {spec['target_word_count']}")
    prompt_parts.append(f"POV Character: {spec['pov_character']}\n")

    # Beats
    prompt_parts.append("# SCENE BEATS")
    for i, beat in enumerate(spec['beats'], 1):
        prompt_parts.append(f"{i}. {beat}")
    prompt_parts.append("")

    # Previous context
    if spec.get('previous_summary'):
        prompt_parts.append("# PREVIOUS CHAPTER SUMMARY")
        prompt_parts.append(spec['previous_summary'])
        prompt_parts.append("")

    # Continuity notes
    if spec.get('continuity_notes'):
        prompt_parts.append("# CONTINUITY NOTES")
        for note in spec['continuity_notes']:
            prompt_parts.append(f"- {note}")
        prompt_parts.append("")

    # Key rules reminder
    prompt_parts.append("# CRITICAL RULES")
    prompt_parts.append("- NO blacklisted vocabulary (delve, tapestry, testament, beacon, myriad, etc.)")
    prompt_parts.append("- Vary sentence lengths (short/medium/long mix)")
    prompt_parts.append("- Use 'said' for 85%+ of dialogue tags")
    prompt_parts.append("- Show emotions through action, never 'felt [emotion]'")
    prompt_parts.append("- Max 1 three-item list per 1000 words")
    prompt_parts.append("- Follow Scene-Sequel structure")
    prompt_parts.append("")

    return "\n".join(prompt_parts)


def save_chapter(chapter_num: int, content: str, title: Optional[str] = None) -> Path:
    """Save generated chapter to file."""
    ensure_directories()

    filepath = get_chapter_filepath(chapter_num)
    full_content = format_chapter_header(chapter_num, title) + content

    save_markdown(filepath, full_content)
    return filepath


def update_state_after_generation(
    chapter_num: int,
    word_count_added: int,
    summary: str,
    continuity_notes: Optional[List[str]] = None
):
    """Update story state after generating a chapter."""
    state = load_story_state()

    # Update metadata
    state["metadata"]["current_word_count"] = state["metadata"].get("current_word_count", 0) + word_count_added

    # Update chapters
    state["chapters"]["current_chapter"] = chapter_num
    if chapter_num not in state["chapters"].get("completed_chapters", []):
        state["chapters"].setdefault("completed_chapters", []).append(chapter_num)

    # Add chapter summary
    state.setdefault("chapter_summaries", {})[str(chapter_num)] = summary

    # Add continuity notes
    if continuity_notes:
        state.setdefault("continuity_notes", []).extend(continuity_notes)

    # Update next chapter
    state["next_chapter"] = {
        "number": chapter_num + 1,
        "planned_beats": [],
        "pov_character": "",
        "scene_type": "",
        "target_word_count": 3000
    }

    save_story_state(state)
    print(f"✅ Story state updated for Chapter {chapter_num}")


def validate_file(filepath: str, genre: str = "default"):
    """Run quality check on a file."""
    # Import and run quality check
    import quality_check
    quality_check.run_all_checks(filepath, genre)


def show_help():
    """Display help information."""
    print("""
Novel Engine Generator
======================

Commands:
  state                           Show current story state
  prepare <num> --beats "..."     Prepare chapter context for generation
  save <num> <file> [--title]     Save generated content as chapter
  update <num> --summary "..."    Update state after generation
  validate <file> [--genre]       Run quality check on file

Examples:
  python generate.py state
  python generate.py prepare 1 --beats "Hero arrives, Meets mentor, Discovers quest"
  python generate.py save 1 draft.txt --title "The Beginning"
  python generate.py update 1 --summary "Hero arrived and met the mysterious mentor"
  python generate.py validate output/chapters/chapter-01.md --genre fantasy

Workflow:
  1. Run 'state' to see current progress
  2. Run 'prepare' to get generation context
  3. Generate prose using the context (via Claude or other LLM)
  4. Run 'validate' to check quality
  5. Run 'save' to save the chapter
  6. Run 'update' to update story state
""")


def main():
    parser = argparse.ArgumentParser(description="Novel Engine Generator")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # State command
    subparsers.add_parser("state", help="Show story state")

    # Prepare command
    prepare_parser = subparsers.add_parser("prepare", help="Prepare chapter context")
    prepare_parser.add_argument("chapter", type=int, help="Chapter number")
    prepare_parser.add_argument("--beats", required=True, help="Comma-separated scene beats")
    prepare_parser.add_argument("--pov", help="POV character name")

    # Save command
    save_parser = subparsers.add_parser("save", help="Save generated chapter")
    save_parser.add_argument("chapter", type=int, help="Chapter number")
    save_parser.add_argument("file", help="File containing generated content")
    save_parser.add_argument("--title", help="Chapter title")

    # Update command
    update_parser = subparsers.add_parser("update", help="Update state after generation")
    update_parser.add_argument("chapter", type=int, help="Chapter number")
    update_parser.add_argument("--summary", required=True, help="Chapter summary")
    update_parser.add_argument("--words", type=int, help="Word count (auto-calculated if not provided)")
    update_parser.add_argument("--notes", help="Comma-separated continuity notes")

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Run quality check")
    validate_parser.add_argument("file", help="File to validate")
    validate_parser.add_argument("--genre", default="default", help="Genre for thresholds")

    # Context command
    context_parser = subparsers.add_parser("context", help="Show loaded context status")
    context_parser.add_argument("chapter", type=int, nargs="?", default=1, help="Chapter number")

    args = parser.parse_args()

    if args.command == "state":
        show_state()

    elif args.command == "prepare":
        beats = [b.strip() for b in args.beats.split(",")]
        spec = prepare_chapter(args.chapter, beats, args.pov)
        if spec:
            print("\n" + "=" * 60)
            print("CHAPTER GENERATION SPECIFICATION")
            print("=" * 60)
            print(json.dumps(spec, indent=2))
            print("=" * 60)

            # Also build and show the prompt
            context = load_generation_context(args.chapter)
            prompt = build_generation_prompt(spec, context)
            print("\nGENERATION PROMPT:")
            print("-" * 40)
            print(prompt)

    elif args.command == "save":
        content = load_markdown(Path(args.file))
        if not content:
            print(f"Error: Could not read file {args.file}")
            sys.exit(1)
        filepath = save_chapter(args.chapter, content, args.title)
        print(f"✅ Saved Chapter {args.chapter} to {filepath}")
        wc = word_count(content)
        print(f"   Word count: {wc:,}")

    elif args.command == "update":
        wc = args.words
        if not wc:
            # Try to get from saved chapter
            chapter_file = get_chapter_filepath(args.chapter)
            if chapter_file.exists():
                content = load_markdown(chapter_file)
                wc = word_count(content)
        wc = wc or 0
        notes = [n.strip() for n in args.notes.split(",")] if args.notes else None
        update_state_after_generation(args.chapter, wc, args.summary, notes)

    elif args.command == "validate":
        validate_file(args.file, args.genre)

    elif args.command == "context":
        context = load_generation_context(args.chapter)
        print_context_status(context)

    else:
        show_help()


if __name__ == "__main__":
    main()
