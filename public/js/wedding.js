/**
 * Wedding Invitation Application Script
 * Majh & Aaron Wedding
 */

let weddingConfig = null;
let countdownTimer = null;
let currentGallery = [];
let currentLightboxIndex = 0;
let isAudioPlaying = false;
let audioPlayer = null;
let existingRsvpId = null;
let personalizedGuest = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadWeddingData();
    setupAudioPlayer();
    setupRsvpForm();
    setupLightbox();
    initStoryCarousel();
    createFloatingPetals();
});

// 1. Load Wedding Public Data
async function loadWeddingData() {
    try {
        const res = await fetch('/api/public/wedding-info');
        if (!res.ok) throw new Error('Failed to load wedding settings');
        weddingConfig = await res.json();

        applyThemeAndConfig(weddingConfig);
        startCountdown(weddingConfig.weddingDate);
        checkPersonalizedInvite();

        // Load parallel sections
        loadTimeline();
        loadEntourage();
        loadGallery();
        loadFaqs();
        loadGiftInfo();
    } catch (err) {
        console.error('Error loading wedding information:', err);
    }
}

// Apply Centralized Configuration to DOM
function applyThemeAndConfig(cfg) {
    // 1. Dynamic CSS Variables
    if (cfg.primaryColor) document.documentElement.style.setProperty('--primary-color', cfg.primaryColor);
    if (cfg.secondaryColor) document.documentElement.style.setProperty('--secondary-color', cfg.secondaryColor);
    if (cfg.accentColor) document.documentElement.style.setProperty('--accent-color', cfg.accentColor);

    // 2. Couple Names & SEO Title
    const coupleText = `${cfg.brideName} & ${cfg.groomName}`;
    document.title = `${coupleText} — Our Wedding`;
    setText('meta-title', document.title);
    setText('hero-couple-names', coupleText);
    setText('footer-couple-names', coupleText);
    setText('hero-venue-summary', `${cfg.ceremonyVenue} • ${formatDateOnly(cfg.weddingDate)}`);
    setText('hero-date-display', formatDateOnly(cfg.weddingDate));

    // 3. Story
    setText('story-how-we-met', cfg.storyHowWeMet);
    setText('story-our-journey', cfg.storyOurJourney);
    setText('story-the-proposal', cfg.storyTheProposal);

    if (cfg.storyPhoto1) {
        const p1 = document.getElementById('story-photo-1');
        if (p1) p1.src = cfg.storyPhoto1;
    }
    if (cfg.storyPhoto2) {
        const p2 = document.getElementById('story-photo-2');
        if (p2) p2.src = cfg.storyPhoto2;
    }
    if (cfg.storyPhoto3) {
        const p3 = document.getElementById('story-photo-3');
        if (p3) p3.src = cfg.storyPhoto3;
    }

    // 4. Details
    setText('ceremony-date', formatDateOnly(cfg.weddingDate));
    setText('ceremony-time', cfg.ceremonyTime);
    setText('ceremony-venue', cfg.ceremonyVenue);
    setText('ceremony-address', cfg.ceremonyAddress);

    setText('reception-date', formatDateOnly(cfg.weddingDate));
    setText('reception-time', cfg.receptionTime);
    setText('reception-venue', cfg.receptionVenue);
    setText('reception-address', cfg.receptionAddress);

    const ceremonyMapLink = document.getElementById('btn-ceremony-map') || document.getElementById('btn-view-map');
    if (ceremonyMapLink && cfg.googleMapsUrl) {
        ceremonyMapLink.href = cfg.googleMapsUrl;
    }

    const receptionMapLink = document.getElementById('btn-reception-map');
    if (receptionMapLink && cfg.receptionGoogleMapsUrl) {
        receptionMapLink.href = cfg.receptionGoogleMapsUrl;
    }

    // 5. Dress Code & Palette
    setText('dress-code-text', cfg.dressCode);
    const swPrimary = document.getElementById('palette-primary');
    const swSecondary = document.getElementById('palette-secondary');
    const swAccent = document.getElementById('palette-accent');
    if (swPrimary) { swPrimary.style.backgroundColor = cfg.primaryColor; setText('hex-primary', cfg.primaryColor); }
    if (swSecondary) { swSecondary.style.backgroundColor = cfg.secondaryColor; setText('hex-secondary', cfg.secondaryColor); }
    if (swAccent) { swAccent.style.backgroundColor = cfg.accentColor; setText('hex-accent', cfg.accentColor); }

    // 6. Hashtag
    setText('wedding-hashtag-display', cfg.weddingHashtag);

    // 7. Max Guest restriction in form
    const numInput = document.getElementById('rsvp-guest-count');
    if (numInput && !personalizedGuest) {
        numInput.max = cfg.maxGuestsPerRsvp || 4;
    }

    // 8. Background Music Configuration
    if (cfg.backgroundMusic) {
        if (!audioPlayer) audioPlayer = document.getElementById('wedding-audio');
        if (audioPlayer && !isAudioPlaying && audioPlayer.getAttribute('src') !== cfg.backgroundMusic) {
            audioPlayer.src = cfg.backgroundMusic;
        }
    }
}

// 2. Real-time Countdown Timer
function startCountdown(weddingDateStr) {
    if (countdownTimer) clearInterval(countdownTimer);

    const target = new Date(weddingDateStr).getTime();
    const update = () => {
        const now = new Date().getTime();
        const diff = target - now;

        const countdownElem = document.getElementById('countdown-wrapper');
        const passedElem = document.getElementById('wedding-passed-msg');

        if (diff <= 0) {
            if (countdownElem) countdownElem.style.display = 'none';
            if (passedElem) {
                passedElem.style.display = 'block';
                passedElem.textContent = 'Today was the beginning of our forever.';
            }
            if (countdownTimer) clearInterval(countdownTimer);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setText('count-days', padZero(days));
        setText('count-hours', padZero(hours));
        setText('count-minutes', padZero(minutes));
        setText('count-seconds', padZero(seconds));
    };

    update();
    countdownTimer = setInterval(update, 1000);
}

// ========================================================
// 2b. Our Love Story Carousel & Swipeable 3s Auto-Advance
// ========================================================
let storyCurrentIndex = 0;
let storyAutoPlayTimer = null;
const STORY_AUTOPLAY_INTERVAL = 3000; // 3 seconds automatic advance

function initStoryCarousel() {
    const viewport = document.getElementById('story-viewport');
    const track = document.getElementById('story-track');
    const prevBtn = document.getElementById('story-prev-btn');
    const nextBtn = document.getElementById('story-next-btn');
    const tabs = document.querySelectorAll('.story-tab-btn');

    if (!viewport || !track) return;

    const totalSlides = 3;

    function updateStoryUI() {
        track.style.transform = `translateX(-${storyCurrentIndex * 100}%)`;
        tabs.forEach((tab, idx) => {
            if (idx === storyCurrentIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    function goToStorySlide(index) {
        storyCurrentIndex = (index + totalSlides) % totalSlides;
        updateStoryUI();
        resetStoryAutoPlay();
    }

    function nextStorySlide() {
        storyCurrentIndex = (storyCurrentIndex + 1) % totalSlides;
        updateStoryUI();
    }

    function prevStorySlide() {
        storyCurrentIndex = (storyCurrentIndex - 1 + totalSlides) % totalSlides;
        updateStoryUI();
    }

    function startStoryAutoPlay() {
        stopStoryAutoPlay();
        storyAutoPlayTimer = setInterval(() => {
            nextStorySlide();
        }, STORY_AUTOPLAY_INTERVAL);
    }

    function stopStoryAutoPlay() {
        if (storyAutoPlayTimer) {
            clearInterval(storyAutoPlayTimer);
            storyAutoPlayTimer = null;
        }
    }

    function resetStoryAutoPlay() {
        stopStoryAutoPlay();
        startStoryAutoPlay();
    }

    // Button controls
    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            prevStorySlide();
            resetStoryAutoPlay();
        };
    }
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            nextStorySlide();
            resetStoryAutoPlay();
        };
    }

    // Tab buttons
    tabs.forEach((tab) => {
        tab.onclick = () => {
            const idx = parseInt(tab.dataset.index, 10);
            if (!isNaN(idx)) goToStorySlide(idx);
        };
    });

    // Pause on hover
    viewport.addEventListener('mouseenter', stopStoryAutoPlay);
    viewport.addEventListener('mouseleave', startStoryAutoPlay);

    // Tab visibility handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopStoryAutoPlay();
        } else {
            startStoryAutoPlay();
        }
    });

    // --- TOUCH SWIPE (MOBILE & TABLET) ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isTouching = false;

    viewport.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
        isTouching = true;
        stopStoryAutoPlay();
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (!isTouching || !e.touches || e.touches.length === 0) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
        if (!isTouching) return;
        isTouching = false;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);

        if (absDiffX > 35 && absDiffX > absDiffY) {
            if (diffX < 0) {
                nextStorySlide();
            } else {
                prevStorySlide();
            }
        }
        resetStoryAutoPlay();
    });

    // --- MOUSE DRAG / SWIPE (DESKTOP) ---
    let mouseStartX = 0;
    let mouseEndX = 0;
    let isMouseDown = false;

    viewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseEndX = e.clientX;
        stopStoryAutoPlay();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        mouseEndX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
        if (!isMouseDown) return;
        isMouseDown = false;
        const diffX = mouseEndX - mouseStartX;
        if (Math.abs(diffX) > 40) {
            if (diffX < 0) {
                nextStorySlide();
            } else {
                prevStorySlide();
            }
        }
        resetStoryAutoPlay();
    });

    // Start 3-second auto-play!
    startStoryAutoPlay();
}

