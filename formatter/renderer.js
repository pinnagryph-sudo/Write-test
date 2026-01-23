/**
 * The Bonded Path - Document Renderer
 * Renders parsed elements into print-ready HTML
 */

class BondedPathRenderer {
    constructor(options = {}) {
        this.options = {
            showPageBreaks: true,
            ...options
        };
    }

    /**
     * Render all elements to HTML
     */
    render(elements) {
        let html = '';

        elements.forEach((element, index) => {
            html += this.renderElement(element, index);
        });

        return html;
    }

    /**
     * Render a single element
     */
    renderElement(element, index) {
        switch (element.type) {
            case 'title-page':
                return this.renderTitlePage(element);
            case 'chapter-header':
                return this.renderChapterHeader(element);
            case 'h2':
                return this.renderH2(element);
            case 'h3':
                return this.renderH3(element);
            case 'h4':
                return this.renderH4(element);
            case 'paragraph':
                return this.renderParagraph(element);
            case 'labeled-para':
                return this.renderLabeledPara(element);
            case 'bullet-list':
                return this.renderBulletList(element);
            case 'sidebar':
                return this.renderSidebar(element);
            case 'table':
                return this.renderTable(element);
            case 'end-marker':
                return this.renderEndMarker(element);
            case 'end-quote':
                return this.renderEndQuote(element);
            default:
                return '';
        }
    }

    /**
     * Render decorative opener
     */
    renderOpener() {
        return '<div class="doc-opener">&#183; &#9674; &#183;</div>';
    }

    /**
     * Render decorative divider
     */
    renderDivider() {
        return '<div class="doc-divider">&#9674;</div>';
    }

    /**
     * Render page break
     */
    renderPageBreak() {
        if (this.options.showPageBreaks) {
            return '<div class="doc-page-break"></div>';
        }
        return '';
    }

    /**
     * Render title page
     */
    renderTitlePage(element) {
        const bookNum = element.bookNumber;
        const bookNumWord = this.getBookWord(bookNum);

        return `
            <div class="doc-page doc-title-page">
                ${this.renderOpener()}
                <div class="doc-book-number">BOOK ${bookNumWord}</div>
                <div class="doc-book-title">${this.escapeHtml(element.bookTitle)}</div>
                ${element.bookSubtitle ? `<div class="doc-book-subtitle">${this.escapeHtml(element.bookSubtitle)}</div>` : ''}
                ${this.renderDivider()}
            </div>
        `;
    }

    /**
     * Render chapter header
     */
    renderChapterHeader(element) {
        let html = '';

        if (!element.isFirst) {
            html += this.renderPageBreak();
        }

        html += `
            <div class="doc-chapter">
                ${this.renderOpener()}
                <div class="doc-chapter-number">CHAPTER ${element.numberWord}</div>
                <div class="doc-chapter-title">${this.escapeHtml(element.title)}</div>
                ${element.subtitle ? `<div class="doc-chapter-subtitle">${this.escapeHtml(element.subtitle)}</div>` : ''}
                ${this.renderDivider()}
            </div>
        `;

        return html;
    }

    /**
     * Render H2 heading
     */
    renderH2(element) {
        return `<h2 class="doc-h2">${this.escapeHtml(element.text)}</h2>`;
    }

    /**
     * Render H3 heading
     */
    renderH3(element) {
        return `<h3 class="doc-h3">${this.escapeHtml(element.text)}</h3>`;
    }

    /**
     * Render H4 heading
     */
    renderH4(element) {
        return `<h4 class="doc-h4">${this.escapeHtml(element.text)}</h4>`;
    }

    /**
     * Render paragraph (with optional drop cap)
     */
    renderParagraph(element) {
        if (element.dropCap && element.text.length > 1) {
            const firstChar = element.text.charAt(0).toUpperCase();
            const rest = element.text.substring(1);

            return `
                <p class="doc-para has-drop-cap">
                    <span class="doc-drop-cap">${this.escapeHtml(firstChar)}</span>${this.escapeHtml(rest)}
                </p>
            `;
        }

        return `<p class="doc-para">${this.escapeHtml(element.text)}</p>`;
    }

    /**
     * Render labeled paragraph
     */
    renderLabeledPara(element) {
        return `
            <p class="doc-labeled-para">
                <span class="doc-label">${this.escapeHtml(element.label)}:</span> ${this.escapeHtml(element.content)}
            </p>
        `;
    }

