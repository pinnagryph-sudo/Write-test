/**
 * The Bonded Path - Document Formatter App
 * Main application controller
 */

(function() {
    'use strict';

    // App State
    const state = {
        file: null,
        fileContent: null,
        fileType: null,
        parsedElements: null,
        zoomLevel: 100,
        currentView: 'preview'
    };

    // DOM Elements
    const els = {
        uploadZone: document.getElementById('uploadZone'),
        fileInput: document.getElementById('fileInput'),
        fileName: document.getElementById('fileName'),
        bookNumber: document.getElementById('bookNumber'),
        bookTitle: document.getElementById('bookTitle'),
        bookSubtitle: document.getElementById('bookSubtitle'),
        formatBtn: document.getElementById('formatBtn'),
        printBtn: document.getElementById('printBtn'),
        downloadHtmlBtn: document.getElementById('downloadHtmlBtn'),
        statsSection: document.getElementById('statsSection'),
        statChapters: document.getElementById('statChapters'),
        statSections: document.getElementById('statSections'),
        statSidebars: document.getElementById('statSidebars'),
        statTables: document.getElementById('statTables'),
        statWords: document.getElementById('statWords'),
        zoomIn: document.getElementById('zoomIn'),
        zoomOut: document.getElementById('zoomOut'),
        zoomLevel: document.getElementById('zoomLevel'),
        previewWrapper: document.getElementById('previewWrapper'),
        previewPlaceholder: document.getElementById('previewPlaceholder'),
        documentPreview: document.getElementById('documentPreview'),
        sourceWrapper: document.getElementById('sourceWrapper'),
        sourceContent: document.getElementById('sourceContent'),
        viewBtns: document.querySelectorAll('.view-btn'),
        printContainer: document.getElementById('printContainer')
    };

    // Parser and Renderer instances
    let parser = null;
    let renderer = null;

    /**
     * Initialize the application
     */
    function init() {
        // Initialize parser and renderer
        parser = new BondedPathParser(getBookSettings());
        renderer = new BondedPathRenderer();

        // Set up event listeners
        setupUploadZone();
        setupControls();
        setupViewToggle();
        setupZoomControls();

        // Update parser when settings change
        els.bookNumber.addEventListener('change', updateBookSettings);
        els.bookTitle.addEventListener('input', updateBookSettings);
        els.bookSubtitle.addEventListener('input', updateBookSettings);

        // Preset titles based on book number
        els.bookNumber.addEventListener('change', presetBookInfo);
    }

    /**
     * Set up upload zone
     */
    function setupUploadZone() {
        // Click to upload
        els.uploadZone.addEventListener('click', () => {
            els.fileInput.click();
        });

        // File input change
        els.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // Drag and drop
        els.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            els.uploadZone.classList.add('drag-over');
        });

        els.uploadZone.addEventListener('dragleave', () => {
            els.uploadZone.classList.remove('drag-over');
        });

        els.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            els.uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    /**
     * Handle uploaded file
     */
    async function handleFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext !== 'md' && ext !== 'docx') {
            alert('Please upload a .md or .docx file');
            return;
        }

        state.file = file;
        state.fileType = ext;
        els.fileName.textContent = file.name;

        // Enable format button
        els.formatBtn.disabled = false;

        // Read file content
        if (ext === 'md') {
            state.fileContent = await readTextFile(file);
            els.sourceContent.textContent = state.fileContent;
        } else if (ext === 'docx') {
            state.fileContent = await readDocxFile(file);
            els.sourceContent.textContent = '[DOCX file - source view shows converted HTML]\n\n' + state.fileContent;
        }

        // Auto-format on upload
        formatDocument();
    }

    /**
     * Read text file
     */
    function readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Read DOCX file using mammoth
     */
    function readDocxFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = await mammoth.convertToHtml({ arrayBuffer: e.target.result });
                    resolve(result.value);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Set up control buttons
     */
    function setupControls() {
        els.formatBtn.addEventListener('click', formatDocument);
        els.printBtn.addEventListener('click', printDocument);
        els.downloadHtmlBtn.addEventListener('click', downloadHtml);
    }

    /**
     * Format the document
     */
    function formatDocument() {
        if (!state.fileContent) return;

        // Update parser with current settings
        parser = new BondedPathParser(getBookSettings());

        // Parse based on file type
        let result;
        if (state.fileType === 'md') {
            result = parser.parseMarkdown(state.fileContent);
        } else {
            result = parser.parseDocxHtml(state.fileContent);
        }

        state.parsedElements = result.elements;

        // Update stats
        updateStats(result.stats);

        // Render to preview
        const html = renderer.render(result.elements);
        els.documentPreview.innerHTML = html;

        // Show preview
        els.previewPlaceholder.hidden = true;
        els.documentPreview.hidden = false;

        // Enable export buttons
        els.printBtn.disabled = false;
        els.downloadHtmlBtn.disabled = false;
    }

    /**
     * Update statistics display
     */
    function updateStats(stats) {
        els.statsSection.hidden = false;
        els.statChapters.textContent = stats.chapters;
        els.statSections.textContent = stats.sections;
        els.statSidebars.textContent = stats.sidebars;
        els.statTables.textContent = stats.tables;
        els.statWords.textContent = stats.words.toLocaleString();
    }

    /**
     * Get current book settings
     */
    function getBookSettings() {
        return {
            bookNumber: els.bookNumber.value,
            bookTitle: els.bookTitle.value,
            bookSubtitle: els.bookSubtitle.value
        };
    }

    /**
     * Update book settings
     */
    function updateBookSettings() {
        if (state.parsedElements) {
            formatDocument();
        }
    }

    /**
     * Preset book info based on book number
     */
    function presetBookInfo() {
        const presets = {
            '00': { title: 'Front Matter', subtitle: 'Title, Copyright, Dedication, Contents' },
            '01': { title: 'The Pinnagryph Companion', subtitle: 'Species Biology, Anatomy & Lifecycle' },
            '02': { title: 'The Breed Atlas', subtitle: 'Varieties, Patterns & Regional Lines' },
            '03': { title: 'The Soul Tie', subtitle: 'Bond Phenomena & Shared Life' },
            '04': { title: 'The Six Realms', subtitle: 'Cultures, Geography & Traditions' },
            '05': { title: 'Ceremonies', subtitle: 'Bonding Rituals & Customs' },
            '06': { title: "Rider's Guide", subtitle: 'Daily Care & Practical Guidance' },
            '07': { title: "Warden's Guide", subtitle: 'Professional Protocols' },
            '08': { title: 'The Living World', subtitle: 'Flora, Fauna & Ecology' },
            '09': { title: 'Afterword & Appendices', subtitle: 'Glossary, Index & References' }
        };

        const preset = presets[els.bookNumber.value];
        if (preset) {
            els.bookTitle.value = preset.title;
            els.bookSubtitle.value = preset.subtitle;
            updateBookSettings();
        }
    }

    /**
     * Set up view toggle
     */
    function setupViewToggle() {
        els.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;

                // Update button states
                els.viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Toggle views
                if (view === 'preview') {
                    els.previewWrapper.hidden = false;
                    els.sourceWrapper.hidden = true;
                } else {
                    els.previewWrapper.hidden = true;
                    els.sourceWrapper.hidden = false;
                }

                state.currentView = view;
            });
        });
    }

    /**
     * Set up zoom controls
     */
    function setupZoomControls() {
        els.zoomIn.addEventListener('click', () => {
            if (state.zoomLevel < 200) {
                state.zoomLevel += 10;
                updateZoom();
            }
        });

        els.zoomOut.addEventListener('click', () => {
            if (state.zoomLevel > 50) {
                state.zoomLevel -= 10;
                updateZoom();
            }
        });
    }

    /**
     * Update zoom level
     */
    function updateZoom() {
        els.zoomLevel.textContent = state.zoomLevel + '%';
        els.documentPreview.style.transform = `scale(${state.zoomLevel / 100})`;
    }

    /**
     * Print document
     */
    function printDocument() {
        if (!state.parsedElements) return;

        // Generate full HTML
        const fullHtml = renderer.generateFullHtml(state.parsedElements, getBookSettings());

        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(fullHtml);
        printWindow.document.close();

        // Wait for styles to load then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    /**
     * Download as HTML file
     */
    function downloadHtml() {
        if (!state.parsedElements) return;

        const settings = getBookSettings();
        const fullHtml = renderer.generateFullHtml(state.parsedElements, settings);

        // Create download link
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${settings.bookNumber}_${settings.bookTitle.replace(/[^a-z0-9]/gi, '_')}_STYLED.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
