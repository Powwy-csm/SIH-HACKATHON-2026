// ============================================================================
// STUDENT PORTAL — script (2).js
// ----------------------------------------------------------------------------
// Section 1: original view-routing / sidebar behaviour (unchanged in spirit)
// Section 2: Supabase Auth + Student AI backend integration
//
// Configuration (SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE_URL) is read from
// window.APP_CONFIG, defined inline in index (2).html. See that file for
// where to set these values. SUPABASE_SERVICE_ROLE_KEY must NEVER appear here.
// ============================================================================

// A simple routing function for the Single Page Application feel
function switchView(targetId) {
    if (!targetId) return; // guard against clicks on nav items with no data-target

    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    const targetView = document.getElementById('view-' + targetId);
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => targetView.classList.add('active'), 10);
    }
    // 3. Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === targetId) {
            nav.classList.add('active');
        }
    });

    // 4. Scroll to top
    document.querySelector('.main-content').scrollTo(0, 0);

    // 5. Load real data for the view being shown (Section 2 below)
    onViewShown(targetId);
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Sidebar Toggle ---
    const sidebar = document.getElementById('sidebar');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    if (mobileToggleBtn && sidebar) {
        mobileToggleBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
        });
    }

    if (mobileCloseBtn && sidebar) {
        mobileCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    // --- Tab Navigation Setup ---
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            switchView(target);

            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });

    // Allow clicking on Assessment radio buttons to trigger visual selection
    // (CSS :has() handles the styling, this just prevents default form submission issues if any)
    const radioInputs = document.querySelectorAll('.option-item input[type="radio"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            console.log("Selected option:", e.target.value);
        });
    });

    // --- Backend integration + auth bootstrap ---
    initBackendIntegration();
    setupAuthUI();
    bootstrapAuth();

    // Static integration buttons that exist regardless of which view is active
    const analyzeBtn = document.getElementById('analyze-profile-btn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', runAnalysisFlow);

    const refreshOppsBtn = document.getElementById('refresh-opportunities-btn');
    if (refreshOppsBtn) refreshOppsBtn.addEventListener('click', () => loadOpportunities(true));

    const refreshProfileBtn = document.getElementById('refresh-profile-btn');
    if (refreshProfileBtn) refreshProfileBtn.addEventListener('click', () => loadProfile(true));

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

// ============================================================================
// SECTION 2: Supabase Auth + Student AI backend integration
// ============================================================================

// ---- In-memory session cache (resets on full page reload by design) ----
const appState = {
    supabaseClient: null,
    configured: false,
    profile: null,          // last ProfileAnalysisResponse
    opportunities: null,    // last OpportunityMatchResponse.recommendations
    gapCache: {}            // posting_id -> SkillGapResponse
};

function initBackendIntegration() {
    const cfg = window.APP_CONFIG || {};
    const looksUnset = (v) => !v || v.indexOf('REPLACE_WITH') === 0;

    if (looksUnset(cfg.SUPABASE_URL) || looksUnset(cfg.SUPABASE_ANON_KEY) || looksUnset(cfg.API_BASE_URL)) {
        appState.configured = false;
        // Deliberately quiet on first load — the static UI stays fully usable.
        // A banner only appears once the user actually triggers a live action.
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        appState.configured = false;
        console.error('Supabase JS SDK failed to load; backend integration disabled.');
        return;
    }

    try {
        appState.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        appState.configured = true;

        // Central place that reacts to sign-in, sign-out, and token refresh.
        // INITIAL_SESSION is deliberately ignored here — bootstrapAuth() below
        // already performs the one-time session check on page load.
        appState.supabaseClient.auth.onAuthStateChange((event, session) => {
	    console.log('Supabase auth event:', event, 'Session exists:', !!session);

            if (event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_IN' && session) {
                showApp();
                onViewShown('dashboard');
            } else if (event === 'SIGNED_OUT') {
                clearStudentCaches();
                showAuthScreen();
            }
            // TOKEN_REFRESHED: nothing to do — getAccessToken() always reads the
            // live session, so subsequent API calls automatically pick up the
            // refreshed token.
        });
    } catch (err) {
        appState.configured = false;
        console.error('Failed to initialize Supabase client:', err);
    }
}

