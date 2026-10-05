/**
 * Admin Portal Shared JavaScript
 * Wedding Invitation Application
 */

const TOKEN_KEY = 'wedding_admin_token';
const USER_KEY = 'wedding_admin_user';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setAuthSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    try {
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            clearAuthSession();
            window.location.href = '/admin/login.html?expired=true';
            return null;
        }
        return response;
    } catch (err) {
        console.error('API network error:', err);
        throw err;
    }
}

// Check admin authentication on protected pages
function requireAdminAuth() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const token = getToken();

    if (!token && !isLoginPage) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return true;
}

// Initialize admin header & current user profile
async function initAdminHeader() {
    if (window.location.pathname.endsWith('login.html')) return;

    const user = getStoredUser();
    const nameElem = document.getElementById('admin-header-name');
    if (nameElem && user) {
        nameElem.textContent = user.fullName || user.username || 'Administrator';
    }

    // Verify token with server
    try {
        const res = await authFetch('/api/auth/me');
        if (res && res.ok) {
            const data = await res.json();
            if (nameElem && data.fullName) {
                nameElem.textContent = data.fullName;
            }
        }
    } catch (e) {
        console.warn('Auth verification failed', e);
    }
}

// Logout
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn('Logout endpoint failed:', e);
    } finally {
        clearAuthSession();
        window.location.href = '/admin/login.html';
    }
}

// Admin Toast Notifications
function showAdminToast(message, type = 'success') {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all transform duration-300 translate-y-12 opacity-0 text-white';
        document.body.appendChild(toast);
    }

    if (type === 'error') {
        toast.className = toast.className.replace(/bg-\w+-\d+/g, '') + ' bg-red-600';
        toast.innerHTML = `<i class="fas fa-exclamation-circle text-base"></i> <span>${escapeHtml(message)}</span>`;
    } else {
        toast.className = toast.className.replace(/bg-\w+-\d+/g, '') + ' bg-stone-900';
        toast.innerHTML = `<i class="fas fa-check-circle text-amber-400 text-base"></i> <span>${escapeHtml(message)}</span>`;
    }

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-12', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-y-12', 'opacity-0');
    }, 3500);
}

// Utility: copy text to clipboard
function copyAdminText(text, successMsg = 'Copied to clipboard!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showAdminToast(successMsg);
        }).catch(() => fallbackCopy(text, successMsg));
    } else {
        fallbackCopy(text, successMsg);
    }
}

function fallbackCopy(text, successMsg) {
    const temp = document.createElement('input');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showAdminToast(successMsg);
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

document.addEventListener('DOMContentLoaded', () => {
    requireAdminAuth();
    initAdminHeader();
});
