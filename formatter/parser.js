/**
 * The Bonded Path - Document Parser
 * Parses Markdown and DOCX files into a structured format
 */

class BondedPathParser {
    constructor(options = {}) {
        this.options = {
            bookNumber: options.bookNumber || '02',
            bookTitle: options.bookTitle || 'The Breed Atlas',
            bookSubtitle: options.bookSubtitle || 'Varieties, Patterns & Regional Lines',
            ...options
        };

        // Chapter number to word mapping
        this.chapterWords = [
            'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE',
            'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
            'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
            'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY'
        ];

        // Sidebar type mapping
        this.sidebarTypes = {
            'E': "HEALER'S NOTE",
            'T': 'TRADITIONAL KNOWLEDGE',
            'V': 'REGIONAL VARIATION',
            'D': 'DISPUTED CLAIM',
            'R': 'REGISTRY NOTE',
            'W': "WARDEN'S WARNING"
        };

        // Stats tracking
        this.stats = {
            chapters: 0,
            sections: 0,
            sidebars: 0,
            tables: 0,
            words: 0
        };
    }

    /**
     * Parse Markdown content into structured elements
     */
    parseMarkdown(content) {
        this.stats = { chapters: 0, sections: 0, sidebars: 0, tables: 0, words: 0 };

        const elements = [];
        const lines = content.split('\n');
        let i = 0;
        let needsDropCap = false;
        let isFirstChapter = true;
        let inTable = false;
        let tableRows = [];
        let currentBullets = [];

        // Add title page
        elements.push({ type: 'title-page', ...this.options });

        while (i < lines.length) {
            const line = lines[i].trim();
            const rawLine = lines[i];

            // Skip empty lines
            if (!line) {
                // Flush bullets if any
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                i++;
                continue;
            }

            // Skip book header lines
            if (this.isSkipLine(line)) {
                i++;
                continue;
            }

            // End of book marker
            if (/^## End of Book/i.test(line)) {
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                elements.push({ type: 'end-marker', text: line.replace(/^##\s*/, '') });
                i++;
                // Look for closing quote
                while (i < lines.length) {
                    const quoteLine = lines[i].trim();
                    if (quoteLine && quoteLine.startsWith('_"') || quoteLine.startsWith('*"')) {
                        elements.push({
                            type: 'end-quote',
                            text: this.cleanText(quoteLine)
                        });
                        break;
                    }
                    i++;
                }
                break;
            }

            // Table detection
            if (line.startsWith('|') && line.endsWith('|')) {
                // Flush bullets
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }

                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }

                // Skip separator row
                if (!/^\|[-:\s|]+\|$/.test(line)) {
                    const cells = line
                        .split('|')
                        .slice(1, -1)
                        .map(cell => this.cleanText(cell.trim()));
                    tableRows.push(cells);
                }
                i++;
                continue;
            } else if (inTable) {
                // End of table
                elements.push({ type: 'table', rows: tableRows });
                this.stats.tables++;
                inTable = false;
                tableRows = [];
            }

            // Chapter header (## Chapter X: Title)
            if (/^## Chapter/i.test(line)) {
                // Flush bullets
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }

                const chapterInfo = this.parseChapterHeader(line);
                elements.push({
                    type: 'chapter-header',
                    number: chapterInfo.number,
                    numberWord: this.chapterWords[chapterInfo.number] || chapterInfo.number.toString(),
                    title: chapterInfo.title,
                    subtitle: chapterInfo.subtitle,
                    isFirst: isFirstChapter
                });
                this.stats.chapters++;
                isFirstChapter = false;
                needsDropCap = true;
                i++;
                continue;
            }

            // Sidebar detection
            if (/\*\*SIDEBAR\s*\[([^\]\\]+)\]:/i.test(line)) {
                // Flush bullets
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }

                const sidebar = this.parseSidebar(line);
                if (sidebar) {
                    elements.push(sidebar);
                    this.stats.sidebars++;
                }
                i++;
                continue;
            }