// ---- Status banner helpers ----
function showBanner(kind, message, opts) {
    const el = document.getElementById('app-status-banner');
    if (!el) return;
    opts = opts || {};
    el.className = 'app-status-banner status-' + kind;
    el.innerHTML = (opts.spinner ? '<span class="spinner-inline"></span>' : '') +
        '<span>' + message + '</span>';
    el.style.display = 'flex';
}

function hideBanner() {
    const el = document.getElementById('app-status-banner');
    if (el) el.style.display = 'none';
}

// ---- Auth ----
async function getAccessToken() {
    if (!appState.configured || !appState.supabaseClient) return null;
    try {
        const { data, error } = await appState.supabaseClient.auth.getSession();
        if (error || !data || !data.session) return null;
        return data.session.access_token || null;
    } catch (err) {
        console.error('Error reading Supabase session:', err);
        return null;
    }
}

// ---- Backend fetch wrapper ----
// Returns { ok: true, data } on success, or
// { ok: false, kind: 'not_configured'|'unauthenticated'|'unauthorized'|'forbidden'|'network'|'error', status? }
async function apiFetch(path, options) {
    options = options || {};

    if (!appState.configured) {
        return { ok: false, kind: 'not_configured' };
    }

    const token = await getAccessToken();
    if (!token) {
        return { ok: false, kind: 'unauthenticated' };
    }

    const cfg = window.APP_CONFIG;
    const url = cfg.API_BASE_URL.replace(/\/$/, '') + path;

    const headers = { 'Authorization': 'Bearer ' + token };
    let body;
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
    }

    let res;
    try {
        res = await fetch(url, { method: options.method || 'GET', headers, body });
    } catch (err) {
        return { ok: false, kind: 'network' };
    }

    if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));
    console.error('BACKEND 401:', errorData);
    return { ok: false, kind: 'unauthorized', detail: errorData };
}

if (res.status === 403) {
    const errorData = await res.json().catch(() => ({}));
    console.error('BACKEND 403:', errorData);
    return { ok: false, kind: 'forbidden', detail: errorData };
}
    if (!res.ok) return { ok: false, kind: 'error', status: res.status };

    try {
        const data = await res.json();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, kind: 'error', status: res.status };
    }
}

// Turns a failed apiFetch result into a banner. Returns nothing — caller
// decides whether to stop its flow after calling this.
function showErrorBanner(result, contextLabel) {
    switch (result.kind) {
        case 'not_configured':
            showBanner('warning', 'Backend connection isn\'t configured yet for this deployment.');
            break;
        case 'unauthenticated':
            showBanner('warning', 'Sign in to load your live ' + contextLabel + '.');
            break;
        case 'unauthorized':
   		 showBanner('error', 'Backend rejected the token. Session kept alive for debugging.');
    		console.error('Backend rejected token, but frontend session is being kept alive.');
   	 break;
   	 console.error('Backend rejected token, but NOT signing out the frontend.');
   	 break;
        case 'forbidden':
            showBanner('error', 'This account doesn\'t have access to student features.');
            break;
        case 'network':
            showBanner('error', 'Can\'t reach the backend right now. Showing your last known ' + contextLabel + '.');
            break;
        default:
            showBanner('error', 'Something went wrong loading your ' + contextLabel + '. Please try again.');
    }
}

// ---- View dispatcher ----
function onViewShown(targetId) {
    if (targetId === 'dashboard') loadDashboard();
    else if (targetId === 'profile') loadProfile(false);
    else if (targetId === 'opportunities') loadOpportunities(false);
}

// ----------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------
async function loadDashboard() {
    showBanner('info', 'Loading your dashboard…', { spinner: true });
    const result = await apiFetch('/api/student-ai/dashboard', { method: 'GET' });

    if (!result.ok) {
        // Static mock content (#ai-dashboard-content) stays visible by default —
        // nothing to hide/show here, just surface what happened.
        showErrorBanner(result, 'dashboard');
        return;
    }

    hideBanner();
    applyDashboardData(result.data);

    // Only bother pulling skill data for the dashboard's "Your Skills" list
    // once we know the dashboard actually has live AI data to show.
    if (result.data.status === 'ready') {
        const profileResult = await ensureProfile(false);
        if (profileResult.ok) renderDashboardSkills(profileResult.data);
    }
}

