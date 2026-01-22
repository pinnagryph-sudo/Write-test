#!/usr/bin/env python3
"""
Novel Engine Quality Checker
Analyzes generated prose against style framework requirements.

Usage:
    python quality_check.py <filepath>
    python quality_check.py output/chapters/chapter-01.md
"""

import re
import sys
import json
import statistics
from pathlib import Path
from collections import Counter
from typing import Dict, List, Tuple, Any

# Configuration paths
CONFIG_DIR = Path(__file__).parent.parent / "config"
BLACKLIST_PATH = CONFIG_DIR / "ai-vocabulary-blacklist.json"
THRESHOLDS_PATH = CONFIG_DIR / "quality-thresholds.json"


def load_config():
    """Load configuration files."""
    blacklist = {}
    thresholds = {}
    
    if BLACKLIST_PATH.exists():
        with open(BLACKLIST_PATH) as f:
            blacklist = json.load(f)
    
    if THRESHOLDS_PATH.exists():
        with open(THRESHOLDS_PATH) as f:
            thresholds = json.load(f)
    
    return blacklist, thresholds


def load_text(filepath: str) -> str:
    """Load text from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def get_sentences(text: str) -> List[str]:
    """Split text into sentences, handling dialogue and abbreviations."""
    # Remove dialogue for sentence splitting (keep for other analysis)
    # Simple approach - can be enhanced with nltk
    text_clean = re.sub(r'"[^"]*"', ' DIALOGUE ', text)
    
    # Split on sentence-ending punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text_clean)
    
    # Clean up and filter
    sentences = [s.strip() for s in sentences if s.strip() and len(s.split()) > 1]
    
    return sentences


def get_sentence_lengths(text: str) -> List[int]:
    """Get word counts for each sentence."""
    sentences = get_sentences(text)
    return [len(s.split()) for s in sentences]


# =============================================================================
# QUALITY CHECKS
# =============================================================================

def check_sentence_variation(text: str, thresholds: dict) -> Dict[str, Any]:
    """
    Check sentence length variation.
    Target: std dev >= 8, no more than 2 consecutive similar lengths
    """
    lengths = get_sentence_lengths(text)
    
    if len(lengths) < 3:
        return {
            "pass": True,
            "message": "Not enough sentences to analyze",
            "data": {}
        }
    
    mean_length = statistics.mean(lengths)
    std_dev = statistics.stdev(lengths)
    
    # Check for consecutive similar lengths (within 5 words of each other)
    max_consecutive = 0
    current_consecutive = 1
    
    for i in range(1, len(lengths)):
        if abs(lengths[i] - lengths[i-1]) < 5:
            current_consecutive += 1
            max_consecutive = max(max_consecutive, current_consecutive)
        else:
            current_consecutive = 1
    
    # Get thresholds
    min_std_dev = thresholds.get("sentence_metrics", {}).get("std_dev_minimum", 8)
    max_consec = thresholds.get("sentence_metrics", {}).get("max_consecutive_similar_length", 2)
    
    passed = std_dev >= min_std_dev and max_consecutive <= max_consec
    
    # Categorize sentences
    short = sum(1 for l in lengths if l <= 10)
    medium = sum(1 for l in lengths if 10 < l <= 20)
    long = sum(1 for l in lengths if l > 20)
    
    return {
        "pass": passed,
        "message": f"Mean: {mean_length:.1f} words, StdDev: {std_dev:.1f} (min {min_std_dev}), MaxConsecutive: {max_consecutive} (max {max_consec})",
        "data": {
            "mean_length": round(mean_length, 2),
            "std_dev": round(std_dev, 2),
            "max_consecutive_similar": max_consecutive,
            "distribution": {
                "short": short,
                "medium": medium,
                "long": long
            }
        }
    }


def check_blacklisted_vocabulary(text: str, blacklist: dict) -> Dict[str, Any]:
    """
    Check for AI vocabulary tells.
    Target: Zero blacklisted words or phrases
    """
    text_lower = text.lower()
    found_words = []
    found_phrases = []
    
    # Check tier 1 words (eliminate entirely)
    for word in blacklist.get("tier1_eliminate", []):
        if re.search(r'\b' + re.escape(word.lower()) + r'\b', text_lower):
            found_words.append(word)
    
    # Check tier 2 words (should be limited)
    tier2_found = []
    for word in blacklist.get("tier2_limit", []):
        matches = re.findall(r'\b' + re.escape(word.lower()) + r'\b', text_lower)
        if len(matches) > 1:  # Allow one usage
            tier2_found.append(f"{word} ({len(matches)}x)")
    
    # Check phrases
    for phrase in blacklist.get("phrases_eliminate", []):
        if phrase.lower() in text_lower:
            found_phrases.append(phrase)
    
    total_issues = len(found_words) + len(found_phrases)
    passed = total_issues == 0
    
    message_parts = []
    if found_words:
        message_parts.append(f"Banned words: {', '.join(found_words)}")
    if found_phrases:
        message_parts.append(f"Banned phrases: {', '.join(found_phrases)}")
    if tier2_found:
        message_parts.append(f"Overused: {', '.join(tier2_found)}")
    
    return {
        "pass": passed,
        "message": "; ".join(message_parts) if message_parts else "No blacklisted vocabulary found",
        "data": {
            "tier1_words": found_words,
            "phrases": found_phrases,
            "tier2_overuse": tier2_found
        }
    }


def check_dialogue_tags(text: str, blacklist: dict) -> Dict[str, Any]:
    """
    Check dialogue tag usage.
    Target: 80%+ 'said/asked', no adverb tags
    """
    # Find dialogue tags pattern: "dialogue" [name] [tag]
    tag_pattern = r'[""]\s*(?:\w+\s+)?(said|asked|replied|whispered|shouted|muttered|exclaimed|declared|announced|insisted|demanded|pleaded|suggested|admitted|murmured|growled|hissed|snapped|snarled|purred|stammered|gasped|breathed|sighed|groaned|stated|queried|inquired|retorted|countered|responded)'
    
    tags = re.findall(tag_pattern, text, re.IGNORECASE)
    tag_counts = Counter([t.lower() for t in tags])
    
    total_tags = len(tags)
    
    if total_tags == 0:
        return {
            "pass": True,
            "message": "No dialogue tags found (may use action beats only)",
            "data": {}
        }
    
    # Count said/asked
    said_count = tag_counts.get('said', 0) + tag_counts.get('asked', 0)
    said_ratio = said_count / total_tags
    
    # Check for avoided tags
    avoid_tags = blacklist.get("dialogue_tag_restrictions", {}).get("avoid", [])
    avoided_found = [tag for tag in avoid_tags if tag_counts.get(tag.lower(), 0) > 0]
    
    # Check for adverbs on tags
    adverb_pattern = r'\b(said|asked|whispered|shouted|muttered)\s+(\w+ly)\b'
    adverb_matches = re.findall(adverb_pattern, text, re.IGNORECASE)
    
    target_ratio = blacklist.get("dialogue_tag_restrictions", {}).get("said_percentage_target", 80) / 100
    
    passed = said_ratio >= target_ratio and len(adverb_matches) == 0
    
    message_parts = [f"Said/asked: {said_ratio:.0%} (target: {target_ratio:.0%})"]
    if adverb_matches:
        message_parts.append(f"Adverb tags found: {adverb_matches}")
    if avoided_found:
        message_parts.append(f"Avoided tags used: {avoided_found}")
    
    return {
        "pass": passed,
        "message": "; ".join(message_parts),
        "data": {
            "said_ratio": round(said_ratio, 2),
            "tag_counts": dict(tag_counts),
            "adverb_tags": adverb_matches,
            "avoided_tags_used": avoided_found
        }
    }


def check_telling_emotions(text: str, blacklist: dict) -> Dict[str, Any]:
    """
    Check for 'telling' emotion statements instead of showing.
    Target: Minimal telling, max 2 per scene
    """
    patterns = blacklist.get("emotion_telling_patterns", [
        r'\b(he|she|they|I|[A-Z][a-z]+)\s+felt\s+(a\s+)?(wave|surge|rush|flicker|hint|touch|mixture)\s+of',
        r'\b(he|she|they|I|[A-Z][a-z]+)\s+felt\s+(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|annoyed|furious|terrified|joyful|miserable|depressed|elated|worried|relieved|confused|embarrassed|ashamed|guilty|proud|jealous|envious)',
        r'\b(he|she|they|I|[A-Z][a-z]+)\s+(was|were|am)\s+(filled with|overcome by|overwhelmed by)',
        r'[""](I\'m|I am)\s+(so\s+)?(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|furious|terrified)',
    ])
    
    found = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        found.extend(matches)
    
    # Also check for the generic patterns
    generic_patterns = [
        r'a (wave|surge|rush) of \w+ (washed|swept|rushed) over',
        r"couldn't help but feel",
        r"(wasn't|didn't) lost on",
    ]
    
    for pattern in generic_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(pattern)
    
    passed = len(found) <= 2
    
    return {
        "pass": passed,
        "message": f"Found {len(found)} 'telling' emotion statements (max 2 recommended)",
        "data": {
            "count": len(found),
            "examples": found[:5]  # Show first 5
        }
    }


def check_three_item_lists(text: str, blacklist: dict) -> Dict[str, Any]:
    """
    Check for overuse of three-item lists.
    Target: Max 1 per 1000 words
    """
    # Pattern for three-item lists with commas and 'and'
    pattern = r'\b(\w+),\s+(\w+),\s+and\s+(\w+)\b'
    matches = re.findall(pattern, text)
    
    word_count = len(text.split())
    max_allowed = max(1, word_count // 1000)
    
    passed = len(matches) <= max_allowed
    
    return {
        "pass": passed,
        "message": f"Found {len(matches)} three-item lists (max {max_allowed} for {word_count} words)",
        "data": {
            "count": len(matches),
            "word_count": word_count,
            "max_allowed": max_allowed,
            "examples": [", ".join(m) + " and " + m[2] for m in matches[:3]]
        }
    }


def check_dialogue_ratio(text: str, thresholds: dict, genre: str = "default") -> Dict[str, Any]:
    """
    Check dialogue to narrative ratio.
    Target varies by genre (romance: 45-60%, fantasy: 20-35%)
    """
    # Find all dialogue
    dialogue_pattern = r'["""][^"""]*["""]'
    dialogue_matches = re.findall(dialogue_pattern, text)
    
    dialogue_chars = sum(len(d) for d in dialogue_matches)
    total_chars = len(text)
    
    if total_chars == 0:
        return {"pass": True, "message": "No text to analyze", "data": {}}
    
    ratio = dialogue_chars / total_chars
    
    # Get genre-specific thresholds
    genre_thresholds = thresholds.get("dialogue_metrics", {}).get("dialogue_to_narrative_ratio", {})
    genre_range = genre_thresholds.get(genre, genre_thresholds.get("default", {"min": 0.30, "max": 0.55}))
    
    passed = genre_range["min"] <= ratio <= genre_range["max"]
    
    return {
        "pass": passed,
        "message": f"Dialogue ratio: {ratio:.0%} (target: {genre_range['min']:.0%}-{genre_range['max']:.0%} for {genre})",
        "data": {
            "ratio": round(ratio, 2),
            "genre": genre,
            "target_range": genre_range
        }
    }


