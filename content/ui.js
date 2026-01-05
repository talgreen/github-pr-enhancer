/**
 * PR Enhancer - UI Module
 *
 * @fileoverview UI components, event handling, and DOM manipulation
 * @module ui
 */

window.PRSorter = window.PRSorter || {};

(function() {
  "use strict";

  const { SORT_OPTIONS, OCTICONS, state, createOcticon, safeQuery, safeQueryAll } = window.PRSorter.Core;
  const { getUnresolvedConversations } = window.PRSorter.Comments;
  const { applySorting, getSortLabel } = window.PRSorter.Sorting;

  // ==================================================================
function isConversationTab() {
  // Strategy 1: Check URL pathname for specific tabs
  const pathname = window.location.pathname;

  // If URL explicitly shows other tabs, return false
  // GitHub uses /changes for Files tab, /commits for Commits tab, /checks for Checks tab
  if (
    pathname.includes("/files") ||
    pathname.includes("/commits") ||
    pathname.includes("/changes") ||
    pathname.includes("/checks")
  ) {
    return false;
  }

  // Strategy 2: Check URL hash
  const hash = window.location.hash;
  if (hash) {
    // These hashes indicate we're NOT on conversation tab
    if (
      hash.includes("commits") ||
      hash.includes("checks") ||
      hash.includes("files") ||
      hash.includes("diff-")
    ) {
      return false;
    }
  }

  // Strategy 3: Check which content containers are VISIBLE
  // Files tab content
  const filesContainer = safeQuery(
    "#files, #files_bucket, .file-diff, .js-diff-progressive-container"
  );
  if (
    filesContainer &&
    filesContainer.offsetParent !== null &&
    filesContainer.offsetHeight > 0 &&
    filesContainer.offsetWidth > 0
  ) {
    return false;
  }

  // Commits tab content
  const commitsContainer = safeQuery(
    '.commits-list-item, .TimelineItem--condensed, [data-test-selector="pr-commits-list"]'
  );
  if (
    commitsContainer &&
    commitsContainer.offsetParent !== null &&
    commitsContainer.offsetHeight > 0 &&
    commitsContainer.offsetWidth > 0
  ) {
    // Make sure this is the commits tab, not timeline
    const isInTimeline = commitsContainer.closest(
      "#discussion_bucket, .discussion-timeline"
    );
    if (!isInTimeline) {
      return false;
    }
  }

  // Checks tab content
  const checksContainer = safeQuery(
    '.checks-list, [data-test-selector="checks-tab-content"]'
  );
  if (
    checksContainer &&
    checksContainer.offsetParent !== null &&
    checksContainer.offsetHeight > 0 &&
    checksContainer.offsetWidth > 0
  ) {
    return false;
  }

  // Strategy 4: Check if discussion bucket exists and is visible
  const discussionBucket = safeQuery("#discussion_bucket");
  if (!discussionBucket) {
    // If discussion bucket doesn't exist, we're definitely not on conversation tab
    return false;
  }

  const isVisible =
    discussionBucket.offsetParent !== null &&
    discussionBucket.offsetHeight > 0 &&
    discussionBucket.offsetWidth > 0;
  const hasVisibleClass =
    discussionBucket.classList.contains("is-visible") ||
    discussionBucket.classList.contains("show") ||
    !discussionBucket.classList.contains("d-none");

  if (isVisible && hasVisibleClass) {
    return true;
  }

  // Strategy 5: Check for PR tab navigation
  const prTabNav = safeQuery(".tabnav-tabs, .UnderlineNav-body");
  if (prTabNav) {
    // Look for selected tab with conversation indicators
    const selectedTab = prTabNav.querySelector(
      '[aria-current="page"], .selected, [aria-selected="true"]'
    );
    if (selectedTab) {
      const tabText = selectedTab.textContent.toLowerCase();
      const tabHref = selectedTab.getAttribute("href") || "";

      // Check if it's explicitly NOT conversation
      if (
        tabText.includes("file") ||
        tabText.includes("commit") ||
        tabText.includes("check") ||
        tabHref.includes("/files") ||
        tabHref.includes("/commits") ||
        tabHref.includes("/checks")
      ) {
        return false;
      }

      // Check if it's conversation
      if (
        tabText.includes("conversation") ||
        tabHref.endsWith("/pull/") ||
        !tabHref.includes("#")
      ) {
        return true;
      }
    }
  }

  // Default: return false (be conservative - don't show unless we're sure)
  return false;
}

/**
 * Check if SSO login is required
 * @returns {boolean} True if SSO login prompt is visible, false otherwise
 */
function isSSOLoginRequired() {
  // Check for common SSO/SAML login indicators
  const ssoIndicators = [
    ".sso-modal",
    "[data-sso-required]",
    ".auth-form-header",
    ".session-authentication",
    '[aria-label*="authenticate"]',
    '[aria-label*="SAML"]',
    ".saml-account-settings",
    ".js-sso-modal",
    '[data-target="sso-modal.dialog"]',
  ];

  for (const selector of ssoIndicators) {
    const element = safeQuery(selector);
    if (element && element.offsetParent !== null) {
      return true;
    }
  }

  // Check if page content is blocked/hidden indicating auth required
  const contentBlocked = safeQuery(
    '.blankslate:has([href*="login"]), .blankslate:has([href*="sso"])'
  );
  if (contentBlocked && contentBlocked.offsetParent !== null) {
    return true;
  }

  // Check for auth-related text in visible elements
  const bodyText = document.body.textContent.toLowerCase();
  const authPhrases = [
    "requires single sign-on",
    "sso authentication required",
    "authenticate to access",
  ];

  if (authPhrases.some((phrase) => bodyText.includes(phrase))) {
    // Verify there's actually a visible auth prompt
    const authPrompt = safeQuery(".flash, .flash-error, .blankslate");
    if (authPrompt && authPrompt.offsetParent !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Check if controls should be visible
 * @returns {boolean} True if controls should be visible
 */
function shouldShowControls() {
  return isConversationTab() && !isSSOLoginRequired();
}

// ============================================
// CONTROLS VISIBILITY
// ============================================

/**
 * Update the visibility of controls based on current tab and SSO status
 */
function updateControlsVisibility() {
  const controls = safeQuery(".pr-comment-sorter-controls");
  if (!controls) return;

  if (shouldShowControls()) {
    controls.style.display = "";
  } else {
    controls.style.display = "none";
  }
}

// ============================================
// INJECT CONTROLS
// ============================================

/**
 * Create and inject sort controls into the page
 * Uses Primer design patterns and Octicons
 */
function injectSortControls() {
  if (state.sortControlsInjected) {
    // Controls already injected, just update visibility
    updateControlsVisibility();
    return;
  }

  // Only inject on Conversation tab and when not SSO login required
  if (!shouldShowControls()) {
    return;
  }

  const targetLocations = [
    "#discussion_bucket",
    ".discussion-timeline",
    ".js-discussion",
    ".pull-discussion-timeline",
    '[data-target="diff-layout.mainContainer"]',
    ".repository-content",
    "main",
  ];

  let targetLocation = null;
  for (const selector of targetLocations) {
    targetLocation = safeQuery(selector);
    if (targetLocation) break;
  }

  if (!targetLocation) {
    setTimeout(injectSortControls, 1000);
    return;
  }

  const controls = document.createElement("div");
  controls.className = "pr-comment-sorter-controls";
  controls.setAttribute("data-extension", "pr-comment-sorter");
  controls.setAttribute("role", "region");
  controls.setAttribute("aria-label", "PR Enhancer Controls");

  // Get initial unresolved count
  const initialCount = safeQueryAll('details[data-resolved="false"]').length;

  controls.innerHTML = `
    <div class="pr-sorter-toolbar" role="toolbar" aria-label="Comment sorting and navigation" data-extension="pr-comment-sorter">
      <!-- Main toolbar row - unified controls -->
      <div class="pr-sorter-row" data-extension="pr-comment-sorter">
        <!-- Unresolved Conversations Button with dropdown wrapper -->
        <div class="pr-sorter-unresolved-wrapper" data-extension="pr-comment-sorter">
          <button
            type="button"
            class="pr-sorter-btn ${
              initialCount > 0
                ? "pr-sorter-btn--has-unresolved"
                : "pr-sorter-btn--all-resolved"
            }"
            id="pr-sorter-unresolved-btn"
            aria-label="View unresolved conversations"
            aria-haspopup="true"
            aria-expanded="false"
          >
            ${
              initialCount > 0
                ? createOcticon("issueOpened", 14)
                : createOcticon("checkCircle", 14)
            }
            <span class="pr-sorter-btn-text">${
              initialCount > 0 ? `${initialCount} Unresolved` : "All Resolved"
            }</span>
            ${
              initialCount > 0
                ? `<span class="pr-sorter-dropdown-arrow">${createOcticon(
                    "chevronDown",
                    12
                  )}</span>`
                : ""
            }
          </button>
          <!-- Dropdown will be inserted here -->
        </div>

        <!-- Divider -->
        <span class="pr-sorter-separator" aria-hidden="true"></span>

        <!-- Sort section -->
        <div class="pr-sorter-controls" role="group" aria-label="Sort comments">
          <button
            type="button"
            class="pr-sorter-btn active"
            data-sort="${SORT_OPTIONS.DATE_NEWEST}"
            aria-pressed="true"
          >
            ${createOcticon("history", 14)}
            Newest
          </button>
          <button
            type="button"
            class="pr-sorter-btn"
            data-sort="${SORT_OPTIONS.DATE_OLDEST}"
            aria-pressed="false"
          >
            ${createOcticon("clock", 14)}
            Oldest
          </button>
        </div>
      </div>
    </div>
  `;

  targetLocation.parentNode.insertBefore(controls, targetLocation);
  state.sortControlsInjected = true;

  setupEventListeners(controls);
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Set up event listeners for sort controls
 * @param {HTMLElement} controls - The controls container element
 */
function setupEventListeners(controls) {
  const unresolvedBtn = controls.querySelector("#pr-sorter-unresolved-btn");
  const sortBtns = controls.querySelectorAll(".pr-sorter-btn[data-sort]");

  // Unresolved button
  if (unresolvedBtn) {
    unresolvedBtn.addEventListener("click", () => {
      showUnresolvedConversations();
    });
  }

  // Sort buttons
  sortBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sortOption = btn.dataset.sort;
      // Update sort button states
      sortBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      applySorting(sortOption);
    });
  });

  // Keyboard support
  controls.querySelectorAll(".pr-sorter-btn").forEach((btn) => {
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });
  });
}