function applyDashboardData(data) {
    const cta = document.getElementById('analysis-required-cta');
    const content = document.getElementById('ai-dashboard-content');

    if (data.status === 'analysis_required') {
        if (cta) cta.style.display = 'block';
        if (content) content.style.display = 'none';
        const msg = document.getElementById('analysis-required-message');
        if (msg && data.message) msg.textContent = data.message;
        return;
    }

    // status === 'ready'
    if (cta) cta.style.display = 'none';
    if (content) content.style.display = 'block';

    setText('metric-profile-completion-value', formatPct(data.profile_completion));
    setWidth('metric-profile-completion-fill', data.profile_completion);

    setText('metric-industry-readiness-value', formatPct(data.industry_readiness));
    setWidth('metric-industry-readiness-fill', data.industry_readiness);

    if (data.top_recommendation) {
        renderTopRecommendation(data.top_recommendation);
    }
    if (data.top_skill_gap) {
        renderTopSkillGap(data.top_skill_gap);
    }
}

function renderTopRecommendation(rec) {
    const grid = document.getElementById('recommendation-grid');
    if (!grid) return;
    // Replace only the first card with the real top recommendation; leave any
    // other static cards (e.g. the workshop/event card) as-is.
    const firstCard = grid.querySelector('.opp-card');
    if (!firstCard) return;
    firstCard.innerHTML =
        '<div class="opp-header">' +
        '<div class="match-badge">' + formatPct(rec.match_score) + ' Match</div>' +
        '<button class="bookmark-btn"><i class="ph ph-bookmark-simple"></i></button>' +
        '</div>' +
        '<h3 class="opp-title">' + escapeHtml(rec.title) + '</h3>' +
        '<p class="opp-company">' + escapeHtml(rec.company) + '</p>' +
        '<button class="btn btn-outline w-full mt-24" onclick="switchView(\'opportunities\')">View Opportunity</button>';
}

function renderTopSkillGap(gap) {
    setText('top-skill-gap-title', gap.skill);
    setText('top-skill-gap-value', formatPct(gap.gap));
    // Dashboard's top_skill_gap only reports skill/gap/priority (no current vs
    // required split), so we only overwrite the fields we actually have.
    const currentEl = document.getElementById('top-skill-gap-current');
    const requiredEl = document.getElementById('top-skill-gap-required');
    if (currentEl) currentEl.textContent = '—';
    if (requiredEl) requiredEl.textContent = '—';
}

function renderDashboardSkills(profileData) {
    const container = document.getElementById('dashboard-skills-list');
    if (!container) return;

    const all = (profileData.verified_skills || []).map(s => ({ ...s, verified: true }))
        .concat((profileData.unverified_skills || []).map(s => ({ ...s, verified: false })));

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state">No skills recorded yet.</div>';
        return;
    }

    all.sort((a, b) => (b.proficiency || 0) - (a.proficiency || 0));
    const top = all.slice(0, 5);

    container.innerHTML = top.map(s =>
        '<div class="skill-row">' +
        '<div class="skill-info"><span>' + escapeHtml(s.skill) + '</span> <span class="skill-pct">' + formatPct(s.proficiency) + '</span></div>' +
        '<div class="progress-track"><div class="progress-fill" style="width: ' + clampPct(s.proficiency) + '%;"></div></div>' +
        '</div>'
    ).join('');
}

