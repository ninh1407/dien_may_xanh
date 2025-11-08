// Safe localStorage utilities
function isStorageAvailable() {
    try {
        return typeof localStorage !== 'undefined' && localStorage !== null;
    } catch (e) {
        return false;
    }
}

function safeGetItem(key, defaultValue = null) {
    try {
        if (isStorageAvailable()) {
            const item = localStorage.getItem(key);
            return item !== null ? item : defaultValue;
        }
    } catch (e) {
        console.warn('localStorage getItem error:', e);
    }
    return defaultValue;
}

function safeSetItem(key, value) {
    try {
        if (isStorageAvailable()) {
            localStorage.setItem(key, value);
            return true;
        }
    } catch (e) {
        console.warn('localStorage setItem error:', e);
    }
    return false;
}

function safeRemoveItem(key) {
    try {
        if (isStorageAvailable()) {
            localStorage.removeItem(key);
            return true;
        }
    } catch (e) {
        console.warn('localStorage removeItem error:', e);
    }
    return false;
}

function safeParseJSON(key, defaultValue = {}) {
    try {
        const item = safeGetItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn('JSON parse error:', e);
        return defaultValue;
    }
}

function safeStringifyJSON(key, value) {
    try {
        return safeSetItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('JSON stringify error:', e);
        return false;
    }
}