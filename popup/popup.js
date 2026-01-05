/**
 * PR Enhancer - Popup Script
 * Follows Chrome Extension best practices and Primer design patterns
 *
 * @fileoverview Popup UI controller for the PR Enhancer extension
 * @author PR Enhancer Contributors
 * @version 2.0.0
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Animation and timing configuration
   * @constant {Object}
   */
  const CONFIG = {
    ANIMATION_DURATION: 150,
    ERROR_DISPLAY_DURATION: 3000,
    SUCCESS_FEEDBACK_DURATION: 150,
    CONTENT_SCRIPT_TIMEOUT: 100
  };

  /**
   * Storage keys for user preferences
   * @constant {Object}
   */
  const STORAGE_KEYS = {
    SORT_PREFERENCE: 'sortPreference',
    HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
    MOVE_MERGE_STATUS: 'moveMergeStatus'
  };

  // ============================================
  // DOM ELEMENTS
  // ============================================

  /** @type {HTMLElement|null} */
  const statusMessage = document.getElementById('status-message');
  /** @type {HTMLElement|null} */
  const statusText = document.getElementById('status-text');
  /** @type {HTMLElement|null} */
  const sortControls = document.getElementById('sort-controls');
  /** @type {HTMLElement|null} */
  const loadingState = document.getElementById('loading-state');
  /** @type {HTMLElement|null} */
  const onboarding = document.getElementById('onboarding');
  /** @type {HTMLElement|null} */
  const dismissOnboarding = document.getElementById('dismiss-onboarding');
  /** @type {NodeListOf<HTMLButtonElement>} */
  const sortButtons = document.querySelectorAll('.sort-btn');
  /** @type {HTMLInputElement|null} */
  const moveMergeToggle = document.getElementById('move-merge-toggle');

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Safely query the DOM with error handling
   * @param {string} selector - CSS selector
   * @param {Element} [context=document] - Context element
   * @returns {Element|null} The found element or null
   */
  function safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      console.warn('[Popup] Invalid selector:', selector);
      return null;
    }
  }

  /**
   * Show an element by removing hidden attribute
   * @param {HTMLElement|null} element - Element to show
   */
  function showElement(element) {
    if (element) {
      element.hidden = false;
      element.removeAttribute('aria-hidden');
    }
  }

  /**
   * Hide an element by setting hidden attribute
   * @param {HTMLElement|null} element - Element to hide
   */
  function hideElement(element) {
    if (element) {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    }
  }

  // ============================================
  // TAB AND PAGE DETECTION
  // ============================================

  /**
   * Check if the current tab is a GitHub PR page
   * @returns {Promise<chrome.tabs.Tab|null>} The active tab if on a PR page, null otherwise
   */
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url) {
        showNotOnPR('Cannot access current tab');
        return null;
      }

      const url = new URL(tab.url);
      const isGitHubPR = url.hostname === 'github.com' && url.pathname.includes('/pull/');

      if (!isGitHubPR) {
        showNotOnPR('Navigate to a GitHub PR to use this extension');
        return null;
      }

      showSortControls();
      return tab;
    } catch (error) {
      console.error('[Popup] Error checking tab:', error);
      showNotOnPR('Error accessing tab information');
      return null;
    }
  }

  // ============================================
  // UI STATE MANAGEMENT
  // ============================================

  /**
   * Show message when not on a PR page
   * @param {string} [message] - Custom message to display
   */
  function showNotOnPR(message = 'Navigate to a GitHub PR to use this extension') {
    if (statusText) {
      statusText.textContent = message;
    }
    showElement(statusMessage);
    hideElement(sortControls);
    hideElement(loadingState);
  }

  /**
   * Show sort controls when on a PR page
   */
  function showSortControls() {
    hideElement(statusMessage);
    showElement(sortControls);
    hideElement(loadingState);
  }

  /**
   * Show loading state
   */
  function showLoading() {
    hideElement(statusMessage);
    hideElement(sortControls);
    showElement(loadingState);
  }

  // ============================================
  // CONTENT SCRIPT COMMUNICATION
  // ============================================

  /**
   * Ensure content script is loaded in the tab
   * @param {number} tabId - ID of the tab
   * @returns {Promise<boolean>} True if content script is ready
   */
  async function ensureContentScript(tabId) {
    try {
      // Try to ping the content script
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response?.pong === true;
    } catch (error) {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content/content.css']
        });
        // Wait for the script to initialize
        await new Promise(resolve => setTimeout(resolve, CONFIG.CONTENT_SCRIPT_TIMEOUT));
        return true;
      } catch (injectError) {
        console.error('[Popup] Could not inject content script:', injectError);
        return false;
      }
    }
  }

  /**
   * Get current status from content script
   * @param {number} tabId - ID of the tab
   * @returns {Promise<void>}
   */
  async function getStatus(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });

      if (response) {
        // Update active button based on current sort
        updateButtonStates(response.currentSort);
      }
    } catch (error) {
      console.log('[Popup] Could not get status from content script:', error.message);
    }
  }

  /**
   * Update button states based on current sort option
   * @param {string} currentSort - The current sort option
   */
  function updateButtonStates(currentSort) {
    sortButtons.forEach(btn => {
      const isActive = btn.dataset.sort === currentSort;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  // ============================================
  // SORT FUNCTIONALITY
  // ============================================

  /**
   * Send sort command to content script
   * @param {string} sortOption - The sort option to apply
   * @param {number} tabId - ID of the tab
   * @returns {Promise<void>}
   */
  async function sortComments(sortOption, tabId) {
    try {
      // Update UI immediately for responsiveness
      updateButtonStates(sortOption);

      // Ensure content script is loaded
      const isLoaded = await ensureContentScript(tabId);
      
      if (!isLoaded) {
        showError('Could not connect to page. Please refresh and try again.');
        return;
      }

      // Send message to content script
      await chrome.tabs.sendMessage(tabId, { 
        action: 'sort', 
        sortOption 
      });

      // Save preference
      await chrome.storage.sync.set({ [STORAGE_KEYS.SORT_PREFERENCE]: sortOption });

      // Show success feedback
      showSuccess();

    } catch (error) {
      console.error('[Popup] Error sorting comments:', error);
      showError('Error sorting comments. Please try again.');
    }
  }

  // ============================================
  // FEEDBACK UI
  // ============================================

  /**
   * Show success feedback on buttons
   */
  function showSuccess() {
    sortButtons.forEach(btn => {
      if (btn.classList.contains('active')) {
        btn.style.transition = `transform ${CONFIG.ANIMATION_DURATION}ms ease`;
        btn.style.transform = 'scale(1.02)';
        setTimeout(() => {
          btn.style.transform = '';
        }, CONFIG.SUCCESS_FEEDBACK_DURATION);
      }
    });
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.popup-error');
    if (existingError) existingError.remove();

    // Create error element using Primer Flash pattern
    const errorDiv = document.createElement('div');
    errorDiv.className = 'popup-error';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');
    
    // Add error icon (Octicon: alert)
    errorDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm.852.77L1.227 13.2a.25.25 0 0 0 .22.3h12.106a.25.25 0 0 0 .22-.3L7.691 1.817a.25.25 0 0 0-.382 0ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
      </svg>
      <span>${message}</span>
    `;
    
    if (sortControls) {
      sortControls.insertBefore(errorDiv, sortControls.firstChild);
    }
    
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      setTimeout(() => errorDiv.remove(), CONFIG.ANIMATION_DURATION);
    }, CONFIG.ERROR_DISPLAY_DURATION);
  }

  // ============================================
  // ONBOARDING
  // ============================================

  /**
   * Check and show onboarding if first time user
   * @returns {Promise<void>}
   */
  async function checkOnboarding() {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.HAS_SEEN_ONBOARDING]);
      if (!result[STORAGE_KEYS.HAS_SEEN_ONBOARDING] && onboarding) {
        showElement(onboarding);
      }
    } catch (error) {
      console.error('[Popup] Error checking onboarding status:', error);
    }
  }

  /**
   * Dismiss onboarding and save preference
   * @returns {Promise<void>}
   */
  async function dismissOnboardingHandler() {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.HAS_SEEN_ONBOARDING]: true });
      if (onboarding) {
        onboarding.style.opacity = '0';
        onboarding.style.transform = 'translateY(-8px)';
        setTimeout(() => hideElement(onboarding), CONFIG.ANIMATION_DURATION);
      }
    } catch (error) {
      console.error('[Popup] Error dismissing onboarding:', error);
      hideElement(onboarding);
    }
  }

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Load saved sort preference
   * @returns {Promise<void>}
   */
  async function loadSavedPreference() {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.SORT_PREFERENCE]);
      // Use saved preference or default to newest first
      const preference = result[STORAGE_KEYS.SORT_PREFERENCE] || 'date-newest';
      updateButtonStates(preference);
    } catch (error) {
      console.error('[Popup] Error loading preference:', error);
      // On error, use default
      updateButtonStates('date-newest');
    }
  }

  /**
   * Load move merge status preference
   * @returns {Promise<void>}
   */
  async function loadMovemergePreference() {
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEYS.MOVE_MERGE_STATUS]);
      const shouldMove = result[STORAGE_KEYS.MOVE_MERGE_STATUS] !== false; // Default to true

      if (moveMergeToggle) {
        moveMergeToggle.checked = shouldMove;
        moveMergeToggle.setAttribute('aria-checked', shouldMove ? 'true' : 'false');
      }
    } catch (error) {
      console.error('[Popup] Error loading move merge preference:', error);
    }
  }

  /**
   * Handle move merge status toggle change
   * @param {boolean} shouldMove - Whether to move merge status to top
   * @returns {Promise<void>}
   */
  async function handleMoveMergeToggle(shouldMove) {
    try {
      // Save preference
      await chrome.storage.sync.set({ [STORAGE_KEYS.MOVE_MERGE_STATUS]: shouldMove });

      // Update aria-checked
      if (moveMergeToggle) {
        moveMergeToggle.setAttribute('aria-checked', shouldMove ? 'true' : 'false');
      }

      // Notify content script to refresh
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'updateMergeStatusPreference',
            shouldMove
          });
        } catch (error) {
          // Content script might not be loaded yet, that's okay
          console.log('[Popup] Could not notify content script:', error.message);
        }
      }
    } catch (error) {
      console.error('[Popup] Error saving move merge preference:', error);
    }
  }

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  /**
   * Set up keyboard navigation for accessibility
   */
  function setupKeyboardNavigation() {
    let currentIndex = 0;
    const buttons = Array.from(sortButtons);

    if (sortControls) {
      sortControls.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          
          if (e.key === 'ArrowDown') {
            currentIndex = (currentIndex + 1) % buttons.length;
          } else {
            currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          }
          
          buttons[currentIndex].focus();
        }
      });
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Set up sort button click handlers
   * @param {chrome.tabs.Tab} tab - The current tab
   */
  function setupSortButtonHandlers(tab) {
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sortComments(btn.dataset.sort, tab.id);
      });

      // Keyboard support for activation
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  /**
   * Set up onboarding dismiss handler
   */
  function setupOnboardingHandler() {
    if (dismissOnboarding) {
      dismissOnboarding.addEventListener('click', dismissOnboardingHandler);
    }
  }

  /**
   * Set up settings toggle handlers
   */
  function setupSettingsHandlers() {
    if (moveMergeToggle) {
      moveMergeToggle.addEventListener('change', (e) => {
        handleMoveMergeToggle(e.target.checked);
      });
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the popup
   * @returns {Promise<void>}
   */
  async function init() {
    try {
      // Show loading state initially
      showLoading();

      // Load saved preferences
      await loadSavedPreference();
      await loadMovemergePreference();

      // Check for onboarding
      await checkOnboarding();

      // Setup keyboard navigation
      setupKeyboardNavigation();

      // Setup handlers
      setupOnboardingHandler();
      setupSettingsHandlers();

      // Check current tab
      const tab = await checkCurrentTab();

      if (tab) {
        // Ensure content script is loaded
        await ensureContentScript(tab.id);

        // Get current status
        await getStatus(tab.id);

        // Set up sort button click handlers
        setupSortButtonHandlers(tab);
      }
    } catch (error) {
      console.error('[Popup] Initialization error:', error);
      showNotOnPR('An error occurred. Please try again.');
    }
  }

  // ============================================
  // STARTUP
  // ============================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
