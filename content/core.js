/**
 * PR Enhancer - Core Module
 *
 * @fileoverview Foundation module containing configuration, state management, and shared utilities
 * @module core
 */

// Create global namespace
window.PRSorter = window.PRSorter || {};

(function() {
  "use strict";

  // ============================================
  // CONFIGURATION CONSTANTS
  // ============================================

  /**
   * Available sort options for comments
   * @constant {Object.<string, string>}
   * @readonly
   */
  const SORT_OPTIONS = Object.freeze({
    DATE_OLDEST: "date-oldest",
    DATE_NEWEST: "date-newest",
    RESOLVED_LAST: "resolved-last",
    UNRESOLVED_LAST: "unresolved-last",
  });

  /**
   * Timing configuration for animations and debouncing
   * @constant {Object}
   * @readonly
   */
  const TIMING = Object.freeze({
    ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 2000,
    DEBOUNCE_DELAY: 300,
    MERGE_BOX_DELAY: 500,
    RETRY_DELAY: 1000,
  });

  /**
   * CSS selectors for finding GitHub elements
   * @constant {Object}
   * @readonly
   */
  const SELECTORS = Object.freeze({
    TIMELINE_ITEM: ".js-timeline-item",
    REVIEW_COMMENT: ".review-comment",
    COMMENT_GROUP: ".timeline-comment-group",
    RESOLVABLE_THREAD: ".js-resolvable-timeline-thread-container",
    MERGE_BOX:
      "#partial-pull-merging, .merge-status-list, .branch-action-state-container",
    DISCUSSION_BUCKET:
      "#discussion_bucket, .discussion-timeline, .js-discussion",
  });

  /**
   * Octicons SVG paths for consistent iconography
   * @see https://primer.style/octicons/
   */
  const OCTICONS = {
    // alert-fill - Warning/alert icon
    alert:
      '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.166.765-.002.002-.003.004-.001.003L1.536 13.2a.25.25 0 0 0 .22.3h12.49a.25.25 0 0 0 .22-.3L8.384 1.82l-.001-.003-.003-.004-.002-.002a.25.25 0 0 0-.456 0ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
    // issue-opened - Open/unresolved icon
    issueOpened:
      '<path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>',
    // check-circle-fill - Resolved/success icon
    checkCircle:
      '<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.751.751 0 0 0-1.042-.018.751.751 0 0 0-.018 1.042L8.94 9.25 6.75 7.06a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2.5 2.5a.75.75 0 0 0 1.06 0Z"/>',
    // sort-desc - Sort descending (newest first) icon
    sortDesc:
      '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25ZM3.5 4h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5ZM3.5 7.5h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Zm0 3.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Z"/>',
    // sort-asc - Sort ascending (oldest first) icon
    sortAsc:
      '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25ZM3.5 4h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Zm0 3.5h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Zm0 3.5h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5Z"/>',
    // clock - Time/oldest first icon
    clock:
      '<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>',
    // history - Newest first icon
    history:
      '<path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 .75-.75Z"/>',
    // sync - Reset/refresh icon
    sync: '<path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"/>',
    // chevron-down - Collapse icon
    chevronDown:
      '<path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"/>',
    // x - Close icon
    x: '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 0-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>',
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Internal state variables
   */
  let _currentSort = SORT_OPTIONS.DATE_NEWEST;
  let _sortControlsInjected = false;
  let _isInitialized = false;
  let _debounceTimer = null;

  /**
   * State object with getters and setters for controlled access
   * Centralizes all extension state in one place
   */
  const state = {
    get currentSort() {
      return _currentSort;
    },
    set currentSort(value) {
      _currentSort = value;
    },

    get sortControlsInjected() {
      return _sortControlsInjected;
    },
    set sortControlsInjected(value) {
      _sortControlsInjected = value;
    },

    get isInitialized() {
      return _isInitialized;
    },
    set isInitialized(value) {
      _isInitialized = value;
    },

    get debounceTimer() {
      return _debounceTimer;
    },
    set debounceTimer(value) {
      _debounceTimer = value;
    },
  };

  // ============================================
  // DOM UTILITY FUNCTIONS
  // ============================================

  /**
   * Safely query the DOM with error handling
   * Prevents extension crashes from invalid selectors
   *
   * @param {string} selector - CSS selector to query
   * @param {Element|Document} [context=document] - Context element for the query
   * @returns {Element|null} The found element or null if not found/error
   */
  function safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      console.warn(`[PR Enhancer] Invalid selector: ${selector}`);
      return null;
    }
  }

  /**
   * Safely query all matching elements with error handling
   *
   * @param {string} selector - CSS selector to query
   * @param {Element|Document} [context=document] - Context element for the query
   * @returns {Element[]} Array of found elements (empty array on error)
   */
  function safeQueryAll(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (e) {
      console.warn(`[PR Enhancer] Invalid selector: ${selector}`);
      return [];
    }
  }

  /**
   * Create an SVG element with the given Octicon
   * @param {string} iconName - Name of the icon from OCTICONS
   * @param {number} size - Size of the icon (default: 16)
   * @returns {string} SVG markup
   */
  function createOcticon(iconName, size = 16) {
    const path = OCTICONS[iconName] || "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${path}</svg>`;
  }

  // ============================================
  // STORAGE UTILITIES
  // ============================================

  /**
   * Save preference to storage
   * @param {string} sortOption - The sort option to save
   */
  function savePreference(sortOption) {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ sortPreference: sortOption }).catch(() => {
        try {
          localStorage.setItem("pr-sorter-preference", sortOption);
        } catch (e) {
          // Silently fail if storage is unavailable
        }
      });
    }
  }

  /**
   * Load saved preferences (dead code removed)
   * Returns a promise that resolves with the loaded sort preference
   * Note: Caller should update UI indicators after this completes
   */
  function loadSavedPreference() {
    if (chrome?.storage?.sync) {
      return chrome.storage.sync
        .get(["sortPreference"])
        .then((result) => {
          if (
            result.sortPreference &&
            Object.values(SORT_OPTIONS).includes(result.sortPreference)
          ) {
            state.currentSort = result.sortPreference;
            return state.currentSort;
          }
          return null;
        })
        .catch(() => {
          // Silently fail if storage is unavailable
          return null;
        });
    }
    return Promise.resolve(null);
  }

  // Export to global namespace
  window.PRSorter.Core = {
    SORT_OPTIONS,
    TIMING,
    SELECTORS,
    OCTICONS,
    state,
    safeQuery,
    safeQueryAll,
    createOcticon,
    savePreference,
    loadSavedPreference,
  };
})();