    /**
     * Render bullet list
     */
    renderBulletList(element) {
        const items = element.items
            .map(item => `<li class="doc-bullet-item">${this.escapeHtml(item)}</li>`)
            .join('');

        return `<ul class="doc-bullet-list">${items}</ul>`;
    }

    /**
     * Render sidebar
     */
    renderSidebar(element) {
        return `
            <div class="doc-sidebar">
                <div class="doc-sidebar-header">&#9674; ${this.escapeHtml(element.sidebarType)}</div>
                <div class="doc-sidebar-meta">
                    <strong>Source:</strong> ${this.escapeHtml(element.source)}<br>
                    <strong>Reliability:</strong> ${this.escapeHtml(element.reliability)}
                </div>
                <div class="doc-sidebar-content">"${this.escapeHtml(element.content)}"</div>
            </div>
        `;
    }

    /**
     * Render table
     */
    renderTable(element) {
        const rows = element.rows;
        if (!rows || rows.length === 0) return '';

        let html = '<table class="doc-table">';

        rows.forEach((row, rowIndex) => {
            html += '<tr>';
            row.forEach(cell => {
                if (rowIndex === 0) {
                    html += `<th>${this.escapeHtml(cell)}</th>`;
                } else {
                    html += `<td>${this.escapeHtml(cell)}</td>`;
                }
            });
            html += '</tr>';
        });

        html += '</table>';
        return html;
    }

    /**
     * Render end marker
     */
    renderEndMarker(element) {
        return `
            ${this.renderPageBreak()}
            ${this.renderOpener()}
            <div class="doc-end-marker">${this.escapeHtml(element.text)}</div>
            ${this.renderDivider()}
        `;
    }

    /**
     * Render end quote
     */
    renderEndQuote(element) {
        return `<div class="doc-end-quote">"${this.escapeHtml(element.text)}"</div>`;
    }