// 3. Personalized Invitation Verification
async function checkPersonalizedInvite() {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code') || params.get('invite');

    // Check pathname if format is /rsvp/WED-XXXX
    if (!code && window.location.pathname.startsWith('/rsvp/')) {
        code = window.location.pathname.split('/rsvp/')[1];
    }

    if (!code) return;

    try {
        const res = await fetch(`/api/public/guest/${encodeURIComponent(code)}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.success && data.guest) {
            personalizedGuest = data.guest;
            showPersonalizedBanner(personalizedGuest);
            prefillRsvpForm(personalizedGuest);
        }
    } catch (e) {
        console.warn('Personalized code lookup failed:', e);
    }
}

function showPersonalizedBanner(guest) {
    const banner = document.getElementById('personalized-greeting-card');
    if (!banner) return;

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="capiz-card calado-frame p-6 mb-8 text-center shadow-sm">
        <p class="font-serif text-xl sm:text-2xl text-wedding-primary font-bold">Welcome, ${escapeHtml(guest.fullName)}!</p>
        <p class="text-stone-700 mt-1">You are warmly invited to celebrate the marriage of <strong>${escapeHtml(weddingConfig?.brideName || 'Majh')} & ${escapeHtml(weddingConfig?.groomName || 'Aaron')}</strong>.</p>
        <p class="text-xs text-wedding-secondary mt-2 uppercase tracking-widest font-semibold">Reserved Seats: ${guest.allowedGuests} • Invitation Code: ${escapeHtml(guest.invitationCode)}</p>
      </div>
    `;
}

function prefillRsvpForm(guest) {
    if (!guest) return;
    personalizedGuest = guest;

    const nameInput = document.getElementById('rsvp-fullname');
    const emailInput = document.getElementById('rsvp-email');
    const mobileInput = document.getElementById('rsvp-mobile');
    const codeInput = document.getElementById('rsvp-invite-code');
    const countInput = document.getElementById('rsvp-guest-count');
    const indicator = document.getElementById('allocated-seats-indicator');
    const hint = document.getElementById('rsvp-guest-count-hint');
    const banner = document.getElementById('rsvp-guest-identified-banner');
    const codeStatus = document.getElementById('invite-code-status');

    if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
        nameInput.value = guest.fullName || '';
    }
    if (emailInput && (!emailInput.value || guest.email)) {
        emailInput.value = guest.email || emailInput.value;
    }
    if (mobileInput && (!mobileInput.value || guest.mobileNumber)) {
        mobileInput.value = guest.mobileNumber || mobileInput.value;
    }
    if (codeInput && guest.invitationCode) {
        codeInput.value = guest.invitationCode;
    }

    const allocatedSeats = parseInt(guest.allowedGuests, 10) || 1;

    // Automatically set the number of attending guests to the allocated seats
    if (countInput) {
        countInput.max = allocatedSeats;
        countInput.value = allocatedSeats;
        updateCompanionFields(allocatedSeats);
    }

    if (indicator) {
        indicator.textContent = `${allocatedSeats} Seat${allocatedSeats > 1 ? 's' : ''} Allocated`;
        indicator.classList.remove('hidden');
    }

    if (hint) {
        hint.innerHTML = `You have <strong class="text-wedding-primary">${allocatedSeats}</strong> allocated seat${allocatedSeats > 1 ? 's' : ''} reserved for you. ${allocatedSeats > 1 ? 'Please register your companion(s) below.' : 'Includes yourself.'}`;
        hint.classList.remove('text-stone-400');
        hint.classList.add('text-stone-600');
    }

    if (codeStatus) {
        codeStatus.innerHTML = `<span class="text-green-700 font-semibold"><i class="fas fa-check-circle"></i> Verified (${allocatedSeats} seat${allocatedSeats > 1 ? 's' : ''})</span>`;
    }

    if (banner) {
        banner.classList.remove('hidden');
        banner.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-wedding-secondary/20 text-wedding-primary flex items-center justify-center font-bold text-base shrink-0 border border-wedding-secondary/40">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-stone-900">${escapeHtml(guest.fullName)}</p>
              <p class="text-xs text-stone-600">Reserved Seats: <strong class="text-wedding-primary text-sm">${allocatedSeats}</strong> • Code: <strong class="font-mono text-stone-800">${escapeHtml(guest.invitationCode || 'N/A')}</strong></p>
            </div>
          </div>
        `;
    }
}

async function lookupInvitationCode() {
    const codeInput = document.getElementById('rsvp-invite-code');
    const codeStatus = document.getElementById('invite-code-status');
    const code = codeInput?.value.trim();

    if (!code) {
        if (codeStatus) codeStatus.innerHTML = '<span class="text-amber-700 font-medium">Please enter a code</span>';
        return;
    }

    if (codeStatus) codeStatus.innerHTML = '<span class="text-stone-500 text-xs"><i class="fas fa-spinner fa-spin"></i> Checking...</span>';

    try {
        const res = await fetch(`/api/public/guest/${encodeURIComponent(code)}`);
        const data = await res.json();

        if (res.ok && data.success && data.guest) {
            personalizedGuest = data.guest;
            prefillRsvpForm(personalizedGuest);
            showPersonalizedBanner(personalizedGuest);
            showToast(`Found reservation for ${data.guest.fullName} (${data.guest.allowedGuests} seats)`);
        } else {
            if (codeStatus) codeStatus.innerHTML = '<span class="text-red-600 font-medium text-xs"><i class="fas fa-times-circle"></i> Code not found</span>';
        }
    } catch (e) {
        console.error('Failed to lookup invitation code:', e);
        if (codeStatus) codeStatus.innerHTML = '<span class="text-red-600 font-medium text-xs">Error checking code</span>';
    }
}

// 4. Open Invitation Animation & Music Start
function openInvitation() {
    const envelope = document.getElementById('invitation-envelope');
    const mainContent = document.getElementById('main-wedding-content');

    if (envelope) {
        envelope.style.opacity = '0';
        envelope.style.transform = 'translateY(-30px) scale(0.96)';
        setTimeout(() => {
            envelope.style.display = 'none';
        }, 500);
    }

    if (mainContent) {
        mainContent.classList.remove('hidden');
        mainContent.classList.add('opened-invitation');
        mainContent.scrollIntoView({ behavior: 'smooth' });
    }

    // Play music softly upon opening invitation
    if (!isAudioPlaying) {
        toggleMusic();
    }
}

// 5. Load Timeline (Compact Horizontal Layout - No Scrolling Required)
async function loadTimeline() {
    try {
        const res = await fetch('/api/public/timeline');
        if (!res.ok) return;
        const items = await res.json();

        const container = document.getElementById('timeline-container');
        if (!container) return;

        // Desktop / Tablet (>= 768px): All items in 1 single horizontal row across the card
        const desktopLineLeft = (100 / (items.length * 2)).toFixed(2);
        const desktopLineRight = (100 / (items.length * 2)).toFixed(2);

        // Mobile (< 768px): 2 compact horizontal rows (Row 1: 4 items, Row 2: 3 items) - 100% visible on screen without scrolling
        const row1Items = items.slice(0, 4);
        const row2Items = items.slice(4);
        const row1LinePct = (100 / (row1Items.length * 2)).toFixed(2);
        const row2LinePct = (100 / (row2Items.length * 2)).toFixed(2);

        const timelineHtml = `
          <div class="timeline-compact-wrapper w-full select-none">
            <!-- ================= DESKTOP & TABLET (SINGLE HORIZONTAL ROW - NO SCROLL) ================= -->
            <div class="hidden md:block w-full relative pt-2 pb-2">
              <!-- Continuous Horizontal Golden Line -->
              <div class="absolute h-0.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 z-0" 
                   style="top: 48px; left: ${desktopLineLeft}%; right: ${desktopLineRight}%;"></div>

              <!-- 7 Items in 1 Single Horizontal Row (Fits 100% Card Width) -->
              <div class="grid grid-cols-${items.length} gap-1 lg:gap-2 relative z-10 w-full items-start">
                ${items.map(item => `
                  <div class="flex flex-col items-center text-center group px-1">
                    <!-- Compact Time Badge -->
                    <span class="inline-block font-cinzel text-[10px] lg:text-[11px] font-bold text-wedding-primary tracking-wider uppercase bg-amber-50/95 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs mb-2 z-10 whitespace-nowrap">
                      ${escapeHtml(item.time)}
                    </span>

                    <!-- Refined Circular Icon Dot (36px) -->
                    <div class="w-9 h-9 rounded-full bg-[#FFFDF9] border border-wedding-secondary text-wedding-secondary flex items-center justify-center text-xs shadow-xs z-10 mb-2 transition-all duration-300 group-hover:scale-115 group-hover:bg-wedding-secondary group-hover:text-white">
                      <i class="fas fa-${getTimelineIcon(item.icon)}"></i>
                    </div>

                    <!-- Title -->
                    <h4 class="font-cinzel text-xs lg:text-[13px] font-bold text-stone-900 tracking-wide leading-tight mb-1">
                      ${escapeHtml(item.title)}
                    </h4>

                    <!-- Description -->
                    ${item.description ? `
                      <p class="font-serif italic text-stone-600 text-[10px] lg:text-[11px] leading-tight max-w-[130px] line-clamp-2">
                        ${escapeHtml(item.description)}
                      </p>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- ================= MOBILE (< 768px: 2 COMPACT HORIZONTAL ROWS - NO SCROLL) ================= -->
            <div class="block md:hidden w-full space-y-6 pt-1 pb-2">
              <!-- Row 1: Afternoon Milestones (4 items) -->
              <div class="relative w-full">
                <div class="absolute h-0.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 z-0" 
                     style="top: 40px; left: ${row1LinePct}%; right: ${row1LinePct}%;"></div>

                <div class="grid grid-cols-4 gap-1 relative z-10 w-full items-start">
                  ${row1Items.map(item => `
                    <div class="flex flex-col items-center text-center group px-0.5">
                      <span class="inline-block font-cinzel text-[9px] font-bold text-wedding-primary uppercase bg-amber-50/95 border border-amber-200/80 px-1.5 py-0.5 rounded-full shadow-2xs mb-1.5 z-10 whitespace-nowrap">
                        ${escapeHtml(item.time)}
                      </span>
                      <div class="w-7 h-7 rounded-full bg-[#FFFDF9] border border-wedding-secondary text-wedding-secondary flex items-center justify-center text-[10px] shadow-xs z-10 mb-1.5">
                        <i class="fas fa-${getTimelineIcon(item.icon)}"></i>
                      </div>
                      <h4 class="font-cinzel text-[10px] font-bold text-stone-900 tracking-wide leading-tight mb-0.5">
                        ${escapeHtml(item.title)}
                      </h4>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Row 2: Evening Celebrations (3 items) -->
              <div class="relative w-full max-w-[320px] mx-auto">
                <div class="absolute h-0.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 z-0" 
                     style="top: 40px; left: ${row2LinePct}%; right: ${row2LinePct}%;"></div>

                <div class="grid grid-cols-3 gap-1 relative z-10 w-full items-start">
                  ${row2Items.map(item => `
                    <div class="flex flex-col items-center text-center group px-1">
                      <span class="inline-block font-cinzel text-[9px] font-bold text-wedding-primary uppercase bg-amber-50/95 border border-amber-200/80 px-1.5 py-0.5 rounded-full shadow-2xs mb-1.5 z-10 whitespace-nowrap">
                        ${escapeHtml(item.time)}
                      </span>
                      <div class="w-7 h-7 rounded-full bg-[#FFFDF9] border border-wedding-secondary text-wedding-secondary flex items-center justify-center text-[10px] shadow-xs z-10 mb-1.5">
                        <i class="fas fa-${getTimelineIcon(item.icon)}"></i>
                      </div>
                      <h4 class="font-cinzel text-[10px] font-bold text-stone-900 tracking-wide leading-tight mb-0.5">
                        ${escapeHtml(item.title)}
                      </h4>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;

        const bottomFlourish = `
          <div class="text-center mt-6 pt-4 border-t border-amber-200/50">
            <p class="font-script text-2xl sm:text-3xl text-wedding-secondary mb-1">Thank you for being here!</p>
            <div class="flex items-center justify-center gap-2 text-wedding-secondary text-xs">
              <span class="text-stone-400">—— ❧</span>
              <span class="font-cinzel text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-stone-700">We Love You!</span>
              <span class="text-stone-400">☙ ——</span>
            </div>
          </div>
        `;

        container.innerHTML = timelineHtml + bottomFlourish;
    } catch (e) {
        console.error('Failed to load timeline:', e);
    }
}

// 6. Load Entourage (Single-Container Symmetrical Program Layout)
async function loadEntourage() {
    try {
        const res = await fetch('/api/public/entourage');
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('entourage-container');
        if (!container) return;

        const items = data.all || [];
        if (!items || items.length === 0) {
            container.innerHTML = '<p class="text-center text-stone-500 py-8 italic font-serif">Entourage details will be announced soon.</p>';
            return;
        }

        renderSymmetricalEntourage(items, container);
    } catch (e) {
        console.error('Failed to load entourage:', e);
    }
}

function renderSymmetricalEntourage(items, container) {
    const claimedIds = new Set();

    // 1. Extract Groom & Bride Parents
    let groomParents = items.filter(i => {
        const catRole = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return catRole.includes('groom') && (catRole.includes('parent') || catRole.includes('magulang') || catRole.includes('ama') || catRole.includes('ina'));
    });
    let brideParents = items.filter(i => {
        const catRole = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return catRole.includes('bride') && (catRole.includes('parent') || catRole.includes('magulang') || catRole.includes('ama') || catRole.includes('ina'));
    });
    
    // Fallback if named with Avendaño / Fernandez
    if (groomParents.length === 0) {
        groomParents = items.filter(i => /avendaño|avendano/i.test(i.name) && /parent/i.test(i.category || ''));
    }
    if (brideParents.length === 0) {
        brideParents = items.filter(i => /fernandez/i.test(i.name) && /parent/i.test(i.category || ''));
    }
    [...groomParents, ...brideParents].forEach(i => i.id && claimedIds.add(i.id));

    // 2. Extract Ninongs and Ninangs (Principal Sponsors)
    let ninongs = [];
    let ninangs = [];

    // Helpers to classify Filipino honorifics & names
    const isFemaleName = (str) => {
        const s = ' ' + (str || '').toLowerCase() + ' ';
        return /\b(mrs|dra|ms|miss|gng|madam|lady|sister|ninang|ina|nanay|tita)\b/i.test(s) ||
               /\b(teresa|patricia|cynthia|maria|ma\.|carmela|elena|sofia|kristine|alyssa|camille|claudine|bea|katrina|clarisse)\b/i.test(s);
    };

    const isMaleName = (str) => {
        const s = ' ' + (str || '').toLowerCase() + ' ';
        return /\b(mr|engr|atty|dr|g\.|sir|bro|fr|ninong|ama|tatay|tito)\b/i.test(s) ||
               /\b(fernando|benjamin|carlos|roberto|antonio|gabriel|marco|daniel|christian|joshua|paolo|miguel|ethan|lucas|mateo)\b/i.test(s);
    };

    const sponsorCandidates = items.filter(i => {
        if (claimedIds.has(i.id)) return false;
        const cat = (i.category || '').toLowerCase();
        const role = (i.role || '').toLowerCase();
        const cr = `${cat} ${role}`;

        if (cr.includes('secondary') || cr.includes('candle') || cr.includes('veil') || cr.includes('cord') ||
            cr.includes('bearer') || cr.includes('flower') || cr.includes('best man') || cr.includes('maid of honor') ||
            cr.includes('matron of honor') || cr.includes('bridesmaid') || cr.includes('groomsman') || cr.includes('parent')) {
            return false;
        }
        return cr.includes('sponsor') || cr.includes('ninong') || cr.includes('ninang') || cr.includes('principal') || cr.includes('godparent');
    });

    sponsorCandidates.forEach(i => {
        if (i.id) claimedIds.add(i.id);
        const rawName = (i.name || '').trim();
        const role = (i.role || '').toLowerCase();
        const cat = (i.category || '').toLowerCase();

        // A. Paired couple in a single row (e.g. 'Atty. Fernando Gomez & Hon. Teresa Gomez')
        const pairSplit = rawName.split(/\s*(?:&|\band\b|\bat\b|[/+])\s*/i).filter(Boolean);
        if (pairSplit.length >= 2) {
            let leftPerson = pairSplit[0].trim();
            let rightPerson = pairSplit[1].trim();

            // If left is female and right is male, swap so Ninong stays on left and Ninang on right
            if (isFemaleName(leftPerson) && !isFemaleName(rightPerson)) {
                ninongs.push({ name: rightPerson, role: 'Ninong' });
                ninangs.push({ name: leftPerson, role: 'Ninang' });
            } else {
                ninongs.push({ name: leftPerson, role: 'Ninong' });
                ninangs.push({ name: rightPerson, role: 'Ninang' });
            }
            return;
        }

        // B. Individual entry
        const roleHasNinang = role.includes('ninang') && !role.includes('ninong');
        const roleHasNinong = role.includes('ninong') && !role.includes('ninang');
        const catHasNinang = cat.includes('ninang') && !cat.includes('ninong');
        const catHasNinong = cat.includes('ninong') && !cat.includes('ninang');

        if (roleHasNinang || catHasNinang || isFemaleName(rawName)) {
            ninangs.push({ name: rawName, role: 'Ninang' });
        } else if (roleHasNinong || catHasNinong || isMaleName(rawName)) {
            ninongs.push({ name: rawName, role: 'Ninong' });
        } else {
            // Unspecified: balance equally between left and right columns
            if (ninongs.length <= ninangs.length) {
                ninongs.push({ name: rawName, role: 'Ninong' });
            } else {
                ninangs.push({ name: rawName, role: 'Ninang' });
            }
        }
    });

    // Safeguard: If somehow one side ended up empty and the other has multiple items, rebalance
    if (ninongs.length === 0 && ninangs.length > 1) {
        const half = Math.ceil(ninangs.length / 2);
        ninongs = ninangs.splice(0, half).map(x => ({ ...x, role: 'Ninong' }));
    } else if (ninangs.length === 0 && ninongs.length > 1) {
        const half = Math.ceil(ninongs.length / 2);
        ninangs = ninongs.splice(half).map(x => ({ ...x, role: 'Ninang' }));
    }

    // 3. Best Man & Maid of Honor
    const bestMan = items.filter(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return cr.includes('best man') || cr.includes('bestman');
    });
    const maidOfHonor = items.filter(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return cr.includes('maid of honor') || cr.includes('matron of honor') || cr.includes('maid-of-honor');
    });
    [...bestMan, ...maidOfHonor].forEach(i => i.id && claimedIds.add(i.id));

    // 4. Groomsmen & Bridesmaids
    const groomsmen = items.filter(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return cr.includes('groomsman') || cr.includes('groomsmen');
    });
    const bridesmaids = items.filter(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return cr.includes('bridesmaid');
    });
    [...groomsmen, ...bridesmaids].forEach(i => i.id && claimedIds.add(i.id));

    // 5. Secondary Sponsors (Candle, Veil, Cord)
    let candleLeft = null, candleRight = null;
    let veilLeft = null, veilRight = null;
    let cordLeft = null, cordRight = null;

    const secondaryItems = items.filter(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        return cr.includes('secondary') || cr.includes('candle') || cr.includes('veil') || cr.includes('cord');
    });
    secondaryItems.forEach(i => i.id && claimedIds.add(i.id));

    secondaryItems.forEach(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        const hasGroom = cr.includes('groom') || cr.includes('male');
        const hasBride = cr.includes('bride') || cr.includes('female');

        if (cr.includes('candle')) {
            if (hasGroom) candleLeft = { name: i.name, role: 'Candle Sponsor · To Light Our Path' };
            else if (hasBride) candleRight = { name: i.name, role: 'Candle Sponsor · To Light Our Path' };
            else if (i.name.includes('&') || /\band\b/i.test(i.name)) {
                const parts = i.name.split(/\s*&\s*|\s+and\s+/i);
                candleLeft = { name: parts[0].trim(), role: 'Candle Sponsor · To Light Our Path' };
                candleRight = { name: parts[1].trim(), role: 'Candle Sponsor · To Light Our Path' };
            } else if (!candleLeft) {
                candleLeft = { name: i.name, role: 'Candle Sponsor · To Light Our Path' };
            } else {
                candleRight = { name: i.name, role: 'Candle Sponsor · To Light Our Path' };
            }
        } else if (cr.includes('veil')) {
            if (hasGroom) veilLeft = { name: i.name, role: 'Veil Sponsor · To Clothe Us in Unity' };
            else if (hasBride) veilRight = { name: i.name, role: 'Veil Sponsor · To Clothe Us in Unity' };
            else if (i.name.includes('&') || /\band\b/i.test(i.name)) {
                const parts = i.name.split(/\s*&\s*|\s+and\s+/i);
                veilLeft = { name: parts[0].trim(), role: 'Veil Sponsor · To Clothe Us in Unity' };
                veilRight = { name: parts[1].trim(), role: 'Veil Sponsor · To Clothe Us in Unity' };
            } else if (!veilLeft) {
                veilLeft = { name: i.name, role: 'Veil Sponsor · To Clothe Us in Unity' };
            } else {
                veilRight = { name: i.name, role: 'Veil Sponsor · To Clothe Us in Unity' };
            }
        } else if (cr.includes('cord')) {
            if (hasGroom) cordLeft = { name: i.name, role: 'Cord Sponsor · To Bind Us in Love' };
            else if (hasBride) cordRight = { name: i.name, role: 'Cord Sponsor · To Bind Us in Love' };
            else if (i.name.includes('&') || /\band\b/i.test(i.name)) {
                const parts = i.name.split(/\s*&\s*|\s+and\s+/i);
                cordLeft = { name: parts[0].trim(), role: 'Cord Sponsor · To Bind Us in Love' };
                cordRight = { name: parts[1].trim(), role: 'Cord Sponsor · To Bind Us in Love' };
            } else if (!cordLeft) {
                cordLeft = { name: i.name, role: 'Cord Sponsor · To Bind Us in Love' };
            } else {
                cordRight = { name: i.name, role: 'Cord Sponsor · To Bind Us in Love' };
            }
        }
    });

    const secondaryLeft = [candleLeft, veilLeft, cordLeft].filter(Boolean);
    const secondaryRight = [candleRight, veilRight, cordRight].filter(Boolean);

    // 6. Bearers & Flower Girls
    let bearers = [];
    let flowerGirls = [];

    items.forEach(i => {
        const cr = `${i.category || ''} ${i.role || ''}`.toLowerCase();
        if (cr.includes('bearer') || cr.includes('ring') || cr.includes('coin') || cr.includes('arrhas') || cr.includes('bible')) {
            if (i.id) claimedIds.add(i.id);
            let subrole = 'Bearer';
            if (cr.includes('ring')) subrole = 'Ring Bearer';
            else if (cr.includes('coin') || cr.includes('arrhas')) subrole = 'Coin Bearer (Arrhas)';
            else if (cr.includes('bible')) subrole = 'Bible Bearer';
            bearers.push({ name: i.name, role: subrole });
        } else if (cr.includes('flower')) {
            if (i.id) claimedIds.add(i.id);
            if (i.name.includes('&') || /\band\b/i.test(i.name)) {
                const parts = i.name.split(/\s*&\s*|\s+and\s+/i);
                parts.forEach(p => flowerGirls.push({ name: p.trim(), role: 'Flower Girl' }));
            } else {
                flowerGirls.push({ name: i.name, role: 'Flower Girl' });
            }
        }
    });

    // 7. Other Unclaimed Items
    const otherItems = items.filter(i => !claimedIds.has(i.id));

    // Divider HTML
    const dividerHtml = `
      <div class="entourage-divider">
        <span class="entourage-divider-symbol">❦</span>
      </div>
    `;

    // Tier builder for 2 balanced columns with same-level alignment
    const buildAlignedTier = (sectionHeading, sectionSub, leftHeader, rightHeader, leftList, rightList) => {
        const maxLen = Math.max(leftList.length, rightList.length);
        if (maxLen === 0) return '';

        let headingBlock = '';
        if (sectionHeading) {
            headingBlock = `
              <div class="text-center mb-5 sm:mb-6">
                <h4 class="entourage-section-heading">${escapeHtml(sectionHeading)}</h4>
                ${sectionSub ? `<p class="text-xs text-stone-500 italic font-serif mt-0.5">${escapeHtml(sectionSub)}</p>` : ''}
              </div>
            `;
        }

        let rowsHtml = '';
        for (let idx = 0; idx < maxLen; idx++) {
            const left = leftList[idx];
            const right = rightList[idx];

            const renderCell = (item, defaultRole) => {
                if (!item) return '<div class="text-stone-300 text-sm select-none">—</div>';
                const name = typeof item === 'string' ? item : item.name;
                const role = typeof item === 'object' && item.role && item.role !== defaultRole ? item.role : '';
                return `
                  <div>
                    <div class="entourage-person-name">${escapeHtml(name)}</div>
                    ${role ? `<div class="entourage-person-subrole">${escapeHtml(role)}</div>` : ''}
                  </div>
                `;
            };

            rowsHtml += `
              <div class="grid grid-cols-2 gap-3 sm:gap-10 text-center items-center py-1">
                <div class="px-1 sm:px-3">${renderCell(left, leftHeader)}</div>
                <div class="px-1 sm:px-3">${renderCell(right, rightHeader)}</div>
              </div>
            `;
        }

        return `
          <div class="entourage-tier">
            ${headingBlock}
            <div class="grid grid-cols-2 gap-3 sm:gap-10 text-center mb-3">
              <div><span class="entourage-role-title">${escapeHtml(leftHeader)}</span></div>
              <div><span class="entourage-role-title">${escapeHtml(rightHeader)}</span></div>
            </div>
            <div class="space-y-2">
              ${rowsHtml}
            </div>
          </div>
        `;
    };

    // Build the complete entourage program
    const tiers = [];

    // Header banner inside container
    const programHeader = `
      <div class="text-center border-b border-amber-200/50 pb-5 mb-8">
        <span class="text-[11px] sm:text-xs uppercase tracking-[0.25em] font-bold text-wedding-secondary block mb-1">Kasalan nina Majh at Aaron</span>
        <h3 class="font-serif text-xl sm:text-2xl font-bold text-stone-800 tracking-wide">Sacred Matrimonial Entourage</h3>
        <div class="w-16 h-0.5 bg-gradient-to-r from-transparent via-wedding-secondary to-transparent mx-auto mt-2.5"></div>
      </div>
    `;

    // Tier 1: Parents (Groom on Left, Bride on Right)
    if (groomParents.length > 0 || brideParents.length > 0) {
        tiers.push(buildAlignedTier(
            '',
            '',
            'Parents of the Groom',
            'Parents of the Bride',
            groomParents,
            brideParents
        ));
    }

    // Tier 2: Principal Sponsors (Ninong on Left, Ninang on Right)
    if (ninongs.length > 0 || ninangs.length > 0) {
        tiers.push(buildAlignedTier(
            'Principal Sponsors',
            'Witnesses of Faith & Life · Mga Ninong at Ninang',
            'Ninong',
            'Ninang',
            ninongs,
            ninangs
        ));
    }

    // Tier 3: Primary Attendants (Best Man on Left, Maid of Honor on Right)
    if (bestMan.length > 0 || maidOfHonor.length > 0) {
        tiers.push(buildAlignedTier(
            '',
            '',
            'Best Man',
            'Maid of Honor',
            bestMan,
            maidOfHonor
        ));
    }

    // Tier 4: Groomsmen & Bridesmaids
    if (groomsmen.length > 0 || bridesmaids.length > 0) {
        tiers.push(buildAlignedTier(
            '',
            '',
            'Groomsmen',
            'Bridesmaids',
            groomsmen,
            bridesmaids
        ));
    }

    // Tier 5: Secondary Sponsors (Candle, Veil, Cord)
    if (secondaryLeft.length > 0 || secondaryRight.length > 0) {
        tiers.push(buildAlignedTier(
            'Secondary Sponsors',
            'Mga Pangalawang Tagapagtaguyod',
            'Gentlemen',
            'Ladies',
            secondaryLeft,
            secondaryRight
        ));
    }

    // Tier 6: Bearers & Flower Girls
    if (bearers.length > 0 || flowerGirls.length > 0) {
        tiers.push(buildAlignedTier(
            '',
            '',
            'Bearers',
            'Flower Girls',
            bearers,
            flowerGirls
        ));
    }

    // Tier 7: Other Unclaimed Entourage Items (if any)
    if (otherItems.length > 0) {
        const half = Math.ceil(otherItems.length / 2);
        const leftOther = otherItems.slice(0, half);
        const rightOther = otherItems.slice(half);
        tiers.push(buildAlignedTier(
            'Special Honored Attendants',
            '',
            'Honored Members',
            'Honored Members',
            leftOther,
            rightOther
        ));
    }

    // Assemble all tiers separated by decorative Filipino divider
    container.innerHTML = programHeader + tiers.join(dividerHtml);
}

