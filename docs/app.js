// Novel Engine - Web Interface

// ============================================================================
// CONFIGURATION DATA
// ============================================================================

const BLACKLIST = {
    tier1_eliminate: [
        "delve", "tapestry", "testament", "beacon", "myriad", "multifaceted",
        "embark", "journey", "realm", "poignant", "captivating", "resonate",
        "symphony", "indelible", "nuanced", "intricate", "unveil", "unravel",
        "whilst", "amongst", "amidst", "hitherto", "erstwhile", "paradigm",
        "synergy", "leverage", "holistic", "robust", "seamless", "groundbreaking",
        "spearhead", "foster", "cultivate", "underscore", "epitomize", "embody"
    ],
    tier2_limit: [
        "furthermore", "moreover", "nonetheless", "nevertheless", "henceforth",
        "thereby", "wherein", "thus", "hence", "accordingly", "subsequently",
        "conversely", "notably", "specifically", "particularly"
    ],
    phrases_eliminate: [
        "rich tapestry", "stands as a testament", "serves as a beacon",
        "delve into", "myriad of", "embark on a journey", "in the realm of",
        "it is worth noting", "it goes without saying", "needless to say",
        "at the end of the day", "when all is said and done", "in today's world",
        "since the dawn of time", "throughout history", "in this day and age",
        "a testament to", "serves as a reminder", "paints a picture",
        "sheds light on", "brings to light", "comes to light",
        "it is important to note", "it should be noted", "interestingly enough",
        "one cannot help but", "it would be remiss", "the fact that",
        "in terms of", "with regard to", "in light of", "by virtue of"
    ]
};

const THRESHOLDS = {
    sentence: {
        std_dev_min: 8,
        max_consecutive_similar: 2
    },
    dialogue: {
        said_percentage_min: 0.80,
        ratios: {
            romance: { min: 0.45, max: 0.60 },
            fantasy: { min: 0.20, max: 0.35 },
            erotica: { min: 0.25, max: 0.45 },
            default: { min: 0.30, max: 0.55 }
        }
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let state = {
    metadata: {
        title: "",
        genre: "fantasy_romance",
        heat_level: 4,
        target_word_count: 80000,
        current_word_count: 0
    },
    chapters: {
        total_planned: 25,
        current_chapter: 0,
        completed_chapters: []
    },
    documents: {
        worldBible: "",
        storyOutline: ""
    },
    characters: {}
};

let currentEditingCharacter = null;

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('novel-engine-state');
    if (saved) {
        state = JSON.parse(saved);
    }
    updateDashboard();
    loadDocumentsToUI();
    loadCharactersToUI();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('novel-engine-state', JSON.stringify(state));
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Activate clicked tab
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById(tabId).classList.add('active');
    });
});

// ============================================================================
// DASHBOARD
// ============================================================================

function updateDashboard() {
    // Word progress
    const progress = (state.metadata.current_word_count / state.metadata.target_word_count) * 100;
    document.getElementById('word-progress').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('current-words').textContent = state.metadata.current_word_count.toLocaleString();
    document.getElementById('target-words').textContent = state.metadata.target_word_count.toLocaleString();

    // Chapters
    document.getElementById('completed-chapters').textContent = state.chapters.completed_chapters.length;
    document.getElementById('total-chapters').textContent = state.chapters.total_planned;
    document.getElementById('current-chapter').textContent = state.chapters.current_chapter;

    // Story details
    document.getElementById('story-title').value = state.metadata.title;
    document.getElementById('story-genre').value = state.metadata.genre;
    document.getElementById('heat-level').value = state.metadata.heat_level;

    // Document status
    updateDocumentStatus('world-bible', state.documents.worldBible);
    updateDocumentStatus('story-outline', state.documents.storyOutline);
    updateDocumentStatus('characters', Object.keys(state.characters).length > 0);

    // Update POV character dropdown
    updatePOVDropdown();
}

function updateDocumentStatus(docId, hasContent) {
    const el = document.getElementById(`status-${docId}`);
    if (hasContent) {
        el.classList.add('loaded');
        el.querySelector('.status-icon').textContent = '●';
    } else {
        el.classList.remove('loaded');
        el.querySelector('.status-icon').textContent = '○';
    }
}