    /**
     * Convert book number to word
     */
    getBookWord(num) {
        const words = {
            '00': 'ZERO',
            '01': 'ONE',
            '02': 'TWO',
            '03': 'THREE',
            '04': 'FOUR',
            '05': 'FIVE',
            '06': 'SIX',
            '07': 'SEVEN',
            '08': 'EIGHT',
            '09': 'NINE'
        };
        return words[num] || num;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate full HTML document for export
     */
    generateFullHtml(elements, options = {}) {
        const content = this.render(elements);
        const bookTitle = options.bookTitle || 'The Bonded Path';
        const bookSubtitle = options.bookSubtitle || '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(bookTitle)}${bookSubtitle ? ' - ' + this.escapeHtml(bookSubtitle) : ''}</title>
    <style>
        ${this.getEmbeddedStyles()}
    </style>
</head>
<body>
    <div class="document">
        ${content}
    </div>
</body>
</html>`;
    }

    /**
     * Get embedded CSS for standalone HTML export
     */
    getEmbeddedStyles() {
        return `
/* Design System Colors */
:root {
    --deep-sea: #1a5f7a;
    --storm-gray: #4a5568;
    --warm-sand: #c9a227;
    --mist-white: #f8f9fa;
    --parchment: #faf8f5;
    --sidebar-bg: #e8f4f8;
    --sidebar-border: #1a5f7a;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: white;
}

.document {
    max-width: 8.5in;
    margin: 0 auto;
    padding: 1in;
    background: var(--parchment);
}

/* Decorative Elements */
.doc-opener {
    text-align: center;
    color: var(--warm-sand);
    font-size: 14pt;
    margin-bottom: 10pt;
}

.doc-divider {
    text-align: center;
    color: var(--warm-sand);
    font-size: 12pt;
    margin-top: 5pt;
    margin-bottom: 15pt;
    border-bottom: 1px solid var(--warm-sand);
    padding-bottom: 8pt;
}

/* Title Page */
.doc-book-number {
    text-align: center;
    font-size: 12pt;
    color: var(--storm-gray);
    font-variant: small-caps;
    letter-spacing: 0.1em;
    margin-bottom: 3pt;
}

.doc-book-title {
    text-align: center;
    font-size: 36pt;
    font-weight: bold;
    color: var(--deep-sea);
    margin-bottom: 2pt;
}

.doc-book-subtitle {
    text-align: center;
    font-size: 13pt;
    font-style: italic;
    color: var(--storm-gray);
    margin-bottom: 3pt;
}

/* Chapter Headers */
.doc-chapter-number {
    text-align: center;
    font-size: 12pt;
    color: var(--storm-gray);
    font-variant: small-caps;
    letter-spacing: 0.1em;
    margin-bottom: 3pt;
}

.doc-chapter-title {
    text-align: center;
    font-size: 20pt;
    font-weight: bold;
    color: var(--deep-sea);
    margin-bottom: 2pt;
}

.doc-chapter-subtitle {
    text-align: center;
    font-size: 13pt;
    font-style: italic;
    color: var(--storm-gray);
    margin-bottom: 3pt;
}

/* Headings */
.doc-h2 {
    font-size: 15pt;
    font-weight: bold;
    color: var(--deep-sea);
    margin-top: 18pt;
    margin-bottom: 9pt;
}

.doc-h3 {
    font-size: 12pt;
    font-weight: bold;
    color: var(--storm-gray);
    margin-top: 14pt;
    margin-bottom: 7pt;
}

.doc-h4 {
    font-size: 11pt;
    font-weight: bold;
    color: var(--storm-gray);
    margin-top: 10pt;
    margin-bottom: 5pt;
}

/* Paragraphs */
.doc-para {
    text-align: justify;
    margin-bottom: 12pt;
    line-height: 1.38;
}

/* Drop Cap */
.doc-drop-cap {
    float: left;
    font-size: 36pt;
    font-weight: bold;
    color: var(--deep-sea);
    line-height: 0.8;
    padding-right: 4pt;
    padding-top: 4pt;
}

.doc-para.has-drop-cap {
    overflow: hidden;
}

/* Labeled Paragraphs */
.doc-labeled-para {
    margin-bottom: 8pt;
}

.doc-label {
    font-weight: bold;
    color: var(--deep-sea);
}

/* Bullet Lists */
.doc-bullet-list {
    margin-bottom: 12pt;
    padding-left: 20pt;
}

.doc-bullet-item {
    margin-bottom: 5pt;
    list-style-type: disc;
}

/* Sidebars */
.doc-sidebar {
    background: var(--sidebar-bg);
    border-left: 6pt solid var(--sidebar-border);
    border-top: 1px solid var(--sidebar-border);
    border-right: 1px solid var(--sidebar-border);
    border-bottom: 1px solid var(--sidebar-border);
    padding: 12pt;
    margin: 10pt 0;
}

.doc-sidebar-header {
    font-size: 11pt;
    font-weight: bold;
    color: var(--deep-sea);
    margin-bottom: 6pt;
}

.doc-sidebar-meta {
    font-size: 10.5pt;
    margin-bottom: 8pt;
}

.doc-sidebar-content {
    font-size: 10.5pt;
    font-style: italic;
    line-height: 1.4;
}

/* Tables */
.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0;
    font-size: 10.5pt;
}

.doc-table th {
    background: var(--deep-sea);
    color: white;
    font-weight: bold;
    text-align: center;
    padding: 8pt;
}

.doc-table td {
    padding: 8pt;
    border: 1px solid #ccc;
    text-align: center;
}

.doc-table tr:nth-child(even) td {
    background: var(--mist-white);
}

/* End Page */
.doc-end-marker {
    text-align: center;
    font-size: 14pt;
    color: var(--storm-gray);
    font-variant: small-caps;
    letter-spacing: 0.1em;
    margin-top: 20pt;
}

.doc-end-quote {
    text-align: center;
    font-style: italic;
    color: var(--storm-gray);
    margin-top: 20pt;
    font-size: 12pt;
}

/* Page Breaks */
.doc-page-break {
    page-break-before: always;
    margin: 30pt 0;
    padding-top: 20pt;
}

/* Print Styles */
@media print {
    body {
        background: white;
    }

    .document {
        padding: 0;
        max-width: none;
    }

    .doc-page-break {
        border: none;
        margin: 0;
        padding: 0;
    }

    @page {
        size: letter;
        margin: 1in;
    }
}
`;
    }
}

// Export for use
window.BondedPathRenderer = BondedPathRenderer;