            // H2 heading (not chapter)
            if (/^## /.test(line) && !/^## Chapter/i.test(line)) {
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                elements.push({
                    type: 'h2',
                    text: this.cleanText(line.replace(/^## /, ''))
                });
                this.stats.sections++;
                i++;
                continue;
            }

            // H3 heading
            if (/^### /.test(line)) {
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                elements.push({
                    type: 'h3',
                    text: this.cleanText(line.replace(/^### /, ''))
                });
                this.stats.sections++;
                i++;
                continue;
            }

            // H4 heading
            if (/^#### /.test(line)) {
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                elements.push({
                    type: 'h4',
                    text: this.cleanText(line.replace(/^#### /, ''))
                });
                this.stats.sections++;
                i++;
                continue;
            }

            // Bullet points
            if (/^[-*]\s+/.test(line)) {
                const bulletText = this.cleanText(line.replace(/^[-*]\s+/, ''));
                currentBullets.push(bulletText);
                i++;
                continue;
            }

            // Labeled paragraph (**Label:** Content)
            const labelMatch = line.match(/^\*\*([^:]+):\*\*\s*(.+)/);
            if (labelMatch) {
                if (currentBullets.length > 0) {
                    elements.push({ type: 'bullet-list', items: currentBullets });
                    currentBullets = [];
                }
                elements.push({
                    type: 'labeled-para',
                    label: labelMatch[1],
                    content: this.cleanText(labelMatch[2])
                });
                this.stats.words += this.countWords(labelMatch[2]);
                i++;
                continue;
            }

            // Regular paragraph
            if (currentBullets.length > 0) {
                elements.push({ type: 'bullet-list', items: currentBullets });
                currentBullets = [];
            }

            const cleanedText = this.cleanText(line);
            if (cleanedText) {
                elements.push({
                    type: 'paragraph',
                    text: cleanedText,
                    dropCap: needsDropCap
                });
                this.stats.words += this.countWords(cleanedText);
                needsDropCap = false;
            }

            i++;
        }

        // Flush any remaining bullets
        if (currentBullets.length > 0) {
            elements.push({ type: 'bullet-list', items: currentBullets });
        }

        // Flush any remaining table
        if (inTable && tableRows.length > 0) {
            elements.push({ type: 'table', rows: tableRows });
            this.stats.tables++;
        }

        return { elements, stats: this.stats };
    }

    /**
     * Parse DOCX content (after mammoth conversion)
     */
    parseDocxHtml(html) {
        this.stats = { chapters: 0, sections: 0, sidebars: 0, tables: 0, words: 0 };

        // Create a temporary DOM element to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const elements = [];
        let needsDropCap = false;
        let isFirstChapter = true;

        // Add title page
        elements.push({ type: 'title-page', ...this.options });

        // Walk through the document
        const bodyElements = doc.body.children;

        for (let i = 0; i < bodyElements.length; i++) {
            const el = bodyElements[i];
            const tagName = el.tagName.toLowerCase();
            const text = el.textContent.trim();

            if (!text) continue;

            // Chapter detection
            if ((tagName === 'h1' || tagName === 'h2') && /^Chapter\s*\d+/i.test(text)) {
                const chapterInfo = this.parseChapterHeader(text);
                elements.push({
                    type: 'chapter-header',
                    number: chapterInfo.number,
                    numberWord: this.chapterWords[chapterInfo.number] || chapterInfo.number.toString(),
                    title: chapterInfo.title,
                    subtitle: chapterInfo.subtitle,
                    isFirst: isFirstChapter
                });
                this.stats.chapters++;
                isFirstChapter = false;
                needsDropCap = true;
                continue;
            }

            // End marker
            if (/^End of Book/i.test(text)) {
                elements.push({ type: 'end-marker', text: text });
                continue;
            }

            // Headings
            if (tagName === 'h2') {
                elements.push({ type: 'h2', text: this.cleanText(text) });
                this.stats.sections++;
                continue;
            }

            if (tagName === 'h3') {
                elements.push({ type: 'h3', text: this.cleanText(text) });
                this.stats.sections++;
                continue;
            }

            if (tagName === 'h4') {
                elements.push({ type: 'h4', text: this.cleanText(text) });
                this.stats.sections++;
                continue;
            }

            // Tables
            if (tagName === 'table') {
                const rows = [];
                const tableRows = el.querySelectorAll('tr');
                tableRows.forEach(tr => {
                    const cells = [];
                    tr.querySelectorAll('th, td').forEach(cell => {
                        cells.push(this.cleanText(cell.textContent));
                    });
                    if (cells.length > 0) {
                        rows.push(cells);
                    }
                });
                if (rows.length > 0) {
                    elements.push({ type: 'table', rows });
                    this.stats.tables++;
                }
                continue;
            }

            // Lists
            if (tagName === 'ul' || tagName === 'ol') {
                const items = [];
                el.querySelectorAll('li').forEach(li => {
                    items.push(this.cleanText(li.textContent));
                });
                if (items.length > 0) {
                    elements.push({ type: 'bullet-list', items });
                }
                continue;
            }

            // Paragraphs
            if (tagName === 'p') {
                // Check for sidebar pattern
                if (/SIDEBAR\s*\[/i.test(text)) {
                    const sidebar = this.parseSidebar(text);
                    if (sidebar) {
                        elements.push(sidebar);
                        this.stats.sidebars++;
                        continue;
                    }
                }

                // Check for labeled paragraph
                const labelMatch = text.match(/^([^:]+):\s*(.+)/);
                if (labelMatch && el.querySelector('strong, b')) {
                    elements.push({
                        type: 'labeled-para',
                        label: labelMatch[1],
                        content: this.cleanText(labelMatch[2])
                    });
                    this.stats.words += this.countWords(labelMatch[2]);
                    continue;
                }

                // Regular paragraph
                const cleanedText = this.cleanText(text);
                if (cleanedText) {
                    elements.push({
                        type: 'paragraph',
                        text: cleanedText,
                        dropCap: needsDropCap
                    });
                    this.stats.words += this.countWords(cleanedText);
                    needsDropCap = false;
                }
            }
        }

        return { elements, stats: this.stats };
    }

    /**
     * Parse chapter header line
     */
    parseChapterHeader(line) {
        // Remove markdown prefix
        line = line.replace(/^#+\s*/, '');

        // Extract chapter number
        const numMatch = line.match(/Chapter\s*(\d+(?:\.\d+)?):?\s*/i);
        const number = numMatch ? parseInt(numMatch[1]) : 0;

        // Get the rest after "Chapter X:"
        let rest = line.replace(/Chapter\s*\d+(?:\.\d+)?:?\s*/i, '').trim();

        let title = rest;
        let subtitle = null;

        // Check for em-dash subtitle
        if (rest.includes('—')) {
            const parts = rest.split('—');
            title = parts[0].trim();
            subtitle = parts.slice(1).join('—').trim();
        }
        // Check for (X-Based) pattern (for family chapters)
        else if (/\([^)]*-Based\)/i.test(rest)) {
            const match = rest.match(/(.+?)\s*(\([^)]*-Based\))/i);
            if (match) {
                title = match[1].trim();
                subtitle = match[2].trim();
            }
        }

        return { number, title, subtitle };
    }

    /**
     * Parse sidebar line
     */
    parseSidebar(line) {
        // Pattern: **SIDEBAR [CODE]: Title** (Reliability: Level) _"Content"_
        const headerMatch = line.match(/\*\*SIDEBAR\s*\[([^\]\\]+)\]:\s*([^*]+)\*\*/i);
        if (!headerMatch) return null;

        const code = headerMatch[1].trim();
        const source = headerMatch[2].trim();
        const sidebarType = this.sidebarTypes[code] || 'NOTE';

        // Extract reliability
        const reliabilityMatch = line.match(/\(Reliability:\s*([^)]+)\)/i);
        const reliability = reliabilityMatch ? reliabilityMatch[1].trim() : 'Unknown';

        // Extract content (italic text in quotes)
        const contentMatch = line.match(/_"([^"]+)"_|_"([^"]+)"|"([^"]+)"_/);
        const content = contentMatch
            ? (contentMatch[1] || contentMatch[2] || contentMatch[3] || '').trim()
            : '';

        return {
            type: 'sidebar',
            code,
            sidebarType,
            source,
            reliability,
            content
        };
    }

    /**
     * Check if line should be skipped
     */
    isSkipLine(line) {
        const skipPatterns = [
            /^# BOOK/i,
            /^## Varieties, Patterns/i,
            /^## The Pinnagryph/i,
            /^## Understanding/i,
            /^---+$/,
            /^\*\*\*+$/
        ];

        return skipPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Clean text of markdown artifacts
     */
    cleanText(text) {
        if (!text) return '';

        return text
            // Remove bold markers
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            // Remove italic markers
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            // Remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // Remove links, keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Count words in text
     */
    countWords(text) {
        if (!text) return 0;
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Get current stats
     */
    getStats() {
        return this.stats;
    }
}

// Export for use
window.BondedPathParser = BondedPathParser;