def check_passive_voice(text: str) -> Dict[str, Any]:
    """
    Check for excessive passive voice.
    Target: Under 5%
    """
    # Simple passive voice detection
    passive_pattern = r'\b(was|were|been|being|is|are|am)\s+(\w+ed|written|done|made|seen|known|taken|given)\b'
    passive_matches = re.findall(passive_pattern, text, re.IGNORECASE)
    
    sentences = get_sentences(text)
    total_sentences = len(sentences)
    
    if total_sentences == 0:
        return {"pass": True, "message": "No sentences to analyze", "data": {}}
    
    passive_ratio = len(passive_matches) / total_sentences
    
    passed = passive_ratio <= 0.05
    
    return {
        "pass": passed,
        "message": f"Passive voice: {passive_ratio:.1%} (target: under 5%)",
        "data": {
            "ratio": round(passive_ratio, 3),
            "instances": len(passive_matches)
        }
    }


def check_paragraph_variation(text: str) -> Dict[str, Any]:
    """
    Check for paragraph length variation.
    Good prose has varied paragraph lengths including single-sentence paragraphs.
    """
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    if len(paragraphs) < 3:
        return {"pass": True, "message": "Not enough paragraphs to analyze", "data": {}}
    
    lengths = [len(p.split()) for p in paragraphs]
    
    # Check for variation
    has_short = any(l < 30 for l in lengths)
    has_long = any(l > 80 for l in lengths)
    has_single_sentence = any(l < 15 for l in lengths)
    
    std_dev = statistics.stdev(lengths) if len(lengths) > 1 else 0
    
    # Good variation means std dev > 20 and mix of lengths
    passed = std_dev > 15 and has_short and (has_long or has_single_sentence)
    
    return {
        "pass": passed,
        "message": f"Paragraph variation StdDev: {std_dev:.1f}, has short: {has_short}, has long: {has_long}",
        "data": {
            "std_dev": round(std_dev, 1),
            "count": len(paragraphs),
            "has_short": has_short,
            "has_long": has_long,
            "has_single_sentence": has_single_sentence
        }
    }


