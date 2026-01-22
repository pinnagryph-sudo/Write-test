# Scene Generation Request

## Pre-Generation Checklist
Before generating, confirm you have loaded:
- [ ] `config/style-framework.md` (or `prompts/system-prompt.md`)
- [ ] Character voice cards for all characters in this scene
- [ ] Current story state from `source-materials/story-state.json`
- [ ] Previous chapter summary (if continuing)

---

## Scene Specification

### Basic Info
| Field | Value |
|-------|-------|
| Chapter | [number] |
| Scene | [number within chapter] |
| POV Character | [name] |
| Scene Type | [Action / Dialogue / Intimate / Reflection / Transition] |
| Target Word Count | [approximate] |
| Heat Level | [1-5 if intimate content] |

### Scene Structure (Fill in)

**GOAL:** What does the POV character want in this scene?
> 

**CONFLICT:** What prevents them from getting it?
> 

**DISASTER/OUTCOME:** How does the scene end? (Usually badly for Scenes, with decision for Sequels)
> 

### Beat Outline
*List the key moments that must happen in this scene*

1. 
2. 
3. 
4. 
5. 

### Characters Present
| Character | Starting Emotional State | What They Want |
|-----------|-------------------------|----------------|
| [POV] | | |
| | | |
| | | |

### Setting Details
- **Location:** 
- **Time of Day:** 
- **Weather/Atmosphere:** 
- **Key Environmental Details:** 

### Required Story Elements
*Things that MUST appear or be referenced*
- [ ] 
- [ ] 
- [ ] 

### Continuity Notes
*Important facts to maintain from previous scenes*
- 
- 

---

## Generation Instructions

Write this scene following the system prompt rules. Specifically remember:

### Sentence Variation
Plan your rhythm before writing:
- Open with [short/medium/long]
- Alternate deliberately
- Include at least one fragment
- No 3+ consecutive similar lengths

### Character Voice
For [POV CHARACTER], remember:
- Speech patterns: [from their voice card]
- Verbal tics: [from their voice card]
- Internal monologue style: [from their voice card]

### Dialogue Requirements
- Subtext in every exchange
- "Said" for 85%+ of tags
- Action beats every 4-5 lines
- No adverbs on tags
- Characters should NOT say exactly what they mean

### Show Don't Tell
For each emotional beat, plan:
- Physical sensation first
- Then reflex action
- Then conscious response
- NO "felt [emotion]" allowed

### Pacing
This scene should feel [fast/moderate/slow], so:
- [Fast]: Short sentences, quick dialogue, minimal description
- [Moderate]: Mixed lengths, balanced dialogue/action/interiority
- [Slow]: Longer sentences, more internal reflection, sensory detail

---

## Output Format

```markdown
[SCENE PROSE HERE]
```

---

## Post-Generation Verification

After writing, verify:
- [ ] No blacklisted vocabulary used
- [ ] Sentence length standard deviation > 8
- [ ] No more than 2 consecutive similar-length sentences
- [ ] "Said" used for 85%+ of dialogue tags
- [ ] Zero adverb tags
- [ ] No "felt [emotion]" constructions
- [ ] Maximum 1 three-item list
- [ ] Scene ends with a hook
- [ ] Character voices remain distinct
- [ ] All required story elements included
- [ ] Continuity maintained

---

## State Updates Required After Generation

After this scene, update story-state.json:
- [ ] Character locations
- [ ] Character emotional states
- [ ] Any new knowledge characters gained
- [ ] Plot threads advanced/created
- [ ] Promises made (setups for later payoff)
- [ ] Word count
- [ ] Chapter summary (if chapter complete)