// ============================================
// SORT INDICATOR
// ============================================

/**
 * Update the visual indicator for current sort
 * @param {string} sortOption - The active sort option
 */
function updateSortIndicator(sortOption) {
  const sortBtns = document.querySelectorAll(".pr-sorter-btn[data-sort]");
  sortBtns.forEach((btn) => {
    const isActive = btn.dataset.sort === sortOption;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

// ============================================
// UNRESOLVED CONVERSATIONS UI
// ============================================

/**
 * Create and show the unresolved conversations list UI - SIMPLE VERSION
 */
function showUnresolvedConversations() {
  const wrapper = document.querySelector(".pr-sorter-unresolved-wrapper");
  const btn = document.getElementById("pr-sorter-unresolved-btn");
  const existingList = document.querySelector(".pr-sorter-unresolved-list");

  // Toggle off if already open
  if (existingList) {
    closeUnresolvedList();
    return;
  }

  const conversations = getUnresolvedConversations();
  if (conversations.length === 0) {
    showNotification("All conversations resolved!", "success");
    return;
  }

  // Create simple dropdown following Primer design
  let html = `<div class="pr-sorter-unresolved-list" data-extension="pr-comment-sorter">`;

  conversations.forEach((conv, i) => {
    html += `
      <div class="pr-sorter-item" data-index="${i}" data-extension="pr-comment-sorter">
        <div class="pr-sorter-item-username">@${conv.username}</div>
        <div class="pr-sorter-item-snippet">${conv.snippet || "(no preview)"}</div>
      </div>
    `;
  });

  html += `</div>`;

  // Append to body to escape stacking context, then position relative to button
  document.body.insertAdjacentHTML("beforeend", html);
  btn?.setAttribute("aria-expanded", "true");

  const dropdown = document.querySelector(".pr-sorter-unresolved-list");

  // Position dropdown relative to button
  if (dropdown && btn) {
    const btnRect = btn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${btnRect.bottom + 4}px`;
    dropdown.style.left = `${btnRect.left}px`;
  }

  // Add event listeners for each item
  dropdown.querySelectorAll(".pr-sorter-item").forEach((item, i) => {
    item.addEventListener("click", () => {
      closeUnresolvedList();
      const conv = conversations[i];
      conv.element.scrollIntoView({ behavior: "smooth", block: "center" });
      conv.element.classList.add("pr-sorter-highlight");
      setTimeout(
        () => conv.element.classList.remove("pr-sorter-highlight"),
        2000
      );
    });

    // Hover effect handled by CSS
  });

  // Click outside to close
  setTimeout(() => document.addEventListener("click", handleClickOutside), 0);

  // Close on scroll (since dropdown uses fixed positioning)
  const handleScroll = () => closeUnresolvedList();
  window.addEventListener("scroll", handleScroll, { once: true });
}

/**
 * Close the unresolved list dropdown
 */
function closeUnresolvedList() {
  const list = document.querySelector(".pr-sorter-unresolved-list");
  const btn = document.getElementById("pr-sorter-unresolved-btn");
  if (list) {
    list.remove();
    btn?.setAttribute("aria-expanded", "false");
  }
  document.removeEventListener("click", handleClickOutside);
}

/**
 * Handle clicks outside the dropdown to close it
 * (Internal function, not exported)
 */
function handleClickOutside(e) {
  const wrapper = document.querySelector(".pr-sorter-unresolved-wrapper");
  const dropdown = document.querySelector(".pr-sorter-unresolved-list");

  // Close if click is outside both the button wrapper and the dropdown
  const isOutsideWrapper = wrapper && !wrapper.contains(e.target);
  const isOutsideDropdown = dropdown && !dropdown.contains(e.target);

  if (isOutsideWrapper && isOutsideDropdown) {
    closeUnresolvedList();
  }
}

// ============================================
// UNRESOLVED BUTTON UPDATE
// ============================================

/**
 * Update the unresolved button state based on current count
 */
function updateUnresolvedButton() {
  const btn = document.getElementById("pr-sorter-unresolved-btn");
  if (!btn) return;

  const count = safeQueryAll('details[data-resolved="false"]').length;
  const textSpan = btn.querySelector(".pr-sorter-btn-text");
  const arrowSpan = btn.querySelector(".pr-sorter-dropdown-arrow");

  if (count > 0) {
    btn.classList.remove("pr-sorter-btn--all-resolved");
    btn.classList.add("pr-sorter-btn--has-unresolved");
    if (textSpan) textSpan.textContent = `${count} Unresolved`;
    // Update icon to issue-opened
    const svg = btn.querySelector("svg");
    if (svg) svg.outerHTML = createOcticon("issueOpened", 14);
    // Add arrow if not present
    if (!arrowSpan) {
      const arrow = document.createElement("span");
      arrow.className = "pr-sorter-dropdown-arrow";
      arrow.innerHTML = createOcticon("chevronDown", 12);
      btn.appendChild(arrow);
    }
  } else {
    btn.classList.remove("pr-sorter-btn--has-unresolved");
    btn.classList.add("pr-sorter-btn--all-resolved");
    if (textSpan) textSpan.textContent = "All Resolved";
    // Update icon to check-circle
    const svg = btn.querySelector("svg");
    if (svg) svg.outerHTML = createOcticon("checkCircle", 14);
    // Remove arrow
    if (arrowSpan) arrowSpan.remove();
    // Close dropdown if open
    closeUnresolvedList();
  }
}

// ============================================
// NOTIFICATION
// ============================================

/**
 * Show a temporary notification toast
 * @param {string} message - The message to display
 * @param {string} type - Type of notification ('success' or 'error')
 */
function showNotification(message, type = "success") {
  const existing = document.querySelector(".pr-sorter-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `pr-sorter-notification ${
    type === "error" ? "error" : ""
  }`;
  notification.setAttribute("role", "status");
  notification.setAttribute("aria-live", "polite");

  // Add check icon for success notifications
  const iconPath =
    type === "error"
      ? OCTICONS.alert
      : '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>';

  notification.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      ${iconPath}
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);

  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 2000);
}

// ============================================
// MERGE STATUS MANAGEMENT
// ============================================

/**
 * Move the merge status box to the top (only on Conversation tab)
 */
function moveMergeStatusToTop() {
  // Only move merge status on Conversation tab
  if (!isConversationTab()) {
    return;
  }

  const mergeBoxSelectors = [
    "#partial-pull-merging",
    ".merge-status-list",
    ".branch-action-state-container",
    ".merge-pr",
    ".js-merge-pr",
  ];

  let mergeBox = null;
  for (const selector of mergeBoxSelectors) {
    mergeBox = safeQuery(selector);
    if (mergeBox) break;
  }

  if (!mergeBox) {
    const mergeContainer =
      safeQuery(".merge-message") || safeQuery(".branch-action-body");
    if (mergeContainer) {
      mergeBox =
        mergeContainer.closest(".branch-action-item") || mergeContainer;
    }
  }

  if (!mergeBox || mergeBox.dataset.movedToTop === "true") return;

  const sortControls = safeQuery(".pr-comment-sorter-controls");

  if (sortControls && sortControls.parentNode) {
    // Store original position before moving
    const originalParent = mergeBox.parentNode;
    const originalNextSibling = mergeBox.nextSibling;

    // Store references as data attributes for restoration
    mergeBox.dataset.movedToTop = "true";
    mergeBox.dataset.originalParentId = originalParent?.id || '';

    // Store original sibling reference in a way we can retrieve it
    if (originalNextSibling) {
      // Give the sibling a temporary ID if it doesn't have one
      if (!originalNextSibling.id) {
        originalNextSibling.id = `pr-sorter-restore-marker-${Date.now()}`;
      }
      mergeBox.dataset.originalNextSiblingId = originalNextSibling.id;
    }

    // Move the merge box directly after sort controls
    sortControls.parentNode.insertBefore(mergeBox, sortControls.nextSibling);
  }
}

/**
 * Restore the merge status box to its original position
 */
function restoreMergeStatusPosition() {
  const mergeBox = safeQuery('[data-moved-to-top="true"]');

  if (!mergeBox) return;

  // Try to find original parent
  let originalParent = null;
  if (mergeBox.dataset.originalParentId) {
    originalParent = document.getElementById(mergeBox.dataset.originalParentId);
  }

  // If we can't find the original parent by ID, try to find it by common patterns
  if (!originalParent) {
    originalParent = safeQuery('#discussion_bucket') ||
                    safeQuery('.discussion-timeline') ||
                    document.body;
  }

  // Find the original next sibling
  let originalNextSibling = null;
  if (mergeBox.dataset.originalNextSiblingId) {
    originalNextSibling = document.getElementById(mergeBox.dataset.originalNextSiblingId);
  }

  // Restore to original position
  if (originalParent) {
    originalParent.insertBefore(mergeBox, originalNextSibling);
  }

  // Clean up data attributes
  delete mergeBox.dataset.movedToTop;
  delete mergeBox.dataset.originalParentId;
  delete mergeBox.dataset.originalNextSiblingId;
}

  // Export to global namespace
  window.PRSorter.UI = {
    isConversationTab,
    isSSOLoginRequired,
    shouldShowControls,
    updateControlsVisibility,
    injectSortControls,
    setupEventListeners,
    updateSortIndicator,
    updateUnresolvedButton,
    showUnresolvedConversations,
    closeUnresolvedList,
    showNotification,
    moveMergeStatusToTop,
    restoreMergeStatusPosition,
  };
})();