// ========================================================
// 7. Load Gallery & Swipeable 3s Auto-Carousel
// ========================================================
let galleryCurrentIndex = 0;
let galleryAutoPlayTimer = null;
const GALLERY_AUTOPLAY_INTERVAL = 3000; // 3 seconds automatic swipe as requested

async function loadGallery() {
    try {
        const res = await fetch('/api/public/gallery');
        if (!res.ok) return;
        currentGallery = await res.json();
        if (!Array.isArray(currentGallery) || currentGallery.length === 0) return;

        const track = document.getElementById('gallery-track');
        const dotsContainer = document.getElementById('gallery-dots');
        const counter = document.getElementById('gallery-counter');
        if (!track) return;

        // Populate Slides
        track.innerHTML = currentGallery.map((img, idx) => `
          <div class="gallery-slide" data-index="${idx}">
            <img src="${escapeHtml(img.imageUrl)}" alt="${escapeHtml(img.caption || 'Wedding Photo')}" loading="${idx === 0 ? 'eager' : 'lazy'}" />
            <div class="gallery-caption-bar">
              <p class="gallery-caption-title">${escapeHtml(img.caption || 'Pre-Wedding Memories')}</p>
            </div>
          </div>
        `).join('');

        // Populate Dots
        if (dotsContainer) {
            dotsContainer.innerHTML = currentGallery.map((_, idx) => `
              <button type="button" class="gallery-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Go to photo ${idx + 1}"></button>
            `).join('');
        }

        if (counter) {
            counter.textContent = `1 / ${currentGallery.length}`;
        }

        galleryCurrentIndex = 0;
        initGalleryCarousel();
    } catch (e) {
        console.error('Failed to load gallery:', e);
    }
}