function saveStoryDetails() {
    state.metadata.title = document.getElementById('story-title').value;
    state.metadata.genre = document.getElementById('story-genre').value;
    state.metadata.heat_level = parseInt(document.getElementById('heat-level').value);
    saveState();
    alert('Story details saved!');
}

// ============================================================================
// DOCUMENT HANDLING
// ============================================================================

function handleFileUpload(input, docType) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        document.getElementById(`${docType}-content`).value = content;
    };
    reader.readAsText(file);
}

function saveDocument(docType) {
    const content = document.getElementById(`${docType}-content`).value;

    if (docType === 'world-bible') {
        state.documents.worldBible = content;
    } else if (docType === 'story-outline') {
        state.documents.storyOutline = content;
    }

    saveState();
    updateDashboard();
    alert(`${docType.replace('-', ' ')} saved!`);
}

function loadDocumentsToUI() {
    document.getElementById('world-bible-content').value = state.documents.worldBible || '';
    document.getElementById('story-outline-content').value = state.documents.storyOutline || '';
}

// ============================================================================
// CHARACTER HANDLING
// ============================================================================

function loadCharactersToUI() {
    const container = document.getElementById('characters-list');
    container.innerHTML = '';

    for (const [name, content] of Object.entries(state.characters)) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.onclick = () => editCharacter(name);

        // Extract role from content if available
        const roleMatch = content.match(/Role:\s*(.+)/i);
        const role = roleMatch ? roleMatch[1].trim() : 'Character';

        card.innerHTML = `
            <h4>${name}</h4>
            <p>${role}</p>
        `;
        container.appendChild(card);
    }
}

function addNewCharacter() {
    currentEditingCharacter = null;
    document.getElementById('editing-character-name').textContent = 'New Character';
    document.getElementById('character-content').value = `# Character Name

## Identity
- Full Name:
- Age:
- Role:

## Speech Patterns
"Example dialogue line 1"
"Example dialogue line 2"

## Vocabulary
Words they use:
Words they avoid:

## Emotional Expression
How they show anger:
How they show affection:
How they show fear:
`;
    document.getElementById('character-editor').classList.remove('hidden');
}

function editCharacter(name) {
    currentEditingCharacter = name;
    document.getElementById('editing-character-name').textContent = name;
    document.getElementById('character-content').value = state.characters[name];
    document.getElementById('character-editor').classList.remove('hidden');
}

function handleCharacterUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('character-content').value = e.target.result;
    };
    reader.readAsText(file);
}

function saveCharacter() {
    const content = document.getElementById('character-content').value;

    // Extract name from content (first # heading)
    const nameMatch = content.match(/^#\s+(.+)/m);
    const name = nameMatch ? nameMatch[1].trim() : 'Unnamed Character';

    // If editing existing and name changed, delete old
    if (currentEditingCharacter && currentEditingCharacter !== name) {
        delete state.characters[currentEditingCharacter];
    }

    state.characters[name] = content;
    saveState();
    loadCharactersToUI();
    updateDashboard();
    closeCharacterEditor();
    alert(`Character "${name}" saved!`);
}

function deleteCharacter() {
    if (!currentEditingCharacter) {
        closeCharacterEditor();
        return;
    }

    if (confirm(`Delete character "${currentEditingCharacter}"?`)) {
        delete state.characters[currentEditingCharacter];
        saveState();
        loadCharactersToUI();
        updateDashboard();
        closeCharacterEditor();
    }
}

function closeCharacterEditor() {
    document.getElementById('character-editor').classList.add('hidden');
    currentEditingCharacter = null;
}

function updatePOVDropdown() {
    const select = document.getElementById('gen-pov-character');
    select.innerHTML = '<option value="">Select character...</option>';

    for (const name of Object.keys(state.characters)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
}

// ============================================================================
// QUALITY CHECKING
// ============================================================================

function handleQualityUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('quality-text').value = e.target.result;
    };
    reader.readAsText(file);
}

function runQualityCheck() {
    const text = document.getElementById('quality-text').value;
    const genre = document.getElementById('quality-genre').value;

    if (!text.trim()) {
        alert('Please enter some text to check.');
        return;
    }

    const results = analyzeText(text, genre);
    displayResults(results);
}