// ----------------------------------------------------------------------
// Analyze My Profile — full sequence (A → E) from the analysis_required CTA
// ----------------------------------------------------------------------
async function runAnalysisFlow() {
    const btn = document.getElementById('analyze-profile-btn');
    if (btn) btn.disabled = true;

    // A. Analyze profile
    showBanner('info', 'Analyzing your profile…', { spinner: true });
    const profileResult = await apiFetch('/api/student-ai/profile/analyze', { method: 'POST' });
    if (!profileResult.ok) {
        showErrorBanner(profileResult, 'profile analysis');
        if (btn) btn.disabled = false;
        return;
    }
    appState.profile = profileResult.data;

    // B. Reflect profile analysis immediately (Top Skills tags, if that view exists in DOM)
    renderProfileTags(profileResult.data);

    // C. Refresh opportunity matches
    showBanner('info', 'Finding matching opportunities…', { spinner: true });
    const matchResult = await apiFetch('/api/student-ai/opportunities/match', {
        method: 'POST',
        body: { refresh: true }
    });
    if (!matchResult.ok) {
        showErrorBanner(matchResult, 'opportunity matches');
        if (btn) btn.disabled = false;
        return;
    }
    appState.opportunities = matchResult.data.recommendations;

    // D. Re-fetch dashboard
    showBanner('info', 'Refreshing your dashboard…', { spinner: true });
    const dashboardResult = await apiFetch('/api/student-ai/dashboard', { method: 'GET' });
    if (!dashboardResult.ok) {
        showErrorBanner(dashboardResult, 'dashboard');
        if (btn) btn.disabled = false;
        return;
    }

    // E. Render real dashboard data
    hideBanner();
    applyDashboardData(dashboardResult.data);
    renderDashboardSkills(profileResult.data);
    if (btn) btn.disabled = false;
}

// ----------------------------------------------------------------------
// My Profile
// ----------------------------------------------------------------------
async function ensureProfile(forceRefresh) {
    if (appState.profile && !forceRefresh) {
        return { ok: true, data: appState.profile };
    }
    const result = await apiFetch('/api/student-ai/profile/analyze', { method: 'POST' });
    if (result.ok) appState.profile = result.data;
    return result;
}

async function loadProfile(forceRefresh) {
    showBanner('info', 'Loading your profile analysis…', { spinner: true });
    const result = await ensureProfile(forceRefresh);
    if (!result.ok) {
        showErrorBanner(result, 'profile');
        return;
    }
    hideBanner();
    renderProfileTags(result.data);
}

function renderProfileTags(profileData) {
    const container = document.getElementById('profile-skill-tags');
    if (!container) return;

    const verified = (profileData.verified_skills || []).map(s => ({ ...s, verified: true }));
    const unverified = (profileData.unverified_skills || []).map(s => ({ ...s, verified: false }));
    const all = verified.concat(unverified);

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state">No skills recorded yet.</div>';
        return;
    }

    container.innerHTML = all.map(s =>
        '<span class="s-tag' + (s.verified ? ' verified' : '') + '">' +
        escapeHtml(s.skill) +
        (s.verified ? ' <i class="ph-fill ph-check-circle"></i>' : '') +
        '</span>'
    ).join('');
}

// ----------------------------------------------------------------------
// Opportunities
// ----------------------------------------------------------------------
async function loadOpportunities(forceRefresh) {
    showBanner('info', forceRefresh ? 'Refreshing your recommendations…' : 'Loading opportunities…', { spinner: true });

    if (!forceRefresh && appState.opportunities) {
        hideBanner();
        renderOpportunitiesList(appState.opportunities);
        return;
    }

    const result = await apiFetch('/api/student-ai/opportunities/match', {
        method: 'POST',
        body: { refresh: !!forceRefresh }
    });

    if (!result.ok) {
        showErrorBanner(result, 'opportunities');
        // If we have nothing cached at all, show an empty state rather than a blank list.
        if (!appState.opportunities) renderOpportunitiesList([]);
        return;
    }

    hideBanner();
    appState.opportunities = result.data.recommendations;
    renderOpportunitiesList(appState.opportunities);
}

function renderOpportunitiesList(recommendations) {
    const container = document.getElementById('opportunities-list');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<div class="empty-state">No recommendations yet. Try "Refresh AI Insights" once your profile has some skills on it.</div>';
        return;
    }

    container.innerHTML = recommendations.map((rec, idx) => {
        const cardId = 'opp-card-' + idx;
        const missingNames = (rec.missing_skills || []).map(s => s.skill || s.name || '').filter(Boolean);
        return (
            '<div class="opp-list-card" id="' + cardId + '" data-posting-id="' + escapeHtml(rec.posting_id) + '">' +
            '<div class="olc-main">' +
            '<h3>' + escapeHtml(rec.title) + '</h3>' +
            '<p class="company">' + escapeHtml(rec.company) + '</p>' +
            '<div class="olc-tags">' +
            (rec.matched_skills || []).map(s => '<span>' + escapeHtml(s.skill || s.name || '') + '</span>').join('') +
            '</div>' +
            '<div class="olc-gap-panel" style="display:none;"></div>' +
            '</div>' +
            '<div class="olc-side">' +
            '<div class="match-score">' +
            '<span class="score">' + formatPct(rec.match_score) + ' Match</span>' +
            (missingNames.length ? '<span class="missing">Missing: ' + escapeHtml(missingNames.join(', ')) + '</span>' : '') +
            '</div>' +
            '<div class="olc-actions">' +
            '<button class="btn btn-outline" onclick="toggleSkillGapPanel(\'' + escapeHtml(rec.posting_id) + '\', \'' + cardId + '\')">View Details</button>' +
            '<button class="btn btn-primary" title="Application flow not yet available">Apply Now</button>' +
            '</div>' +
            '</div>' +
            '</div>'
        );
    }).join('');
}

