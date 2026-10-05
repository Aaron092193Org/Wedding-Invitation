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

// 5. Load Timeline
async function loadTimeline() {
    try {
        const res = await fetch('/api/public/timeline');
        if (!res.ok) return;
        const items = await res.json();

        const container = document.getElementById('timeline-container');
        if (!container) return;

        container.innerHTML = items.map((item, index) => {
            const isEven = index % 2 === 0;
            return `
            <div class="relative flex items-start md:items-center md:justify-normal ${isEven ? 'md:flex-row-reverse' : ''} group mb-8">
              <div class="hidden md:block w-5/12 ${isEven ? 'text-left pl-8' : 'text-right pr-8'}">
                <span class="text-sm font-semibold text-wedding-primary tracking-widest uppercase">${escapeHtml(item.time)}</span>
                <h4 class="font-serif text-2xl font-bold text-stone-800">${escapeHtml(item.title)}</h4>
                ${item.description ? `<p class="text-stone-600 text-sm mt-1">${escapeHtml(item.description)}</p>` : ''}
              </div>

              <div class="timeline-dot shrink-0 md:mx-auto z-10">
                <i class="fas fa-${getTimelineIcon(item.icon)}"></i>
              </div>

              <div class="flex-1 min-w-0 pl-4 md:pl-0 md:w-5/12 ${isEven ? 'md:pr-8 md:text-right' : 'md:pl-8 md:text-left'}">
                <div class="md:hidden">
                  <span class="text-xs font-bold text-wedding-primary tracking-widest uppercase block mb-0.5">${escapeHtml(item.time)}</span>
                  <h4 class="font-serif text-lg sm:text-xl font-bold text-stone-800 leading-snug">${escapeHtml(item.title)}</h4>
                  ${item.description ? `<p class="text-stone-600 text-xs sm:text-sm mt-1 leading-relaxed">${escapeHtml(item.description)}</p>` : ''}
                </div>
              </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load timeline:', e);
    }
}

// 6. Load Entourage
async function loadEntourage() {
    try {
        const res = await fetch('/api/public/entourage');
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('entourage-container');
        if (!container) return;

        const grouped = data.grouped || {};
        const categories = Object.keys(grouped);

        container.innerHTML = categories.map(cat => `
          <div class="capiz-card calado-frame p-6 shadow-sm text-center">
            <h4 class="font-serif text-xl font-bold text-wedding-primary tracking-wide uppercase mb-3">${escapeHtml(cat)}</h4>
            <div class="space-y-1.5">
              ${grouped[cat].map(m => `
                <div class="text-stone-800 font-medium">${escapeHtml(m.name)}</div>
                ${m.role && m.role !== cat ? `<div class="text-xs text-stone-500 italic">${escapeHtml(m.role)}</div>` : ''}
              `).join('')}
            </div>
          </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load entourage:', e);
    }
}

// 7. Load Gallery
async function loadGallery() {
    try {
        const res = await fetch('/api/public/gallery');
        if (!res.ok) return;
        currentGallery = await res.json();

        const grid = document.getElementById('gallery-grid');
        if (!grid) return;

        grid.innerHTML = currentGallery.map((img, idx) => `
          <div class="gallery-item group" onclick="openLightbox(${idx})">
            <img src="${escapeHtml(img.imageUrl)}" alt="${escapeHtml(img.caption || 'Wedding Photo')}" loading="lazy" />
            <div class="gallery-overlay">
              <p class="font-serif text-sm tracking-wide">${escapeHtml(img.caption || 'Forever & Always')}</p>
            </div>
          </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load gallery:', e);
    }
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
            toggleBtn.title = 'Play Background Music';
        }
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isAudioPlaying = true;
                if (toggleBtn) {
                    toggleBtn.classList.add('playing');
                    toggleBtn.innerHTML = `<i class="fas fa-volume-up text-sm"></i>`;
                    toggleBtn.title = 'Pause Background Music';
                }
            }).catch(e => {
                console.log('Audio file playback prevented or missing, starting soothing ambient chime fallback:', e);
                startAmbientSynthesizer();
                isAudioPlaying = true;
                if (toggleBtn) {
                    toggleBtn.classList.add('playing');
                    toggleBtn.innerHTML = `<i class="fas fa-volume-up text-sm"></i>`;
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
