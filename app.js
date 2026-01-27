// Global state
let booksData = null;
let currentBook = null;
let currentChapter = 1;
let currentData = null;
let availableVersions = [];
let versionFullNames = {};
let currentMobileVersionIndex = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    initTheme();
    await loadBooksData();
    
    // Check URL hash for direct link
    const hash = window.location.hash;
    if (hash) {
        const match = hash.match(/#([a-z0-9-]+)\/(\d+)/i);
        if (match) {
            const book = match[1];
            const chapter = parseInt(match[2]);
            await loadChapter(book, chapter);
            return;
        }
    }
    
    // Load Genesis 1 by default
    await loadChapter('geneza', 1);
});

// Theme functions
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Load books data
async function loadBooksData() {
    try {
        const response = await fetch('books.json');
        booksData = await response.json();
        renderBooksList();
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

// Render books list
function renderBooksList() {
    const vtContainer = document.getElementById('books-VT');
    const ntContainer = document.getElementById('books-NT');
    
    vtContainer.innerHTML = '';
    ntContainer.innerHTML = '';
    
    for (const [key, info] of Object.entries(booksData.books.VT)) {
        vtContainer.innerHTML += `<a href="#${key}/1" class="book-item" onclick="loadChapter('${key}', 1); return false;">${info.name}</a>`;
    }
    
    for (const [key, info] of Object.entries(booksData.books.NT)) {
        ntContainer.innerHTML += `<a href="#${key}/1" class="book-item" onclick="loadChapter('${key}', 1); return false;">${info.name}</a>`;
    }
}

// Show testament
function showTestament(testament, btn) {
    document.getElementById('books-VT').style.display = 'none';
    document.getElementById('books-NT').style.display = 'none';
    document.getElementById('books-' + testament).style.display = 'flex';
    
    document.querySelectorAll('.testament-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}

// Show book selection
function showBookSelection() {
    document.querySelector('.book-selection').style.display = 'block';
    document.getElementById('navBar').style.display = 'none';
    document.getElementById('readingArea').style.display = 'none';
}

// Load chapter
async function loadChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    
    // Update URL
    window.location.hash = `${book}/${chapter}`;
    
    // Find book info
    let bookInfo = null;
    let testament = null;
    
    if (booksData.books.VT[book]) {
        bookInfo = booksData.books.VT[book];
        testament = 'VT';
    } else if (booksData.books.NT[book]) {
        bookInfo = booksData.books.NT[book];
        testament = 'NT';
    }
    
    if (!bookInfo) {
        showNotification('Cartea nu a fost gasita');
        return;
    }
    
    // Load chapter data
    try {
        const response = await fetch(`data/${book}-${chapter}.json`);
        if (!response.ok) {
            showNotification('Capitolul nu este disponibil');
            return;
        }
        currentData = await response.json();
    } catch (error) {
        showNotification('Eroare la incarcarea capitolului');
        console.error(error);
        return;
    }
    
    // Get available versions
    availableVersions = [];
    versionFullNames = {};
    const versions = ['VDC', 'NTR', 'WEBUS'];
    
    for (const v of versions) {
        if (currentData.versions && currentData.versions[v]) {
            availableVersions.push(v);
            versionFullNames[v] = currentData.versions[v].name;
        }
    }
    
    // Update CSS variable for grid
    document.documentElement.style.setProperty('--visible-versions', availableVersions.length);
    
    // Hide book selection, show reading area
    document.querySelector('.book-selection').style.display = 'none';
    document.getElementById('navBar').style.display = 'block';
    document.getElementById('readingArea').style.display = 'block';
    
    // Update navigation
    updateNavigation(bookInfo);
    
    // Render verses
    renderVerses(bookInfo);
    
    // Update title
    document.title = `${bookInfo.name} ${chapter} - Biblia Online`;
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Update navigation selects
function updateNavigation(bookInfo) {
    const bookSelect = document.getElementById('bookSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    
    // Build book select
    bookSelect.innerHTML = '';
    
    const vtGroup = document.createElement('optgroup');
    vtGroup.label = 'Vechiul Testament';
    for (const [key, info] of Object.entries(booksData.books.VT)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = info.name;
        if (key === currentBook) opt.selected = true;
        vtGroup.appendChild(opt);
    }
    bookSelect.appendChild(vtGroup);
    
    const ntGroup = document.createElement('optgroup');
    ntGroup.label = 'Noul Testament';
    for (const [key, info] of Object.entries(booksData.books.NT)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = info.name;
        if (key === currentBook) opt.selected = true;
        ntGroup.appendChild(opt);
    }
    bookSelect.appendChild(ntGroup);
    
    // Build chapter select
    chapterSelect.innerHTML = '';
    for (let i = 1; i <= bookInfo.chapters; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Capitol ${i}`;
        if (i === currentChapter) opt.selected = true;
        chapterSelect.appendChild(opt);
    }
    
    // Update nav buttons
    document.getElementById('btnPrev').disabled = currentChapter <= 1;
    document.getElementById('btnNext').disabled = currentChapter >= bookInfo.chapters;
    document.getElementById('btnPrevMobile').disabled = currentChapter <= 1;
    document.getElementById('btnNextMobile').disabled = currentChapter >= bookInfo.chapters;
    
    // Update mobile indicator
    document.getElementById('mobileBookName').textContent = `${bookInfo.name} ${currentChapter}`;
    document.getElementById('mobileVersionName').textContent = availableVersions[0] || '';
}

// Render verses
function renderVerses(bookInfo) {
    // Get all verse numbers
    const allVerses = [];
    for (const v of availableVersions) {
        if (currentData.versions[v] && currentData.versions[v].verses) {
            for (const num of Object.keys(currentData.versions[v].verses)) {
                if (!allVerses.includes(parseInt(num))) {
                    allVerses.push(parseInt(num));
                }
            }
        }
    }
    allVerses.sort((a, b) => a - b);
    
    // Render desktop view
    renderDesktopView(allVerses);
    
    // Render mobile view
    renderMobileView(allVerses);
    
    // Setup mobile swipe
    setupMobileSwipe();
    
    // Update versions checkboxes
    renderVersionsCheckboxes();
}

// Render desktop view
function renderDesktopView(allVerses) {
    const header = document.getElementById('gridHeader');
    const container = document.getElementById('versesDesktop');
    
    // Build header
    header.innerHTML = '<div class="grid-header-cell">#</div>';
    for (const v of availableVersions) {
        header.innerHTML += `
            <div class="grid-header-cell" data-version="${v}">
                <span class="header-title">${versionFullNames[v]}</span>
            </div>
        `;
    }
    
    // Build verses
    container.innerHTML = '';
    for (const verseNum of allVerses) {
        let row = `
            <div class="verse-row" id="v${verseNum}">
                <div class="verse-num-container">
                    <span class="verse-num">${verseNum}</span>
                </div>
        `;
        
        for (const v of availableVersions) {
            const text = currentData.versions[v]?.verses?.[verseNum] || '';
            row += `
                <div class="verse-text" 
                     data-version="${v}" 
                     data-verse="${verseNum}"
                     onclick="showVersePopup(${verseNum}, event)">${escapeHtml(text)}</div>
            `;
        }
        
        row += '</div>';
        container.innerHTML += row;
    }
}

// Render mobile view
function renderMobileView(allVerses) {
    const numbersCol = document.getElementById('verseNumbersColumn');
    const track = document.getElementById('versionsTrack');
    
    // Verse numbers
    numbersCol.innerHTML = '';
    for (const verseNum of allVerses) {
        numbersCol.innerHTML += `
            <div class="verse-num-container-mobile" data-verse-row="${verseNum}">
                <span class="verse-num-mobile" data-verse="${verseNum}">${verseNum}</span>
            </div>
        `;
    }
    
    // Version columns
    track.innerHTML = '';
    for (const v of availableVersions) {
        let col = `<div class="version-column" data-version="${v}">`;
        
        for (const verseNum of allVerses) {
            const text = currentData.versions[v]?.verses?.[verseNum] || '';
            col += `
                <div class="verse-text-mobile" 
                     data-version="${v}" 
                     data-verse="${verseNum}"
                     data-verse-row="${verseNum}"
                     onclick="showVersePopup(${verseNum}, event)">${escapeHtml(text)}</div>
            `;
        }
        
        col += '</div>';
        track.innerHTML += col;
    }
    
    // Update track width
    track.style.width = `calc(${availableVersions.length} * 100%)`;
    
    // Sync verse heights after render
    requestAnimationFrame(() => syncMobileVerseHeights(allVerses));
}

// Synchronize verse heights for mobile view
function syncMobileVerseHeights(allVerses) {
    for (const verseNum of allVerses) {
        // Get all elements for this verse row
        const verseTexts = document.querySelectorAll(`.verse-text-mobile[data-verse-row="${verseNum}"]`);
        const verseNumContainer = document.querySelector(`.verse-num-container-mobile[data-verse-row="${verseNum}"]`);
        
        // Reset heights
        verseTexts.forEach(el => el.style.height = 'auto');
        if (verseNumContainer) verseNumContainer.style.height = 'auto';
        
        // Find max height
        let maxHeight = 0;
        verseTexts.forEach(el => {
            maxHeight = Math.max(maxHeight, el.offsetHeight);
        });
        
        // Apply max height to all
        verseTexts.forEach(el => el.style.height = maxHeight + 'px');
        if (verseNumContainer) verseNumContainer.style.height = maxHeight + 'px';
    }
}

// Setup mobile swipe
function setupMobileSwipe() {
    const scrollArea = document.getElementById('versionsScrollArea');
    const track = document.getElementById('versionsTrack');
    
    if (!scrollArea || !track) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    scrollArea.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        isDragging = true;
    }, { passive: true });
    
    scrollArea.addEventListener('touchmove', e => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
    }, { passive: true });
    
    scrollArea.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        
        const diff = startX - currentX;
        const threshold = 50;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentMobileVersionIndex < availableVersions.length - 1) {
                currentMobileVersionIndex++;
            } else if (diff < 0 && currentMobileVersionIndex > 0) {
                currentMobileVersionIndex--;
            }
        }
        
        updateMobileVersionPosition();
    });
    
    // Hide swipe hint after first swipe
    const swipeHint = document.getElementById('swipeHint');
    if (swipeHint && !localStorage.getItem('swipeHintShown')) {
        swipeHint.style.display = 'block';
        setTimeout(() => {
            swipeHint.style.opacity = '0';
            setTimeout(() => {
                swipeHint.style.display = 'none';
                localStorage.setItem('swipeHintShown', 'true');
            }, 300);
        }, 3000);
    } else if (swipeHint) {
        swipeHint.style.display = 'none';
    }
}

// Update mobile version position
function updateMobileVersionPosition() {
    const track = document.getElementById('versionsTrack');
    const percent = -currentMobileVersionIndex * (100 / availableVersions.length);
    track.style.transform = `translateX(${percent}%)`;
    
    // Update indicator
    document.getElementById('mobileVersionName').textContent = availableVersions[currentMobileVersionIndex] || '';
}

// Navigation handlers
function onBookChange() {
    const book = document.getElementById('bookSelect').value;
    loadChapter(book, 1);
}

function onChapterChange() {
    const chapter = parseInt(document.getElementById('chapterSelect').value);
    loadChapter(currentBook, chapter);
}

function changeChapter(delta) {
    let bookInfo = booksData.books.VT[currentBook] || booksData.books.NT[currentBook];
    if (!bookInfo) return;
    
    const newChapter = currentChapter + delta;
    if (newChapter >= 1 && newChapter <= bookInfo.chapters) {
        loadChapter(currentBook, newChapter);
    }
}

// Verse popup
let currentPopupVerse = null;

function showVersePopup(verseNum, event) {
    event.stopPropagation();
    currentPopupVerse = verseNum;
    
    const bookInfo = booksData.books.VT[currentBook] || booksData.books.NT[currentBook];
    document.getElementById('verseModalTitle').textContent = `${bookInfo.name} ${currentChapter}:${verseNum}`;
    
    document.getElementById('verseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeVerseModal(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('verseModal').classList.remove('active');
        document.body.style.overflow = '';
    }
}

function copyAllVersions() {
    closeVerseModal();
    
    const texts = [];
    const bookInfo = booksData.books.VT[currentBook] || booksData.books.NT[currentBook];
    
    for (const v of availableVersions) {
        const text = currentData.versions[v]?.verses?.[currentPopupVerse] || '';
        if (text) {
            texts.push(`${versionFullNames[v]}:\n${text}`);
        }
    }
    
    const fullText = `${bookInfo.name} ${currentChapter}:${currentPopupVerse}\n\n${texts.join('\n\n')}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        showNotification('Verset copiat!');
    }).catch(() => {
        showNotification('Eroare la copiere');
    });
}

function shareVerse() {
    closeVerseModal();
    
    const url = window.location.origin + window.location.pathname + `#${currentBook}/${currentChapter}`;
    
    if (navigator.share) {
        const bookInfo = booksData.books.VT[currentBook] || booksData.books.NT[currentBook];
        navigator.share({
            title: `${bookInfo.name} ${currentChapter}:${currentPopupVerse}`,
            url: url
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copiat!');
        });
    }
}

// Settings
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('open');
}

function changeFontSize(delta) {
    const current = parseFloat(getComputedStyle(document.body).getPropertyValue('--font-scale')) || 1;
    const newSize = Math.max(0.7, Math.min(1.5, current + delta));
    document.body.style.setProperty('--font-scale', newSize);
    document.getElementById('fontSizeIndicator').textContent = Math.round(newSize * 100) + '%';
    localStorage.setItem('fontSize', newSize);
}

function renderVersionsCheckboxes() {
    const container = document.getElementById('versionsCheckboxes');
    const savedVersions = JSON.parse(localStorage.getItem('activeVersions') || 'null');
    
    container.innerHTML = '';
    for (const v of availableVersions) {
        const checked = !savedVersions || savedVersions.includes(v) ? 'checked' : '';
        container.innerHTML += `
            <label class="version-checkbox">
                <input type="checkbox" value="${v}" ${checked} onchange="toggleVersion('${v}', this.checked)">
                <span>${v}</span>
            </label>
        `;
    }
}

function toggleVersion(version, visible) {
    const cells = document.querySelectorAll(`[data-version="${version}"]`);
    cells.forEach(cell => {
        cell.style.display = visible ? '' : 'none';
    });
    
    // Update saved versions
    const checkboxes = document.querySelectorAll('#versionsCheckboxes input:checked');
    const activeVersions = Array.from(checkboxes).map(cb => cb.value);
    localStorage.setItem('activeVersions', JSON.stringify(activeVersions));
    
    // Update CSS variable
    document.documentElement.style.setProperty('--visible-versions', activeVersions.length);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.className = 'notification';
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// Handle hash changes (browser back/forward)
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash) {
        const match = hash.match(/#([a-z0-9-]+)\/(\d+)/i);
        if (match) {
            const book = match[1];
            const chapter = parseInt(match[2]);
            if (book !== currentBook || chapter !== currentChapter) {
                loadChapter(book, chapter);
            }
        }
    }
});

// Scroll to top function
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show/hide back to top button based on scroll position
window.addEventListener('scroll', () => {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.querySelector('.header-btn');
    if (settingsPanel && settingsPanel.classList.contains('open')) {
        if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsPanel.classList.remove('open');
        }
    }
});

// Initialize font size from localStorage
(function() {
    const fontSize = localStorage.getItem('fontSize');
    if (fontSize) {
        document.body.style.setProperty('--font-scale', fontSize);
        const indicator = document.getElementById('fontSizeIndicator');
        if (indicator) {
            indicator.textContent = Math.round(parseFloat(fontSize) * 100) + '%';
        }
    }
})();
