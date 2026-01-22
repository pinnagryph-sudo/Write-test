# Novel Engine Implementation Guide
## Building a Human-Voiced Fiction Generator with Claude Code

This guide walks you through building a novel engine that ingests your source materials (world bibles, character profiles, story outlines) and generates prose following the research framework.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NOVEL ENGINE                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   SOURCE     │  │   STYLE      │  │   STORY      │          │
│  │   LOADER     │  │   FRAMEWORK  │  │   STATE      │          │
│  │              │  │              │  │              │          │
│  │ • World Bible│  │ • AI Avoids  │  │ • Current Ch │          │
│  │ • Characters │  │ • Prose Rules│  │ • Plot Thread│          │
│  │ • Outlines   │  │ • Benchmarks │  │ • Timeline   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────┬────────┘                   │
│                      ▼             ▼                            │
│              ┌───────────────────────────┐                      │
│              │    GENERATION PIPELINE    │                      │
│              │                           │                      │
│              │  1. Context Assembly      │                      │
│              │  2. Scene Generation      │                      │
│              │  3. Quality Gates         │                      │
│              │  4. Revision Loop         │                      │
│              │  5. Output & State Update │                      │
│              └───────────────────────────┘                      │
│                           │                                     │
│                           ▼                                     │
│              ┌───────────────────────────┐                      │
│              │      FINAL OUTPUT         │                      │
│              │   (Prose + Updated State) │                      │
│              └───────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
novel-engine/
├── config/
│   ├── style-framework.md          # The research framework (rules)
│   ├── ai-vocabulary-blacklist.json # Words to avoid
│   └── quality-thresholds.json      # Metrics targets
│
├── source-materials/
│   ├── world-bible.md              # Your world documentation
│   ├── characters/
│   │   ├── character-template.md   # Voice card template
│   │   └── [character-name].md     # Individual character profiles
│   ├── story-outline.md            # Chapter-by-chapter beats
│   └── story-state.json            # Dynamic tracking file
│
├── prompts/
│   ├── system-prompt.md            # Master generation prompt
│   ├── scene-generation.md         # Scene-specific instructions
│   ├── dialogue-generation.md      # Dialogue-focused generation
│   ├── intimate-scenes.md          # Heat-level appropriate generation
│   └── quality-check.md            # Self-review prompt
│
├── output/
│   └── chapters/
│       └── chapter-XX.md           # Generated chapters
│
├── scripts/
│   ├── generate.py                 # Main generation script
│   ├── quality_check.py            # Automated quality analysis
│   ├── load_context.py             # Context assembly
│   └── utils.py                    # Helper functions
│
└── CLAUDE.md                       # Instructions for Claude Code
```

---

## Step 1: Create the CLAUDE.md File

This file tells Claude Code how to work with your project:

```markdown
# Novel Engine - Claude Code Instructions

## Project Purpose
This is a novel generation engine for fantasy, romance, and erotica fiction.
It generates human-quality prose by following strict style rules and 
cross-checking against quality benchmarks.

## Key Files to Always Reference
- `config/style-framework.md` - ALWAYS load before generating prose
- `source-materials/world-bible.md` - Load for any world-specific content
- `source-materials/story-state.json` - Check before/update after generation

## Generation Workflow
1. Load relevant character profiles from `source-materials/characters/`
2. Load current story state
3. Load style framework rules
4. Generate prose following scene beats
5. Run quality checks
6. Revise if quality gates fail
7. Update story state
8. Save output

## Quality Gates (Must Pass)
- No blacklisted AI vocabulary
- Sentence length std dev > 8 words
- Dialogue-to-narrative ratio appropriate for genre
- Character voice consistency verified
- No on-the-nose emotional statements

## Commands
- `/generate [chapter]` - Generate a chapter
- `/check [file]` - Run quality analysis on a file
- `/character [name]` - Load/create character voice card
- `/state` - View current story state
```

---

## Step 2: Create the Master System Prompt

Save this as `prompts/system-prompt.md`:

```markdown
# Novel Generation System Prompt

You are a fiction generation engine optimized for fantasy, romance, and erotica.
You write prose that is indistinguishable from human authors like Patricia Briggs,
J.R. Ward, and Rachel Vincent.

## ABSOLUTE RULES - NEVER VIOLATE