function updateGalleryUI() {
    const track = document.getElementById('gallery-track');
    const dots = document.querySelectorAll('.gallery-dot');
    const counter = document.getElementById('gallery-counter');

    if (track) {
        track.style.transform = `translateX(-${galleryCurrentIndex * 100}%)`;
    }

    dots.forEach((dot, idx) => {
        if (idx === galleryCurrentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    if (counter && currentGallery && currentGallery.length > 0) {
        counter.textContent = `${galleryCurrentIndex + 1} / ${currentGallery.length}`;
    }
}

function goToGallerySlide(index) {
    if (!currentGallery || currentGallery.length === 0) return;
    galleryCurrentIndex = (index + currentGallery.length) % currentGallery.length;
    updateGalleryUI();
    resetGalleryAutoPlay();
}

function nextGallerySlide() {
    if (!currentGallery || currentGallery.length === 0) return;
    galleryCurrentIndex = (galleryCurrentIndex + 1) % currentGallery.length;
    updateGalleryUI();
}

function prevGallerySlide() {
    if (!currentGallery || currentGallery.length === 0) return;
    galleryCurrentIndex = (galleryCurrentIndex - 1 + currentGallery.length) % currentGallery.length;
    updateGalleryUI();
}

function startGalleryAutoPlay() {
    stopGalleryAutoPlay();
    if (!currentGallery || currentGallery.length <= 1) return;
    galleryAutoPlayTimer = setInterval(() => {
        nextGallerySlide();
    }, GALLERY_AUTOPLAY_INTERVAL);
}

function stopGalleryAutoPlay() {
    if (galleryAutoPlayTimer) {
        clearInterval(galleryAutoPlayTimer);
        galleryAutoPlayTimer = null;
    }
}

function resetGalleryAutoPlay() {
    stopGalleryAutoPlay();
    startGalleryAutoPlay();
}

function initGalleryCarousel() {
    const viewport = document.getElementById('gallery-viewport');
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');
    const dotsContainer = document.getElementById('gallery-dots');

    if (!viewport) return;

    // Prev / Next button listeners
    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            prevGallerySlide();
            resetGalleryAutoPlay();
        };
    }
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            nextGallerySlide();
            resetGalleryAutoPlay();
        };
    }

    // Dots listener
    if (dotsContainer) {
        dotsContainer.onclick = (e) => {
            const dot = e.target.closest('.gallery-dot');
            if (dot && dot.dataset.index !== undefined) {
                goToGallerySlide(parseInt(dot.dataset.index, 10));
            }
        };
    }

    // Pause on hover
    viewport.addEventListener('mouseenter', stopGalleryAutoPlay);
    viewport.addEventListener('mouseleave', startGalleryAutoPlay);

    // Tab visibility handling
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopGalleryAutoPlay();
        } else {
            startGalleryAutoPlay();
        }
    });

    // --- TOUCH SWIPE (MOBILE & TABLET) ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isTouching = false;

    viewport.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchEndX = touchStartX;
        touchEndY = touchStartY;
        isTouching = true;
        stopGalleryAutoPlay();
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (!isTouching || !e.touches || e.touches.length === 0) return;
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        if (!isTouching) return;
        isTouching = false;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);

        if (absDiffX > 35 && absDiffX > absDiffY) {
            if (diffX < 0) {
                // Swiped Left -> Next Photo
                nextGallerySlide();
            } else {
                // Swiped Right -> Prev Photo
                prevGallerySlide();
            }
        } else if (absDiffX < 10 && absDiffY < 10) {
            // Tap / Click to open Lightbox
            openLightbox(galleryCurrentIndex);
        }
        resetGalleryAutoPlay();
    });

    // --- MOUSE DRAG / SWIPE (DESKTOP) ---
    let mouseStartX = 0;
    let mouseEndX = 0;
    let isMouseDown = false;
    let hasDragged = false;

    viewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        isMouseDown = true;
        hasDragged = false;
        mouseStartX = e.clientX;
        mouseEndX = e.clientX;
        stopGalleryAutoPlay();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        mouseEndX = e.clientX;
        if (Math.abs(mouseEndX - mouseStartX) > 8) {
            hasDragged = true;
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isMouseDown) return;
        isMouseDown = false;
        const diffX = mouseEndX - mouseStartX;
        if (Math.abs(diffX) > 40) {
            if (diffX < 0) {
                nextGallerySlide();
            } else {
                prevGallerySlide();
            }
        } else if (!hasDragged) {
            // Check if the click target is a slide (and not a nav button)
            if (e.target.closest('#gallery-viewport') && !e.target.closest('.gallery-slider-btn')) {
                openLightbox(galleryCurrentIndex);
            }
        }
        resetGalleryAutoPlay();
    });

    // Start 3-second auto-play!
    startGalleryAutoPlay();
}

