/**
 * PR Enhancer - Service Worker (Background Script)
 * Handles extension lifecycle, message routing, and keyboard shortcuts
 *
 * @fileoverview Background service worker for the PR Enhancer extension
 * @author PR Enhancer Contributors
 * @version 2.0.0
 * 
 * Follows Chrome Extension Manifest V3 best practices:
 * - Minimal background processing
 * - Event-driven architecture
 * - Proper error handling
 * - No persistent connections
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Default preferences for new installations
 * @constant {Object}
 */
const DEFAULT_PREFERENCES = {
  sortPreference: 'date-newest',
  filterPreference: 'all',
  autoSort: false,
  showNotifications: true,
  hasSeenOnboarding: false
};

/**
 * Storage keys used by the extension
 * @constant {Object}
 */
const STORAGE_KEYS = {
  SORT_PREFERENCE: 'sortPreference',
  FILTER_PREFERENCE: 'filterPreference',
  AUTO_SORT: 'autoSort',
  SHOW_NOTIFICATIONS: 'showNotifications',
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding'
};

// ============================================
// LIFECYCLE EVENTS
// ============================================

/**
 * Handle extension installation and updates
 * @param {chrome.runtime.InstalledDetails} details - Installation details
 */
chrome.runtime.onInstalled.addListener((details) => {
  try {
    if (details.reason === 'install') {
      // Set default preferences on first install
      chrome.storage.sync.set(DEFAULT_PREFERENCES)
        .then(() => {
          console.log('[PR Enhancer] Extension installed successfully with default preferences');
        })
        .catch((error) => {
          console.error('[PR Enhancer] Failed to set default preferences:', error);
        });
    } else if (details.reason === 'update') {
      const manifest = chrome.runtime.getManifest();
      console.log(`[PR Enhancer] Extension updated to version ${manifest.version}`);
      
      // Migrate any old preferences if needed
      migratePreferences(details.previousVersion, manifest.version);
    }
  } catch (error) {
    console.error('[PR Enhancer] Error in onInstalled handler:', error);
  }
});

/**
 * Migrate preferences between versions if needed
 * @param {string} previousVersion - Previous extension version
 * @param {string} currentVersion - Current extension version
 */
async function migratePreferences(previousVersion, currentVersion) {
  try {
    const existingPrefs = await chrome.storage.sync.get(null);
    const updates = {};

    // Migrate old default 'date-oldest' to new default 'date-newest'
    // Only update if user hasn't explicitly changed it from the old default
    if (existingPrefs.sortPreference === 'date-oldest') {
      updates.sortPreference = 'date-newest';
      console.log('[PR Enhancer] Migrating sort preference from oldest to newest (new default)');
    }

    // Ensure all keys exist
    for (const [key, defaultValue] of Object.entries(DEFAULT_PREFERENCES)) {
      if (!(key in existingPrefs)) {
        updates[key] = defaultValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.sync.set(updates);
      console.log('[PR Enhancer] Migrated preferences:', updates);
    }
  } catch (error) {
    console.error('[PR Enhancer] Error migrating preferences:', error);
  }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

/**
 * Handle keyboard command shortcuts
 * Listens for the 'sort-comments' command defined in manifest.json
 */
if (chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    try {
      if (command === 'sort-comments') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab?.url?.includes('github.com') && tab.url.includes('/pull/')) {
          await sendMessageToTab(tab.id, { action: 'toggleSort' });
        }
      }
    } catch (error) {
      console.error('[PR Enhancer] Error handling keyboard command:', error);
    }
  });
}

// ============================================
// MESSAGE HANDLING
// ============================================

/**
 * Send a message to a specific tab with error handling
 * @param {number} tabId - ID of the target tab
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from the content script
 */
async function sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Content script might not be loaded, try to inject it
    if (error.message?.includes('Receiving end does not exist')) {
      await injectContentScript(tabId);
      return await chrome.tabs.sendMessage(tabId, message);
    }
    throw error;
  }
}

/**
 * Inject content script into a tab
 * @param {number} tabId - ID of the target tab
 * @returns {Promise<void>}
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css']
    });
  } catch (error) {
    console.error('[PR Enhancer] Failed to inject content script:', error);
    throw error;
  }
}

/**
 * Handle messages from content scripts and popup
 * @param {Object} request - The message request
 * @param {chrome.runtime.MessageSender} sender - Message sender info
 * @param {function} sendResponse - Response callback
 * @returns {boolean} True to keep the message channel open for async response
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use async handler to properly manage promises
  handleMessage(request, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[PR Enhancer] Message handling error:', error);
      sendResponse({ error: error.message });
    });
  
  return true; // Keep message channel open for async response
});

/**
 * Async message handler
 * @param {Object} request - The message request
 * @param {chrome.runtime.MessageSender} sender - Message sender info
 * @returns {Promise<Object>} Response object
 */
async function handleMessage(request, sender) {
  switch (request.action) {
    case 'getPreferences':
      return await chrome.storage.sync.get([
        STORAGE_KEYS.SORT_PREFERENCE,
        STORAGE_KEYS.FILTER_PREFERENCE,
        STORAGE_KEYS.AUTO_SORT,
        STORAGE_KEYS.SHOW_NOTIFICATIONS
      ]);
      
    case 'savePreferences':
      await chrome.storage.sync.set(request.preferences);
      return { success: true };
      
    case 'log':
      // Centralized logging from content scripts
      console.log(`[Content Script ${sender.tab?.id}]: ${request.message}`);
      return { received: true };
      
    case 'getVersion':
      return { version: chrome.runtime.getManifest().version };
      
    default:
      return { error: 'Unknown action' };
  }
}

// ============================================
// TAB UPDATES
// ============================================

/**
 * Handle tab updates to reinject content scripts when needed
 * This handles GitHub's SPA navigation
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when page is fully loaded and it's a GitHub PR page
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('github.com') || !tab.url.includes('/pull/')) return;
  
  try {
    // Check if content script is already injected
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    try {
      await injectContentScript(tabId);
      console.log('[PR Enhancer] Content script injected into tab:', tabId);
    } catch (injectError) {
      // Silently fail - user might not have granted permission
      console.log('[PR Enhancer] Could not inject content script:', injectError.message);
    }
  }
});

// ============================================
// SERVICE WORKER LIFECYCLE
// ============================================

/**
 * Handle service worker activation
 * This is called when the service worker takes control
 */
self.addEventListener('activate', (event) => {
  console.log('[PR Enhancer] Service worker activated');
});

/**
 * Keep service worker alive during critical operations
 * Note: In MV3, service workers are short-lived by design
 */
self.addEventListener('install', (event) => {
  console.log('[PR Enhancer] Service worker installed');
  // Skip waiting to activate immediately
  self.skipWaiting();
});