function analyzeText(text, genre) {
    const results = {
        wordCount: text.split(/\s+/).filter(w => w).length,
        critical: {},
        advisory: {}
    };

    // Sentence Variation Check
    results.critical.sentenceVariation = checkSentenceVariation(text);

    // Blacklisted Vocabulary Check
    results.critical.blacklistedVocab = checkBlacklistedVocab(text);

    // Dialogue Tags Check
    results.critical.dialogueTags = checkDialogueTags(text);

    // Three-Item Lists Check
    results.critical.threeItemLists = checkThreeItemLists(text);

    // Advisory: Telling Emotions
    results.advisory.tellingEmotions = checkTellingEmotions(text);

    // Advisory: Dialogue Ratio
    results.advisory.dialogueRatio = checkDialogueRatio(text, genre);

    // Advisory: Passive Voice
    results.advisory.passiveVoice = checkPassiveVoice(text);

    return results;
}

function getSentences(text) {
    // Remove dialogue for cleaner sentence splitting
    const cleaned = text.replace(/"[^"]*"/g, ' DIALOGUE ');
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim() && s.split(/\s+/).length > 1);
    return sentences;
}

function checkSentenceVariation(text) {
    const sentences = getSentences(text);

    if (sentences.length < 3) {
        return { pass: true, message: "Not enough sentences to analyze", data: {} };
    }

    const lengths = sentences.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Check consecutive similar lengths
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    for (let i = 1; i < lengths.length; i++) {
        if (Math.abs(lengths[i] - lengths[i - 1]) < 5) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
            currentConsecutive = 1;
        }
    }

    const pass = stdDev >= THRESHOLDS.sentence.std_dev_min &&
        maxConsecutive <= THRESHOLDS.sentence.max_consecutive_similar;

    return {
        pass,
        message: `StdDev: ${stdDev.toFixed(1)} (min ${THRESHOLDS.sentence.std_dev_min}), ` +
            `MaxConsecutive: ${maxConsecutive} (max ${THRESHOLDS.sentence.max_consecutive_similar})`,
        data: { stdDev: stdDev.toFixed(1), maxConsecutive, mean: mean.toFixed(1) }
    };
}

function checkBlacklistedVocab(text) {
    const textLower = text.toLowerCase();
    const foundWords = [];
    const foundPhrases = [];

    // Check tier 1 words
    for (const word of BLACKLIST.tier1_eliminate) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        if (regex.test(textLower)) {
            foundWords.push(word);
        }
    }

    // Check phrases
    for (const phrase of BLACKLIST.phrases_eliminate) {
        if (textLower.includes(phrase.toLowerCase())) {
            foundPhrases.push(phrase);
        }
    }

    const pass = foundWords.length === 0 && foundPhrases.length === 0;

    let message = pass ? "No blacklisted vocabulary found" : "";
    if (foundWords.length > 0) {
        message += `Banned words: ${foundWords.join(', ')}`;
    }
    if (foundPhrases.length > 0) {
        if (message) message += "; ";
        message += `Banned phrases: ${foundPhrases.join(', ')}`;
    }

    return { pass, message, data: { foundWords, foundPhrases } };
}

function checkDialogueTags(text) {
    const tagPattern = /[""][^""]*[""]\s*(?:\w+\s+)?(said|asked|replied|whispered|shouted|muttered|exclaimed|declared|announced|insisted|demanded|pleaded|suggested|admitted|murmured|growled|hissed|snapped|snarled|purred|stammered|gasped|breathed|sighed|groaned|stated|queried|inquired|retorted|countered|responded)/gi;

    const matches = text.match(tagPattern) || [];
    const tags = matches.map(m => {
        const tagMatch = m.match(/(said|asked|replied|whispered|shouted|muttered|exclaimed|declared|announced|insisted|demanded|pleaded|suggested|admitted|murmured|growled|hissed|snapped|snarled|purred|stammered|gasped|breathed|sighed|groaned|stated|queried|inquired|retorted|countered|responded)/i);
        return tagMatch ? tagMatch[1].toLowerCase() : null;
    }).filter(Boolean);

    if (tags.length === 0) {
        return { pass: true, message: "No dialogue tags found (may use action beats only)", data: {} };
    }

    const saidCount = tags.filter(t => t === 'said' || t === 'asked').length;
    const saidRatio = saidCount / tags.length;

    // Check for adverbs on tags
    const adverbPattern = /\b(said|asked|whispered|shouted|muttered)\s+(\w+ly)\b/gi;
    const adverbMatches = text.match(adverbPattern) || [];

    const pass = saidRatio >= THRESHOLDS.dialogue.said_percentage_min && adverbMatches.length === 0;

    let message = `Said/asked: ${(saidRatio * 100).toFixed(0)}% (target: ${THRESHOLDS.dialogue.said_percentage_min * 100}%)`;
    if (adverbMatches.length > 0) {
        message += `; Adverb tags found: ${adverbMatches.join(', ')}`;
    }

    return { pass, message, data: { saidRatio: (saidRatio * 100).toFixed(0), adverbMatches } };
}