// Lightbox Logic
function setupLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (!modal) return;

    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
    });
}

function openLightbox(index) {
    if (!currentGallery || !currentGallery[index]) return;
    currentLightboxIndex = index;
    updateLightboxContent();
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.add('active');
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.remove('active');
}

function nextLightbox() {
    currentLightboxIndex = (currentLightboxIndex + 1) % currentGallery.length;
    updateLightboxContent();
}

function prevLightbox() {
    currentLightboxIndex = (currentLightboxIndex - 1 + currentGallery.length) % currentGallery.length;
    updateLightboxContent();
}

function updateLightboxContent() {
    const item = currentGallery[currentLightboxIndex];
    if (!item) return;
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    if (img) img.src = item.imageUrl;
    if (caption) caption.textContent = item.caption || '';
}

// 8. Load FAQs
async function loadFaqs() {
    try {
        const res = await fetch('/api/public/faq');
        if (!res.ok) return;
        const faqs = await res.json();

        const container = document.getElementById('faq-accordion');
        if (!container) return;

        container.innerHTML = faqs.map((f, i) => `
          <div class="accordion-item bg-white/90 backdrop-blur rounded-xl px-5 py-3 border border-stone-200/80 shadow-sm" id="faq-item-${i}">
            <button type="button" class="w-full flex justify-between items-center text-left py-2 group focus:outline-none" onclick="toggleFaq(${i})">
              <span class="font-serif text-lg md:text-xl font-semibold text-stone-800 group-hover:text-wedding-primary transition-colors">${escapeHtml(f.question)}</span>
              <i class="fas fa-chevron-down accordion-icon text-wedding-secondary text-sm transition-transform duration-300"></i>
            </button>
            <div class="accordion-content">
              <p class="text-stone-600 text-sm sm:text-base pt-2 leading-relaxed border-t border-stone-100 mt-2">${escapeHtml(f.answer)}</p>
            </div>
          </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load FAQs:', e);
    }
}

function toggleFaq(index) {
    const item = document.getElementById(`faq-item-${index}`);
    if (!item) return;
    item.classList.toggle('open');
}

// 9. Load Gift Info
async function loadGiftInfo() {
    try {
        const res = await fetch('/api/public/gift-info');
        if (!res.ok) return;
        const data = await res.json();

        const section = document.getElementById('gift-section');
        if (!section) return;

        if (!data.enabled) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (data.message) {
            setText('gift-custom-message', data.message);
        }
    } catch (e) {
        console.error('Failed to load gift information:', e);
    }
}

// 10. RSVP Form Handling & Dynamic Fields
function setupRsvpForm() {
    const form = document.getElementById('rsvp-form');
    if (!form) return;

    // Invitation Code input listeners
    const inviteCodeInput = document.getElementById('rsvp-invite-code');
    if (inviteCodeInput) {
        inviteCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                lookupInvitationCode();
            }
        });
        inviteCodeInput.addEventListener('blur', () => {
            const val = inviteCodeInput.value.trim();
            if (val && (!personalizedGuest || personalizedGuest.invitationCode?.toUpperCase() !== val.toUpperCase())) {
                lookupInvitationCode();
            }
        });
    }

    const guestCountInput = document.getElementById('rsvp-guest-count');
    if (guestCountInput) {
        guestCountInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            const maxVal = parseInt(e.target.max, 10) || 4;
            if (val > maxVal) {
                val = maxVal;
                e.target.value = maxVal;
            }
            if (val < 1) {
                val = 1;
                e.target.value = 1;
            }
            updateCompanionFields(val);
        });
    }

    // Duplicate check on blur of email or mobile
    const emailInput = document.getElementById('rsvp-email');
    const mobileInput = document.getElementById('rsvp-mobile');

    const triggerDuplicateCheck = async () => {
        const email = emailInput?.value.trim();
        const mobile = mobileInput?.value.trim();
        if (!email && !mobile) return;

        try {
            const res = await fetch('/api/public/rsvp/check-duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mobileNumber: mobile })
            });

            if (res.ok) {
                const data = await res.json();
                const warningBox = document.getElementById('rsvp-duplicate-warning');

                // If registered guest record matched, automatically populate their allocated seats
                if (data.guest && (!personalizedGuest || personalizedGuest.guestId !== data.guest.guestId)) {
                    prefillRsvpForm(data.guest);
                }

                if (data.exists) {
                    existingRsvpId = data.rsvpId;
                    if (warningBox) {
                        warningBox.classList.remove('hidden');
                        warningBox.innerHTML = `
                          <div class="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 mb-4 text-sm">
                            <i class="fas fa-info-circle mr-1.5 text-amber-600"></i>
                            <strong>Notice:</strong> An RSVP record already exists under this contact for <em>${escapeHtml(data.fullName)}</em> (${escapeHtml(data.attendanceStatus)}). 
                            Submitting this form again will securely update your existing reservation.
                          </div>
                        `;
                    }
                } else {
                    existingRsvpId = null;
                    if (warningBox) warningBox.classList.add('hidden');
                }
            }
        } catch (e) {
            console.warn('Duplicate check error:', e);
        }
    };

    if (emailInput) emailInput.addEventListener('blur', triggerDuplicateCheck);
    if (mobileInput) mobileInput.addEventListener('blur', triggerDuplicateCheck);

    // Form Submission
    form.addEventListener('submit', handleRsvpSubmit);
}

function setAttendance(status) {
    const tabAttending = document.getElementById('tab-attending');
    const tabDeclined = document.getElementById('tab-declined');
    const statusInput = document.getElementById('rsvp-attendance-status');
    const attendingFields = document.getElementById('attending-only-fields');

    if (status === 'Attending') {
        tabAttending?.classList.add('active');
        tabDeclined?.classList.remove('active');
        if (statusInput) statusInput.value = 'Attending';
        if (attendingFields) attendingFields.classList.remove('hidden');
    } else {
        tabDeclined?.classList.add('active');
        tabAttending?.classList.remove('active');
        if (statusInput) statusInput.value = 'Declined';
        if (attendingFields) attendingFields.classList.add('hidden');
    }
}

function updateCompanionFields(totalGuests) {
    const container = document.getElementById('companion-guests-container');
    if (!container) return;

    // Collect any existing values so they aren't lost if guest adjusts count
    const existingNames = Array.from(container.querySelectorAll('.companion-name')).map(el => el.value);

    const companionCount = Math.max(0, totalGuests - 1);
    if (companionCount === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
      <div class="calado-frame bg-stone-50/70 p-4 rounded-xl border border-stone-200 mb-3 space-y-4">
        <div class="flex items-center justify-between border-b border-stone-200/80 pb-2">
          <h5 class="font-serif text-base font-bold text-stone-800 flex items-center gap-2">
            <i class="fas fa-user-friends text-wedding-primary text-sm"></i>
            <span>Companion Guest Details</span>
          </h5>
          <span class="text-xs text-stone-500 font-medium">${companionCount} companion${companionCount > 1 ? 's' : ''}</span>
        </div>
    `;

    for (let i = 1; i <= companionCount; i++) {
        const prevName = existingNames[i - 1] || '';
        html += `
        <div class="space-y-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-700">
            Companion ${i} (Guest ${i + 1}) Full Name <span class="text-red-500">*</span>
          </label>
          <input type="text" class="companion-name w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-wedding-primary focus:border-transparent outline-none transition" placeholder="Enter companion's full name" value="${escapeHtml(prevName)}" required />
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

async function handleRsvpSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-rsvp');
    const originalText = btn ? btn.innerHTML : 'Submit RSVP';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...`;
    }

    const attendance = document.getElementById('rsvp-attendance-status')?.value || 'Attending';
    const isAttending = attendance === 'Attending';

    const companionGuests = [];
    if (isAttending) {
        const nameElems = document.querySelectorAll('.companion-name');

        for (let i = 0; i < nameElems.length; i++) {
            companionGuests.push({
                guestName: nameElems[i].value.trim(),
                mealPreference: null,
                dietaryRestrictions: null
            });
        }
    }

    const payload = {
        fullName: document.getElementById('rsvp-fullname')?.value.trim(),
        email: document.getElementById('rsvp-email')?.value.trim(),
        mobileNumber: document.getElementById('rsvp-mobile')?.value.trim(),
        attendanceStatus: attendance,
        numberOfGuests: isAttending ? parseInt(document.getElementById('rsvp-guest-count')?.value || '1', 10) : 0,
        mealPreference: null,
        dietaryRestrictions: null,
        message: document.getElementById('rsvp-message')?.value.trim() || '',
        invitationCode: document.getElementById('rsvp-invite-code')?.value.trim() || null,
        guestId: personalizedGuest?.guestId || null,
        companionGuests: isAttending ? companionGuests : []
    };

    try {
        const url = existingRsvpId ? `/api/public/rsvp/${existingRsvpId}` : '/api/public/rsvp';
        const method = existingRsvpId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || 'Error submitting RSVP. Please check your inputs.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        // Trigger Confetti Celebration
        triggerConfettiCelebration();

        // Show Success Modal
        showRsvpSuccessModal(payload);
    } catch (err) {
        console.error('RSVP submission error:', err);
        showToast('Network error while submitting RSVP. Please try again.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

function showRsvpSuccessModal(payload) {
    const modal = document.getElementById('rsvp-success-modal');
    if (!modal) return;

    const isAttending = payload.attendanceStatus === 'Attending';
    const summaryElem = document.getElementById('rsvp-success-summary');

    if (summaryElem) {
        summaryElem.innerHTML = `
          <p class="text-stone-700 mb-2">We have received your response, <strong>${escapeHtml(payload.fullName)}</strong>.</p>
          <div class="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-left my-4 space-y-1">
            <p><strong>Status:</strong> <span class="${isAttending ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}">${escapeHtml(payload.attendanceStatus)}</span></p>
            ${isAttending ? `<p><strong>Confirmed Seats:</strong> ${payload.numberOfGuests}</p>` : ''}
            ${isAttending && payload.mealPreference ? `<p><strong>Selected Meal:</strong> ${escapeHtml(payload.mealPreference)}</p>` : ''}
            <p><strong>Confirmation Sent To:</strong> ${escapeHtml(payload.email)}</p>
          </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeRsvpSuccessModal() {
    const modal = document.getElementById('rsvp-success-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const form = document.getElementById('rsvp-form');
    if (form) form.reset();
    const btn = document.getElementById('btn-submit-rsvp');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-heart mr-2"></i> Submit Response`;
    }
}

// 11. Background Music Player (With Web Audio Chime Fallback)
function setupAudioPlayer() {
    audioPlayer = document.getElementById('wedding-audio');
    const toggleBtn = document.getElementById('music-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleMusic);
    }
}

function toggleMusic() {
    const toggleBtn = document.getElementById('music-toggle');
    if (!audioPlayer) return;

    if (isAudioPlaying) {
        audioPlayer.pause();
        isAudioPlaying = false;
        if (toggleBtn) {
            toggleBtn.classList.remove('playing');
            toggleBtn.innerHTML = `♫`;
            toggleBtn.title = 'Play: Wedding Ambient Music';
        }
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isAudioPlaying = true;
                if (toggleBtn) {
                    toggleBtn.classList.add('playing');
                    toggleBtn.innerHTML = `<i class="fas fa-volume-up text-sm"></i>`;
                    toggleBtn.title = 'Pause: Wedding Ambient Music';
                }
            }).catch(e => {
                console.log('Audio file playback prevented or missing, starting soothing ambient chime fallback:', e);
                startAmbientSynthesizer();
                isAudioPlaying = true;
                if (toggleBtn) {
                    toggleBtn.classList.add('playing');
                    toggleBtn.innerHTML = `<i class="fas fa-volume-up text-sm"></i>`;
                    toggleBtn.title = 'Pause: Wedding Ambient Music';
                }
            });
        }
    }
}

// Synthesized Web Audio Fallback so soothing music plays even if local mp3 is missing
let synthContext = null;
let synthTimer = null;
function startAmbientSynthesizer() {
    if (synthContext) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        synthContext = new AudioCtx();

        // Romantic acoustic chord progression (G - Em - C - D)
        const notes = [
            [196.00, 246.94, 293.66, 392.00], // G major
            [164.81, 196.00, 246.94, 329.63], // E minor
            [130.81, 164.81, 196.00, 261.63], // C major
            [146.83, 220.00, 293.66, 369.99]  // D major
        ];

        let chordIndex = 0;
        const playChord = () => {
            if (!isAudioPlaying || !synthContext) return;
            const currentChord = notes[chordIndex % notes.length];
            chordIndex++;

            currentChord.forEach((freq, i) => {
                const osc = synthContext.createOscillator();
                const gain = synthContext.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, synthContext.currentTime + i * 0.15);

                gain.gain.setValueAtTime(0.001, synthContext.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.04, synthContext.currentTime + i * 0.15 + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.0001, synthContext.currentTime + i * 0.15 + 4.5);

                osc.connect(gain);
                gain.connect(synthContext.destination);

                osc.start(synthContext.currentTime + i * 0.15);
                osc.stop(synthContext.currentTime + i * 0.15 + 4.6);
            });
        };

        playChord();
        synthTimer = setInterval(playChord, 4500);
    } catch (e) {
        console.warn('Web Audio not supported:', e);
    }
}