// ----------------------------------------------------------------------
// Skill Gaps (per opportunity, lazy-loaded on "View Details")
// ----------------------------------------------------------------------
async function toggleSkillGapPanel(postingId, cardId) {
    if (!postingId) return; // never invent a posting_id
    const card = document.getElementById(cardId);
    if (!card) return;
    const panel = card.querySelector('.olc-gap-panel');
    if (!panel) return;

    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    if (appState.gapCache[postingId]) {
        renderSkillGapPanel(panel, appState.gapCache[postingId]);
        return;
    }

    panel.innerHTML = '<span class="spinner-inline"></span> Loading skill gaps…';

    const result = await apiFetch('/api/student-ai/skill-gaps/analyze', {
        method: 'POST',
        body: { posting_id: postingId }
    });

    if (!result.ok) {
        panel.innerHTML = '<span class="text-muted">Couldn\'t load skill gaps for this role right now.</span>';
        return;
    }

    appState.gapCache[postingId] = result.data;
    renderSkillGapPanel(panel, result.data);
}

function renderSkillGapPanel(panel, data) {
    const gaps = data.gaps || [];
    if (gaps.length === 0) {
        panel.innerHTML = '<span class="text-muted">No significant skill gaps for this role — nice work.</span>';
        return;
    }

    const rowsHtml = gaps.map(g =>
        '<div class="gap-row">' +
        '<span>' + escapeHtml(g.skill) + ' — you: ' + formatPct(g.current_level) + ', needed: ' + formatPct(g.required_level) +
        '<span class="gap-priority priority-' + escapeHtml(g.priority) + '">' + escapeHtml(g.priority) + '</span>' +
        '</span>' +
        '<span>' + formatPct(g.gap) + ' gap</span>' +
        '</div>'
    ).join('');

    // Pick the single largest gap as the smallest possible simulate hook.
    const topGap = gaps.slice().sort((a, b) => b.gap - a.gap)[0];

    panel.innerHTML =
        rowsHtml +
        '<div class="simulate-row">' +
        '<span>Simulate raising <strong>' + escapeHtml(topGap.skill) + '</strong> to ' + formatPct(topGap.required_level) + ':</span>' +
        '<button class="btn btn-outline" data-simulate-posting="' + escapeHtml(data.posting_id) + '" data-simulate-skill="' + escapeHtml(topGap.skill_id) + '" data-simulate-target="' + topGap.required_level + '">Run Simulation</button>' +
        '</div>' +
        '<div class="simulate-result"></div>';

    const simBtn = panel.querySelector('[data-simulate-posting]');
    if (simBtn) {
        simBtn.addEventListener('click', () => runSimulation(simBtn, panel.querySelector('.simulate-result')));
    }
}

// ----------------------------------------------------------------------
// Simulation (ephemeral — never persisted)
// ----------------------------------------------------------------------
async function runSimulation(btn, resultEl) {
    const postingId = btn.getAttribute('data-simulate-posting');
    const skillId = btn.getAttribute('data-simulate-skill');
    const targetLevel = parseFloat(btn.getAttribute('data-simulate-target'));

    if (!postingId || !skillId || isNaN(targetLevel)) return; // never send an invalid/invented payload

    btn.disabled = true;
    if (resultEl) resultEl.innerHTML = '<span class="spinner-inline"></span> Simulating…';

    const result = await apiFetch('/api/student-ai/simulate-improvement', {
        method: 'POST',
        body: {
            posting_id: postingId,
            skill_improvements: [{ skill_id: skillId, target_level: targetLevel }]
        }
    });

    btn.disabled = false;

    if (!result.ok) {
        if (resultEl) resultEl.innerHTML = '<span class="text-muted">Couldn\'t run the simulation right now.</span>';
        return;
    }

    const d = result.data;
    if (resultEl) {
        resultEl.innerHTML = 'Match score: ' + formatPct(d.current_score) + ' → ' + formatPct(d.simulated_score) +
            ' <span class="text-success">(+' + formatPct(d.delta) + ')</span>';
    }
}