### Vocabulary Blacklist
NEVER use these words: delve, tapestry, testament, beacon, myriad, multifaceted,
nuanced, intricate, pivotal, crucial, realm, landscape, embark, journey, foster,
leverage, harness, showcase, underscore, revolutionary, cutting-edge, transformative,
groundbreaking, meticulous, furthermore, moreover, additionally, consequently.

NEVER use these phrases: "It's worth noting," "In today's," "rich tapestry,"
"stands as a testament," "in the realm of."

### Sentence Variation (MANDATORY)
- Never write 3+ consecutive sentences of similar length
- Vary between short (under 10 words), medium (10-20), and long (20+)
- Include occasional sentence fragments for rhythm
- Standard deviation of sentence length must exceed 8 words

### Dialogue Rules
- Use "said" for 85% of dialogue tags
- NO adverbs on dialogue tags ("said angrily")
- Every 4-5 lines of dialogue needs an action beat
- Characters must NOT state emotions directly ("I'm angry!")
- Include subtext: deflection, incomplete thoughts, loaded statements

### Show Don't Tell
- Never write "[Character] felt [emotion]"
- Show emotion through: physical sensation, action, dialogue, internal thought
- Reaction order: visceral feeling → reflex action → rational response

### Character Voice
- Each character has documented speech patterns - FOLLOW THEM
- Characters must sound different from each other
- Maintain vocabulary appropriate to character background

### Pacing
- Match sentence length to scene tension (short = fast, long = slow)
- Scene-Sequel structure: Goal → Conflict → Disaster → Reaction → Dilemma → Decision
- Never spend extensive time on unimportant moments
- Never gloss over important moments

### Three-Item Lists
- Maximum ONE three-item list per 1,000 words
- Vary list lengths: sometimes two items, sometimes four or five

## GENERATION PROCESS

1. Identify the scene's purpose (what changes by the end?)
2. Identify POV character and load their voice profile
3. Write following Scene-Sequel structure
4. After every paragraph, verify:
   - Sentence length variation
   - No blacklisted vocabulary
   - Character voice consistency
   - Showing not telling
5. End scenes with hooks (unanswered question, unresolved tension, reversal)

## INTIMATE SCENE GUIDELINES

Heat Level definitions:
- Level 3 (Steamy): Physical details, emotions foregrounded
- Level 4 (Explicit): Detailed descriptions, explicit terminology
- Level 5 (Erotica): Physical acts as primary focus

Requirements:
- Emotional intimacy must be established first
- Interweave physical sensation with emotional reaction
- Show power dynamics and vulnerability
- Reference emotional impact afterward
```

---

## Step 3: Character Voice Card Template

Save as `source-materials/characters/character-template.md`:

```markdown
# Character Voice Card: [NAME]

## Basic Info
- Full Name:
- Age:
- Role in Story:
- POV Character: Yes/No

## Speech Patterns
### Example Dialogue Lines (5-10 examples)
1. "[Example of how they speak in casual conversation]"
2. "[Example of how they speak when angry]"
3. "[Example of how they speak when vulnerable]"
4. "[Example of their humor style]"
5. "[Example of how they speak to authority]"

### Vocabulary Inventory
**Words/Phrases They USE Often:**
- [word 1]
- [word 2]
- [phrase they repeat]

**Words They Would NEVER Use:**
- [word 1 - why]
- [word 2 - why]

### Sentence Structure Preference
- [ ] Short, choppy sentences
- [ ] Medium, balanced sentences  
- [ ] Long, flowing sentences
- [ ] Varies dramatically based on emotion

### Verbal Tics
- [Filler word they use: "like," "you know," "honestly"]
- [Catchphrase or repeated expression]
- [How they curse/express frustration]

## Emotional Baseline
- Default emotional state:
- How they express anger:
- How they express affection:
- How they express fear:
- What makes them defensive:

## Register Shifts
- Speaking to friends:
- Speaking to enemies:
- Speaking to love interest:
- Speaking to authority:
- Internal monologue style:

## Voice Differentiation Notes
What makes this character sound DIFFERENT from other characters:
-
-
-
```

---

## Step 4: Story State Tracker

Save as `source-materials/story-state.json`:

```json
{
  "current_chapter": 1,
  "word_count": 0,
  "timeline": {
    "current_date": "Day 1",
    "current_time": "morning",
    "days_elapsed": 0
  },
  "character_states": {
    "protagonist": {
      "location": "",
      "emotional_state": "",
      "knowledge": [],
      "injuries": [],
      "relationship_status": {}
    }
  },
  "plot_threads": {
    "active": [],
    "resolved": []
  },
  "promises": {
    "setups": [],
    "payoffs": []
  },
  "previous_chapter_summary": "",
  "next_chapter_beats": []
}
```

---

## Step 5: Quality Check Script

Save as `scripts/quality_check.py`:

```python
"""
Quality checking script for generated prose.
Run with: python scripts/quality_check.py output/chapters/chapter-01.md
"""

import re
import sys
import json
from pathlib import Path
from collections import Counter

# Load blacklist
BLACKLIST_PATH = Path("config/ai-vocabulary-blacklist.json")
with open(BLACKLIST_PATH) as f:
    BLACKLIST = json.load(f)

def load_text(filepath):
    """Load text from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def get_sentences(text):
    """Split text into sentences."""
    # Simple sentence splitter - can be improved with nltk
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if s.strip()]

def check_sentence_variation(text):
    """Check sentence length variation."""
    sentences = get_sentences(text)
    lengths = [len(s.split()) for s in sentences]
    
    if not lengths:
        return {"pass": False, "message": "No sentences found"}
    
    import statistics
    mean_length = statistics.mean(lengths)
    std_dev = statistics.stdev(lengths) if len(lengths) > 1 else 0
    
    # Check for consecutive similar lengths
    consecutive_similar = 0
    max_consecutive = 0
    for i in range(1, len(lengths)):
        if abs(lengths[i] - lengths[i-1]) < 5:
            consecutive_similar += 1
            max_consecutive = max(max_consecutive, consecutive_similar)
        else:
            consecutive_similar = 0
    
    passed = std_dev >= 8 and max_consecutive < 3
    
    return {
        "pass": passed,
        "mean_length": round(mean_length, 2),
        "std_dev": round(std_dev, 2),
        "max_consecutive_similar": max_consecutive,
        "message": f"Mean: {mean_length:.1f}, StdDev: {std_dev:.1f}, MaxConsecutive: {max_consecutive}"
    }

def check_blacklisted_words(text):
    """Check for AI vocabulary tells."""
    text_lower = text.lower()
    found = []
    
    for word in BLACKLIST.get("words", []):
        if re.search(r'\b' + word.lower() + r'\b', text_lower):
            found.append(word)
    
    for phrase in BLACKLIST.get("phrases", []):
        if phrase.lower() in text_lower:
            found.append(phrase)
    
    return {
        "pass": len(found) == 0,
        "found": found,
        "message": f"Found {len(found)} blacklisted items: {', '.join(found)}" if found else "No blacklisted vocabulary"
    }

def check_dialogue_tags(text):
    """Check dialogue tag usage."""
    # Find all dialogue tags
    tag_pattern = r'[,"]?\s*(said|asked|replied|whispered|shouted|muttered|exclaimed|declared|announced|insisted|demanded|pleaded|suggested|admitted|confessed|murmured|growled|hissed|snapped|snarled|purred|cooed|stammered|stuttered|gasped|breathed|sighed|groaned|moaned)\s'
    
    tags = re.findall(tag_pattern, text, re.IGNORECASE)
    tag_counts = Counter(tags)
    
    total_tags = len(tags)
    said_count = tag_counts.get('said', 0) + tag_counts.get('asked', 0)
    
    if total_tags == 0:
        return {"pass": True, "message": "No dialogue tags found"}
    
    said_ratio = said_count / total_tags
    
    # Check for adverbs on tags
    adverb_pattern = r'(said|asked)\s+\w+ly\b'
    adverb_tags = re.findall(adverb_pattern, text, re.IGNORECASE)
    
    passed = said_ratio >= 0.80 and len(adverb_tags) == 0
    
    return {
        "pass": passed,
        "said_ratio": round(said_ratio, 2),
        "adverb_tags_found": adverb_tags,
        "message": f"Said/asked ratio: {said_ratio:.0%}, Adverb tags: {len(adverb_tags)}"
    }

def check_telling_emotions(text):
    """Check for telling instead of showing emotions."""
    telling_patterns = [
        r'\b(he|she|they|I)\s+felt\s+(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|annoyed|furious|terrified|joyful|miserable|depressed|elated)',
        r'\b(he|she|they|I)\s+(was|were|am)\s+(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|annoyed|furious|terrified|joyful|miserable|depressed|elated)',
        r'"I\'m\s+(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|annoyed|furious|terrified)"',
    ]
    
    found = []
    for pattern in telling_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        found.extend(matches)
    
    return {
        "pass": len(found) <= 2,  # Allow a couple
        "found_count": len(found),
        "message": f"Found {len(found)} 'telling' emotion statements"
    }

def check_three_item_lists(text):
    """Check for overuse of three-item lists."""
    # Pattern for three-item lists
    pattern = r'\b\w+,\s+\w+,\s+and\s+\w+\b'
    matches = re.findall(pattern, text)
    
    word_count = len(text.split())
    max_allowed = max(1, word_count // 1000)
    
    return {
        "pass": len(matches) <= max_allowed,
        "found": len(matches),
        "max_allowed": max_allowed,
        "message": f"Found {len(matches)} three-item lists (max {max_allowed} for {word_count} words)"
    }

def calculate_dialogue_ratio(text):
    """Calculate dialogue to narrative ratio."""
    # Find all dialogue (text between quotes)
    dialogue = re.findall(r'"[^"]*"', text)
    dialogue_chars = sum(len(d) for d in dialogue)
    total_chars = len(text)
    
    if total_chars == 0:
        return {"pass": True, "ratio": 0, "message": "No text to analyze"}
    
    ratio = dialogue_chars / total_chars
    
    # Romance should be 45-60% dialogue
    passed = 0.30 <= ratio <= 0.65  # Wider range to be flexible
    
    return {
        "pass": passed,
        "ratio": round(ratio, 2),
        "message": f"Dialogue ratio: {ratio:.0%} (target: 30-65%)"
    }

def run_all_checks(filepath):
    """Run all quality checks on a file."""
    text = load_text(filepath)
    
    print(f"\n{'='*60}")
    print(f"QUALITY CHECK: {filepath}")
    print(f"{'='*60}")
    print(f"Word count: {len(text.split())}")
    print(f"{'='*60}\n")
    
    checks = {
        "Sentence Variation": check_sentence_variation(text),
        "Blacklisted Words": check_blacklisted_words(text),
        "Dialogue Tags": check_dialogue_tags(text),
        "Telling Emotions": check_telling_emotions(text),
        "Three-Item Lists": check_three_item_lists(text),
        "Dialogue Ratio": calculate_dialogue_ratio(text),
    }
    
    all_passed = True
    for check_name, result in checks.items():
        status = "✅ PASS" if result["pass"] else "❌ FAIL"
        all_passed = all_passed and result["pass"]
        print(f"{status} | {check_name}")
        print(f"       {result['message']}")
        print()
    
    print(f"{'='*60}")
    print(f"OVERALL: {'✅ ALL CHECKS PASSED' if all_passed else '❌ SOME CHECKS FAILED'}")
    print(f"{'='*60}\n")
    
    return all_passed, checks

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quality_check.py <filepath>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    passed, _ = run_all_checks(filepath)
    sys.exit(0 if passed else 1)
```

---

## Step 6: AI Vocabulary Blacklist

Save as `config/ai-vocabulary-blacklist.json`:

```json
{
  "words": [
    "delve",
    "tapestry",
    "testament",
    "beacon",
    "myriad",
    "multifaceted",
    "nuanced",
    "intricate",
    "pivotal",
    "crucial",
    "realm",
    "landscape",
    "embark",
    "journey",
    "foster",
    "leverage",
    "harness",
    "showcase",
    "underscore",
    "revolutionary",
    "cutting-edge",
    "transformative",
    "groundbreaking",
    "meticulous",
    "furthermore",
    "moreover",
    "additionally",
    "consequently",
    "notably",
    "significantly",
    "notwithstanding",
    "whilst",
    "amidst",
    "amongst"
  ],
  "phrases": [
    "it's worth noting",
    "in today's",
    "rich tapestry",
    "stands as a testament",
    "in the realm of",
    "a testament to",
    "serves as a",
    "it is important to note",
    "needless to say",
    "at the end of the day",
    "when it comes to",
    "in terms of",
    "the fact that",
    "deeply rooted",
    "intricately woven",
    "meticulously crafted"
  ],
  "patterns": [
    "It's not about X, it's about Y",
    "From X to Y, [something] has",
    "Whether it's X or Y"
  ]
}
```

---

## Step 7: Scene Generation Prompt Template

Save as `prompts/scene-generation.md`:

```markdown
# Scene Generation Request

## Context Loaded
- World Bible: [loaded/not loaded]
- Character Profiles: [list loaded characters]
- Previous Chapter Summary: [summary]
- Current Story State: [state]

## Scene Requirements

**Chapter:** [number]
**Scene:** [number within chapter]
**POV Character:** [name]
**Scene Type:** [Action/Dialogue/Intimate/Transition]

**Scene Goal:** [What the POV character wants]
**Scene Conflict:** [What prevents them]
**Scene Disaster/Outcome:** [How it ends - usually badly]

**Beat Outline:**
1. [First beat]
2. [Second beat]
3. [Third beat]
...

**Characters Present:** [list with brief emotional states]

**Setting:** [location, time, atmosphere]

**Required Story Elements:**
- [ ] [Element that must appear]
- [ ] [Plot thread to advance]
- [ ] [Relationship beat to hit]

**Heat Level:** [1-5 if applicable]

**Word Count Target:** [approximate words]

---

## GENERATION INSTRUCTIONS

Write this scene following ALL rules in the style framework.

Before writing, confirm:
1. POV character voice profile loaded
2. All present characters' voice profiles reviewed
3. Scene-Sequel structure clear (is this a Scene or a Sequel?)
4. Sentence variation strategy planned

After every 200 words, pause and verify:
- No blacklisted vocabulary used
- Sentence lengths varying appropriately
- Showing not telling
- Dialogue has subtext
- Character voices distinct

End the scene with a hook that compels reading forward.

---

## OUTPUT FORMAT

[Scene prose here]

---

## POST-GENERATION CHECKLIST

After writing, confirm:
- [ ] No blacklisted words
- [ ] Sentence length std dev > 8
- [ ] "Said" used for 85%+ of tags
- [ ] No adverbs on dialogue tags
- [ ] No "felt [emotion]" constructions
- [ ] Three-item lists under limit
- [ ] Character voices consistent
- [ ] Scene ends with hook
```

---

## How to Use with Claude Code

### Starting a New Project

```bash
# In your terminal with Claude Code
claude

# Then in Claude Code:
> Create the novel-engine project structure following the implementation guide
> Load my world bible from [path] and convert it to the expected format
> Create character voice cards for [list main characters]
```

### Generating a Chapter

```bash
# In Claude Code:
> Load the style framework and story state
> Generate Chapter 3 following these beats:
  1. [POV character] discovers [thing]
  2. Confrontation with [antagonist]
  3. Escape attempt fails
  4. Cliffhanger ending
> Run quality checks on the output
> If any checks fail, revise and recheck
```

### Quality Check Workflow

```bash
# After generation:
> Run python scripts/quality_check.py output/chapters/chapter-03.md
> Review failed checks
> Revise the chapter to fix issues
> Run checks again until all pass
> Update story-state.json with new chapter info
```

### Iterative Improvement

```bash
# Compare against benchmark authors:
> Analyze the prose style of this chapter
> Compare sentence variation to Patricia Briggs benchmark
> Identify areas where character voices blur together
> Revise dialogue to increase differentiation
```

---

## Advanced Features to Add

### 1. Benchmark Comparison Tool
Compare generated prose metrics against samples from your benchmark authors.

### 2. Character Voice Drift Detection
Track character voice consistency across chapters and flag when characters start sounding alike.

### 3. Pacing Visualizer
Generate a visual tension curve showing high/low tension scenes across the manuscript.

### 4. Continuity Checker
Flag potential contradictions with previous chapters (character locations, timeline issues).

### 5. Promise Tracker
Track setups (Chekhov's guns) and ensure they get payoff.

---

## Tips for Best Results

1. **Always load context first** - Don't generate cold. Load world bible, character profiles, and previous chapter summary.

2. **Generate in scenes, not chapters** - Smaller units allow better quality control.

3. **Run quality checks religiously** - Every scene should pass all gates before moving on.

4. **Maintain the story state** - Update after every generation session.

5. **Use the character voice cards** - Reference them explicitly during generation.

6. **Iterate on failures** - When quality checks fail, revise specifically for that issue.

7. **Trust the blacklist** - If a word is flagged, replace it. No exceptions.

8. **Vary consciously** - When in doubt, make the less obvious choice.