// 12. Floating Petals Animation
function createFloatingPetals() {
    const layer = document.getElementById('petal-layer');
    if (!layer) return;

    for (let i = 0; i < 15; i++) {
        const petal = document.createElement('div');
        petal.classList.add('floating-petal');
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.animationDuration = `${6 + Math.random() * 8}s`;
        petal.style.animationDelay = `${Math.random() * 5}s`;
        layer.appendChild(petal);
    }
}

// 13. Confetti Celebration
function triggerConfettiCelebration() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#7A3B4D', '#F9F6F0', '#E5C07B']
        });
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#D4AF37', '#7A3B4D']
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#D4AF37', '#7A3B4D']
            });
        }, 250);
    }
}

// 14. Clipboard & Toast Utilities
function copyHashtag() {
    const tag = document.getElementById('wedding-hashtag-display')?.textContent?.trim() || '#MajhMadeForAaron';
    copyToClipboard(tag, 'Hashtag copied to clipboard!');
}

function copyToClipboard(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message || 'Copied to clipboard!');
        }).catch(() => fallbackCopy(text, message));
    } else {
        fallbackCopy(text, message);
    }
}

function fallbackCopy(text, message) {
    const temp = document.createElement('input');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showToast(message || 'Copied to clipboard!');
}

function showToast(msg, type = 'info') {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.classList.add('toast-notice');
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle text-red-400' : 'fa-check-circle text-wedding-secondary'} mr-2"></i> ${escapeHtml(msg)}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Helpers
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

function padZero(num) {
    return num < 10 ? `0${num}` : num.toString();
}

function formatDateOnly(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTimelineIcon(icon) {
    const map = {
        'ring': 'gem',
        'door-open': 'door-open',
        'wine-glass': 'wine-glass-alt',
        'sparkles': 'sparkles',
        'utensils': 'utensils',
        'microphone': 'microphone-alt',
        'music': 'music',
        'heart': 'heart'
    };
    return map[icon] || 'heart';
}