function checkThreeItemLists(text) {
    const pattern = /\b(\w+),\s+(\w+),\s+and\s+(\w+)\b/g;
    const matches = text.match(pattern) || [];

    const wordCount = text.split(/\s+/).filter(w => w).length;
    const maxAllowed = Math.max(1, Math.floor(wordCount / 1000));

    const pass = matches.length <= maxAllowed;

    return {
        pass,
        message: `Found ${matches.length} three-item lists (max ${maxAllowed} for ${wordCount} words)`,
        data: { count: matches.length, maxAllowed, examples: matches.slice(0, 3) }
    };
}

function checkTellingEmotions(text) {
    const patterns = [
        /\b(he|she|they|I|[A-Z][a-z]+)\s+felt\s+(a\s+)?(wave|surge|rush|flicker|hint|touch|mixture)\s+of/gi,
        /\b(he|she|they|I|[A-Z][a-z]+)\s+felt\s+(angry|sad|happy|scared|afraid|nervous|anxious|excited|frustrated|annoyed|furious|terrified|joyful|miserable|depressed|elated|worried|relieved|confused|embarrassed|ashamed|guilty|proud|jealous|envious)/gi,
        /\b(he|she|they|I|[A-Z][a-z]+)\s+(was|were|am)\s+(filled with|overcome by|overwhelmed by)/gi,
        /a (wave|surge|rush) of \w+ (washed|swept|rushed) over/gi,
        /couldn't help but feel/gi
    ];

    let count = 0;
    const examples = [];

    for (const pattern of patterns) {
        const matches = text.match(pattern) || [];
        count += matches.length;
        examples.push(...matches.slice(0, 2));
    }

    const pass = count <= 2;

    return {
        pass,
        message: `Found ${count} 'telling' emotion statements (max 2 recommended)`,
        data: { count, examples: examples.slice(0, 5) }
    };
}

function checkDialogueRatio(text, genre) {
    const dialoguePattern = /[""][^""]*[""]/g;
    const dialogueMatches = text.match(dialoguePattern) || [];
    const dialogueChars = dialogueMatches.reduce((sum, d) => sum + d.length, 0);
    const totalChars = text.length;

    if (totalChars === 0) {
        return { pass: true, message: "No text to analyze", data: {} };
    }

    const ratio = dialogueChars / totalChars;
    const range = THRESHOLDS.dialogue.ratios[genre] || THRESHOLDS.dialogue.ratios.default;

    const pass = ratio >= range.min && ratio <= range.max;

    return {
        pass,
        message: `Dialogue ratio: ${(ratio * 100).toFixed(0)}% (target: ${(range.min * 100).toFixed(0)}-${(range.max * 100).toFixed(0)}% for ${genre})`,
        data: { ratio: (ratio * 100).toFixed(0), genre, range }
    };
}

function checkPassiveVoice(text) {
    const pattern = /\b(was|were|been|being|is|are|am)\s+(\w+ed|written|done|made|seen|known|taken|given)\b/gi;
    const matches = text.match(pattern) || [];

    const sentences = getSentences(text);
    const totalSentences = sentences.length;

    if (totalSentences === 0) {
        return { pass: true, message: "No sentences to analyze", data: {} };
    }

    const ratio = matches.length / totalSentences;
    const pass = ratio <= 0.05;

    return {
        pass,
        message: `Passive voice: ${(ratio * 100).toFixed(1)}% (target: under 5%)`,
        data: { ratio: (ratio * 100).toFixed(1), instances: matches.length }
    };
}