# =============================================================================
# MAIN RUNNER
# =============================================================================

def run_all_checks(filepath: str, genre: str = "default") -> Tuple[bool, Dict[str, Any]]:
    """Run all quality checks on a file."""
    text = load_text(filepath)
    blacklist, thresholds = load_config()
    
    word_count = len(text.split())
    
    print(f"\n{'='*70}")
    print(f"QUALITY CHECK: {filepath}")
    print(f"{'='*70}")
    print(f"Word count: {word_count:,}")
    print(f"Genre: {genre}")
    print(f"{'='*70}\n")
    
    # Run all checks
    checks = {
        "Sentence Variation": check_sentence_variation(text, thresholds),
        "Blacklisted Vocabulary": check_blacklisted_vocabulary(text, blacklist),
        "Dialogue Tags": check_dialogue_tags(text, blacklist),
        "Telling Emotions": check_telling_emotions(text, blacklist),
        "Three-Item Lists": check_three_item_lists(text, blacklist),
        "Dialogue Ratio": check_dialogue_ratio(text, thresholds, genre),
        "Passive Voice": check_passive_voice(text),
        "Paragraph Variation": check_paragraph_variation(text),
    }
    
    # Categorize checks
    must_pass = ["Sentence Variation", "Blacklisted Vocabulary", "Dialogue Tags", "Three-Item Lists"]
    
    all_passed = True
    critical_passed = True
    
    print("CRITICAL CHECKS (must pass):")
    print("-" * 40)
    for check_name in must_pass:
        result = checks[check_name]
        status = "✅ PASS" if result["pass"] else "❌ FAIL"
        print(f"{status} | {check_name}")
        print(f"         {result['message']}")
        if not result["pass"]:
            critical_passed = False
            all_passed = False
        print()
    
    print("\nADVISORY CHECKS (should pass):")
    print("-" * 40)
    for check_name, result in checks.items():
        if check_name not in must_pass:
            status = "✅ PASS" if result["pass"] else "⚠️  WARN"
            print(f"{status} | {check_name}")
            print(f"         {result['message']}")
            if not result["pass"]:
                all_passed = False
            print()
    
    print(f"{'='*70}")
    if critical_passed:
        if all_passed:
            print("✅ ALL CHECKS PASSED - Ready for review")
        else:
            print("⚠️  CRITICAL CHECKS PASSED - Advisory issues remain")
    else:
        print("❌ CRITICAL CHECKS FAILED - Revision required")
    print(f"{'='*70}\n")
    
    return critical_passed, checks


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quality_check.py <filepath> [genre]")
        print("  genre: romance, fantasy, erotica, default")
        sys.exit(1)
    
    filepath = sys.argv[1]
    genre = sys.argv[2] if len(sys.argv) > 2 else "default"
    
    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    passed, _ = run_all_checks(filepath, genre)
    sys.exit(0 if passed else 1)