// ----------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = clampPct(pct) + '%';
}

function clampPct(v) {
    const n = Number(v) || 0;
    return Math.max(0, Math.min(100, n));
}

function formatPct(v) {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (isNaN(n)) return '—';
    return (Number.isInteger(n) ? n : Math.round(n * 10) / 10) + '%';
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================================
// SECTION 3: Login / Sign Up screen + session lifecycle
// ----------------------------------------------------------------------------
// Uses supabase.auth.signInWithPassword() / signUp() / signOut() only — no
// custom authentication, no manual password storage.
// ============================================================================

function showApp() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-wrapper');
    if (auth) auth.style.display = 'none';
    if (app) app.style.display = 'flex';
}

function showAuthScreen() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-wrapper');
    if (app) app.style.display = 'none';
    if (auth) auth.style.display = 'flex';
}

function clearStudentCaches() {
    appState.profile = null;
    appState.opportunities = null;
    appState.gapCache = {};
    hideBanner();
}

function forceSignOutToLogin() {
    clearStudentCaches();
    if (appState.configured && appState.supabaseClient) {
        // Best-effort — regardless of whether this resolves, the UI already
        // treats the session as dead and returns to the login screen.
        appState.supabaseClient.auth.signOut().catch(() => {});
    }
    showAuthScreen();
}

// Checks for an existing session on page load and routes accordingly.
async function bootstrapAuth() {
    if (!appState.configured) {
        showAuthConfigWarning();
        showAuthScreen();
        return;
    }

    try {
        const { data, error } = await appState.supabaseClient.auth.getSession();
        if (error) throw error;

        if (data && data.session) {
            showApp();
            onViewShown('dashboard');
        } else {
            showAuthScreen();
        }
    } catch (err) {
        console.error('Error checking Supabase session:', err);
        showAuthScreen();
    }
}

function showAuthConfigWarning() {
    const el = document.getElementById('auth-status-banner');
    if (!el) return;
    el.className = 'app-status-banner status-warning';
    el.textContent = 'Backend connection isn\'t configured yet for this deployment — sign-in is unavailable.';
    el.style.display = 'flex';

    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    if (signinForm) signinForm.querySelectorAll('button, input').forEach(el => el.disabled = true);
    if (signupForm) signupForm.querySelectorAll('button, input').forEach(el => el.disabled = true);
}

// ---- Auth screen wiring ----
function setupAuthUI() {
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    const linkSignup = document.getElementById('auth-link-signup');
    const linkSignin = document.getElementById('auth-link-signin');

    const setMode = (mode) => {
        const isSignin = mode === 'signin';
        document.getElementById('auth-tab-signin').classList.toggle('active', isSignin);
        document.getElementById('auth-tab-signup').classList.toggle('active', !isSignin);
        document.getElementById('signin-form').style.display = isSignin ? 'flex' : 'none';
        document.getElementById('signup-form').style.display = isSignin ? 'none' : 'flex';
        document.getElementById('auth-switch-to-signup').style.display = isSignin ? 'inline' : 'none';
        document.getElementById('auth-switch-to-signin').style.display = isSignin ? 'none' : 'inline';
        hideAuthBanner();
        clearFieldErrors();
    };

    if (tabSignin) tabSignin.addEventListener('click', () => setMode('signin'));
    if (tabSignup) tabSignup.addEventListener('click', () => setMode('signup'));
    if (linkSignup) linkSignup.addEventListener('click', (e) => { e.preventDefault(); setMode('signup'); });
    if (linkSignin) linkSignin.addEventListener('click', (e) => { e.preventDefault(); setMode('signin'); });

    const signinForm = document.getElementById('signin-form');
    if (signinForm) signinForm.addEventListener('submit', (e) => { e.preventDefault(); handleSignIn(); });

    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', (e) => { e.preventDefault(); handleSignUp(); });
}

