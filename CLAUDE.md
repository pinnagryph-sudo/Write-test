# Novel Engine - Claude Code Instructions

## Project Purpose
This is a human-voiced novel generation engine for fantasy, romance, and erotica fiction. It generates prose that is indistinguishable from human authors by following strict style rules, avoiding AI writing signatures, and cross-checking against quality benchmarks.

## Critical Files - Always Load Before Generation

### Style Framework (MANDATORY)
`config/style-framework.md` - Contains all prose rules, benchmarks, and techniques. Load this FIRST before any generation task.

### Vocabulary Blacklist (MANDATORY)
`config/ai-vocabulary-blacklist.json` - Words and phrases that flag AI-generated text. NEVER use any term from this list.

### Quality Thresholds
`config/quality-thresholds.json` - Metric targets for automated quality checking.

## Source Materials Location

- **World Bible**: `source-materials/world-bible.md`
- **Character Profiles**: `source-materials/characters/[name].md`
- **Story Outline**: `source-materials/story-outline.md`
- **Story State**: `source-materials/story-state.json` (UPDATE after every generation)

## Generation Workflow

### Before Writing ANY Prose:
1. Load `config/style-framework.md`
2. Load relevant character voice cards from `source-materials/characters/`
3. Check `source-materials/story-state.json` for continuity
4. Load previous chapter summary if continuing

### During Generation:
1. Follow Scene-Sequel structure (Goal → Conflict → Disaster → Reaction → Dilemma → Decision)
2. Vary sentence lengths deliberately (short/medium/long mix)
3. Use "said" for 85%+ of dialogue tags
4. Show emotions through physical sensation and action, not telling
5. Maintain distinct character voices per their documented profiles
6. Include subtext in all dialogue

### After Generation:
1. Run `python scripts/quality_check.py output/chapters/[chapter].md`
2. Review any failed checks
3. Revise until ALL quality gates pass
4. Update `source-materials/story-state.json`
5. Save final version to `output/chapters/`

## Quality Gates (MUST PASS)

| Gate | Requirement |
|------|-------------|
| Blacklisted Vocabulary | Zero matches |
| Sentence Variation | Std dev ≥ 8 words |
| Consecutive Similar | Max 2 in a row |
| Said Tag Usage | ≥ 80% of dialogue tags |
| Adverb Tags | Zero allowed |
| Three-Item Lists | Max 1 per 1000 words |
| Telling Emotions | Max 2 per scene |

## Commands Reference

```
# Generate a chapter
/generate chapter [number] --beats "[beat1], [beat2], [beat3]"

# Check quality of generated file
/check output/chapters/chapter-XX.md

# Create/edit character voice card
/character [name]

# View current story state
/state

# Update story state after generation
/update-state chapter=[num] summary="[summary]"

# Compare prose against benchmark
/benchmark output/chapters/chapter-XX.md --author "Patricia Briggs"
```

## Writing Rules Summary

### NEVER DO:
- Use blacklisted words (delve, tapestry, testament, beacon, myriad, etc.)
- Write "[Character] felt [emotion]"
- Use adverbs on dialogue tags ("said angrily")
- Write 3+ consecutive sentences of similar length
- Have characters state emotions directly in dialogue
- Use more than one three-item list per 1000 words

### ALWAYS DO:
- Vary sentence lengths deliberately
- Show emotions through physical sensation and action
- Include subtext in dialogue (deflection, incomplete thoughts)
- Use "said" for most dialogue tags
- End scenes with hooks
- Maintain distinct character voices
- Follow Motivation → Reaction order (visceral → reflex → rational)

## Heat Level Definitions

| Level | Name | Description |
|-------|------|-------------|
| 1 | Sweet | Closed door, fade to black |
| 2 | Sensual | Described kissing, some touching |
| 3 | Steamy | Physical details, emotions foregrounded |
| 4 | Explicit | Detailed descriptions, explicit terminology |
| 5 | Erotica | Physical acts as primary focus |

## Troubleshooting

### Quality check failing on sentence variation
- Review paragraph structure, add deliberate short sentences after long ones
- Include sentence fragments for rhythm
- Vary paragraph lengths (single sentence paragraphs are valid)

### Character voices blending together
- Reload character voice cards
- Review vocabulary inventories - ensure characters use different words
- Check verbal tics are being applied
- Verify sentence length preferences per character

### Prose feels flat/predictable
- At key moments, reject the first/most obvious word choice
- Reduce metaphor density (cut 50%)
- Add physical sensation and environmental detail
- Increase subtext in dialogue

### Pacing issues
- Match sentence length to tension (short = fast)
- Use Scene-Sequel structure explicitly
- Ensure try-fail cycles (No-and, Yes-but outcomes)
- Check chapter length against genre targets
