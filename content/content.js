/**
 * PR Enhancer - Content Script
 * Enhance your GitHub pull request workflow with smart features
 *
 * @fileoverview Content script that injects enhancement controls and manages PR interactions
 * @author PR Enhancer Contributors
 * @version 2.0.0
 * @license MIT
 *
 * Features:
 * - Sort comments by date (oldest/newest first)
 * - Track and navigate unresolved conversations
 * - Smooth FLIP animations for reordering
 * - Primer design system integration
 * - Full keyboard accessibility
 *
 * Chrome Extension Best Practices:
 * - Minimal DOM manipulation with batched operations
 * - Non-blocking operations using requestAnimationFrame
 * - Graceful error handling with user feedback
 * - Respects GitHub's existing UI and theme
 * - Debounced mutation observers
 *
 * @see https://primer.style/
 * @see https://developer.chrome.com/docs/extensions/mv3/
 */

(function () {
  "use strict";

  const { state, loadSavedPreference } = window.PRSorter.Core;
  const { getCommentContainers } = window.PRSorter.Comments;
  const { applySorting, toggleSort } = window.PRSorter.Sorting;
  const {
    injectSortControls,
    moveMergeStatusToTop,
    restoreMergeStatusPosition,
    updateControlsVisibility,
    updateUnresolvedButton,
    updateSortIndicator,
    isConversationTab,
  } = window.PRSorter.UI;

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the extension
   * Sets up controls, event listeners, and mutation observer
   */
  function init() {
    if (state.isInitialized) return;
    if (!window.location.pathname.includes("/pull/")) return;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }

    state.isInitialized = true;

    injectSortControls();

    // Check setting before moving merge status
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(['moveMergeStatus']).then((result) => {
        const shouldMove = result.moveMergeStatus !== false; // Default to true
        if (shouldMove) {
          setTimeout(moveMergeStatusToTop, 500);
        }
      }).catch(() => {
        // If storage fails, default to moving it
        setTimeout(moveMergeStatusToTop, 500);
      });
    } else {
      // If storage not available, default to moving it
      setTimeout(moveMergeStatusToTop, 500);
    }

    // Load saved preference and apply sorting
    loadSavedPreference().then((sortOption) => {
      const sortToApply = sortOption || state.currentSort; // Use saved or default
      updateSortIndicator(sortToApply);
      // Apply the sorting to the page
      setTimeout(() => {
        applySorting(sortToApply);
      }, 100);
    });

    setupMutationObserver();
    setupChromeMessageListener();
    setupHashChangeListener();

    console.log("[PR Enhancer] Extension initialized successfully");
  }

  /**
   * Handle URL hash changes (tab navigation)
   */
  function handleHashChange() {
    const isConv = isConversationTab();
    console.log("[PR Enhancer] Tab changed. isConversationTab:", isConv);
    updateControlsVisibility();
  }

  /**
   * Set up hash change listener for tab navigation
   */
  function setupHashChangeListener() {
    window.addEventListener("hashchange", handleHashChange);
  }

  /**
   * Set up mutation observer to handle DOM changes
   */
  function setupMutationObserver() {
    function handleMutations() {
      if (!document.querySelector(".pr-comment-sorter-controls")) {
        state.sortControlsInjected = false;
        injectSortControls();
      } else {
        // Update visibility when tabs change or SSO status changes
        updateControlsVisibility();
        // Update unresolved button state when conversations change
        updateUnresolvedButton();
      }

      // Only move merge status if on Conversation tab and not already done
      if (isConversationTab()) {
        const existingMergeBox = document.querySelector(
          '[data-moved-to-top="true"]'
        );
        if (!existingMergeBox && chrome?.storage?.sync) {
          // Check setting before moving
          chrome.storage.sync.get(['moveMergeStatus']).then((result) => {
            const shouldMove = result.moveMergeStatus !== false;
            if (shouldMove) {
              moveMergeStatusToTop();
            }
          }).catch(() => {
            // Default to moving on error
            moveMergeStatusToTop();
          });
        }
      }
    }

    const observer = new MutationObserver((mutations) => {
      // Ignore mutations from our own elements
      for (const mutation of mutations) {
        const target = mutation.target;
        if (
          target.closest &&
          target.closest(".pr-comment-sorter-controls, .pr-sorter-notification")
        ) {
          return;
        }
      }

      // Debounce to prevent rapid firing
      if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
      }
      state.debounceTimer = setTimeout(handleMutations, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Set up Chrome runtime message listener for popup communication
   */
  function setupChromeMessageListener() {
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          switch (request.action) {
            case "sort":
              applySorting(request.sortOption);
              sendResponse({ success: true });
              break;
            case "toggleSort":
              toggleSort();
              sendResponse({ success: true });
              break;
            case "getStatus":
              const containers = getCommentContainers();
              sendResponse({
                currentSort: state.currentSort,
                commentCount:
                  containers.timeline.length + containers.review.length,
                isOnPRPage: true,
              });
              break;
            case "updateMergeStatusPreference":
              // Handle preference update from popup
              if (request.shouldMove) {
                moveMergeStatusToTop();
              } else {
                restoreMergeStatusPosition();
              }
              sendResponse({ success: true });
              break;
            case "ping":
              sendResponse({ pong: true, initialized: state.isInitialized });
              break;
            default:
              sendResponse({ error: "Unknown action" });
          }
        } catch (e) {
          console.error("[PR Enhancer] Error handling message:", e);
          sendResponse({ error: e.message });
        }
        return true;
      });
    }
  }

  init();
})();