function showAuthBanner(kind, message) {
    const el = document.getElementById('auth-status-banner');
    if (!el) return;
    el.className = 'app-status-banner status-' + kind;
    el.textContent = message;
    el.style.display = 'flex';
}

function hideAuthBanner() {
    const el = document.getElementById('auth-status-banner');
    if (el) el.style.display = 'none';
}

function clearFieldErrors() {
    document.querySelectorAll('.auth-input').forEach(el => el.classList.remove('input-error'));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Friendly mapping for common Supabase Auth error messages.
function friendlyAuthError(err) {
    const msg = (err && err.message) || '';
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
    if (lower.includes('email not confirmed')) return 'Please confirm your email address before signing in.';
    if (lower.includes('user already registered') || lower.includes('already registered')) return 'An account with this email already exists. Try signing in instead.';
    if (lower.includes('password should be at least')) return 'Password is too short.';
    if (lower.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (lower.includes('network')) return 'Network error — please check your connection and try again.';
    return msg || 'Something went wrong. Please try again.';
}

async function handleSignIn() {
    if (!appState.configured) { showAuthConfigWarning(); return; }

    clearFieldErrors();
    hideAuthBanner();

    const emailEl = document.getElementById('signin-email');
    const passwordEl = document.getElementById('signin-password');
    const email = emailEl.value.trim();
    const password = passwordEl.value;

    let hasError = false;
    if (!isValidEmail(email)) { emailEl.classList.add('input-error'); hasError = true; }
    if (!password) { passwordEl.classList.add('input-error'); hasError = true; }
    if (hasError) { showAuthBanner('error', 'Enter a valid email and your password.'); return; }

    const btn = document.getElementById('signin-submit-btn');
    setAuthLoading(btn, true, 'Signing in…');

    try {
        const { data, error } = await appState.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data && data.session) {
            hideAuthBanner();
            showApp();
            onViewShown('dashboard');
        } else {
            showAuthBanner('error', 'Sign-in did not return a session. Please try again.');
        }
    } catch (err) {
        showAuthBanner('error', friendlyAuthError(err));
    } finally {
        setAuthLoading(btn, false, 'Sign In');
    }
}

async function handleSignUp() {
    if (!appState.configured) { showAuthConfigWarning(); return; }

    clearFieldErrors();
    hideAuthBanner();

    const emailEl = document.getElementById('signup-email');
    const passwordEl = document.getElementById('signup-password');
    const confirmEl = document.getElementById('signup-confirm-password');
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const confirm = confirmEl.value;

    let hasError = false;
    if (!isValidEmail(email)) { emailEl.classList.add('input-error'); hasError = true; }
    if (!password || password.length < 8) { passwordEl.classList.add('input-error'); hasError = true; }
    if (password !== confirm) { confirmEl.classList.add('input-error'); hasError = true; }

    if (hasError) {
        showAuthBanner('error', 'Check the highlighted fields: a valid email, a password of at least 8 characters, and matching confirmation.');
        return;
    }

    const btn = document.getElementById('signup-submit-btn');
    setAuthLoading(btn, true, 'Creating account…');

    try {
        const { data, error } = await appState.supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        if (data && data.session) {
            // Email confirmation is disabled on this project — session is live immediately.
            hideAuthBanner();
            showApp();
            onViewShown('dashboard');
        } else {
            // Email confirmation is required — no session yet.
            showAuthBanner('info', 'Account created! Check your email to confirm your address, then sign in.');
        }
    } catch (err) {
        showAuthBanner('error', friendlyAuthError(err));
    } finally {
        setAuthLoading(btn, false, 'Sign Up');
    }
}

async function handleLogout() {
    if (appState.configured && appState.supabaseClient) {
        try {
            await appState.supabaseClient.auth.signOut();
        } catch (err) {
            console.error('Error signing out:', err);
        }
    }
    clearStudentCaches();
    showAuthScreen();
}

function setAuthLoading(btn, isLoading, label) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<span class="spinner-inline"></span> ' + label : label;
}