function displayResults(results) {
    document.getElementById('quality-results').classList.remove('hidden');
    document.getElementById('result-word-count').textContent = results.wordCount.toLocaleString();

    // Critical checks
    const criticalContainer = document.getElementById('critical-checks');
    criticalContainer.innerHTML = '';

    const criticalNames = {
        sentenceVariation: "Sentence Variation",
        blacklistedVocab: "Blacklisted Vocabulary",
        dialogueTags: "Dialogue Tags",
        threeItemLists: "Three-Item Lists"
    };

    for (const [key, check] of Object.entries(results.critical)) {
        criticalContainer.appendChild(createCheckResult(criticalNames[key], check, check.pass ? 'pass' : 'fail'));
    }

    // Advisory checks
    const advisoryContainer = document.getElementById('advisory-checks');
    advisoryContainer.innerHTML = '';

    const advisoryNames = {
        tellingEmotions: "Telling Emotions",
        dialogueRatio: "Dialogue Ratio",
        passiveVoice: "Passive Voice"
    };

    for (const [key, check] of Object.entries(results.advisory)) {
        advisoryContainer.appendChild(createCheckResult(advisoryNames[key], check, check.pass ? 'pass' : 'warn'));
    }
}

function createCheckResult(name, check, status) {
    const div = document.createElement('div');
    div.className = `check-result ${status}`;

    const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';

    div.innerHTML = `
        <span class="check-icon">${icon}</span>
        <div class="check-details">
            <h6>${name}</h6>
            <p>${check.message}</p>
        </div>
    `;

    return div;
}

// ============================================================================
// GENERATION
// ============================================================================

function generatePrompt() {
    const chapterNum = document.getElementById('gen-chapter-num').value;
    const povCharacter = document.getElementById('gen-pov-character').value;
    const beats = document.getElementById('gen-beats').value;
    const sceneType = document.getElementById('gen-scene-type').value;

    if (!beats.trim()) {
        alert('Please enter scene beats.');
        return;
    }

    const beatList = beats.split(',').map(b => b.trim()).filter(Boolean);

    let prompt = `# CHAPTER ${chapterNum} GENERATION

## Context
- Genre: ${state.metadata.genre}
- Heat Level: ${state.metadata.heat_level}
- POV Character: ${povCharacter || 'Not specified'}
- Scene Type: ${sceneType}

## Scene Beats
${beatList.map((b, i) => `${i + 1}. ${b}`).join('\n')}

`;

    // Add world context if available
    if (state.documents.worldBible) {
        prompt += `## World Context
${state.documents.worldBible.substring(0, 1000)}${state.documents.worldBible.length > 1000 ? '...' : ''}

`;
    }

    // Add character context if POV selected
    if (povCharacter && state.characters[povCharacter]) {
        prompt += `## POV Character Profile
${state.characters[povCharacter]}

`;
    }

    prompt += `## CRITICAL RULES
1. NO blacklisted vocabulary (delve, tapestry, testament, beacon, myriad, embark, journey, realm, etc.)
2. Vary sentence lengths deliberately (short/medium/long mix, std dev >= 8 words)
3. No more than 2 consecutive sentences of similar length
4. Use 'said' for 85%+ of dialogue tags - NO adverbs on tags
5. Show emotions through physical sensation and action, NEVER "felt [emotion]"
6. Max 1 three-item list per 1000 words
7. Follow Scene-Sequel structure (${sceneType === 'scene' ? 'Goal → Conflict → Disaster' : 'Reaction → Dilemma → Decision'})
8. Include subtext in all dialogue

## Target
- Word count: 3000-4000 words
- End with a hook for the next scene

Begin writing Chapter ${chapterNum}:
`;

    document.getElementById('prompt-output').value = prompt;
    document.getElementById('generation-output').classList.remove('hidden');
}

function copyPrompt() {
    const prompt = document.getElementById('prompt-output');
    prompt.select();
    document.execCommand('copy');
    alert('Prompt copied to clipboard!');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadState();
});
