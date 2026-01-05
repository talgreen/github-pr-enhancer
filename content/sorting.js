/**
 * PR Enhancer - Sorting Module
 *
 * @fileoverview Sorting algorithms, DOM reordering, and state persistence
 * @module sorting
 */

window.PRSorter = window.PRSorter || {};

(function() {
  "use strict";

  const { SORT_OPTIONS, state, savePreference, safeQuery } = window.PRSorter.Core;
  const { isCommentResolved } = window.PRSorter.Comments;

  // Will be available after ui.js loads
  let updateSortIndicator, showNotification;

  // Initialize UI function references after ui.js loads
  setTimeout(() => {
    if (window.PRSorter.UI) {
      updateSortIndicator = window.PRSorter.UI.updateSortIndicator;
      showNotification = window.PRSorter.UI.showNotification;
    }
  }, 0);

  // ============================================
  // SORTING LOGIC
  // ============================================

  function sortComments(comments, sortOption) {
    const validComments = comments.filter(Boolean);
    const sortFunctions = {
      [SORT_OPTIONS.DATE_OLDEST]: (a, b) => a.timestamp - b.timestamp,
      [SORT_OPTIONS.DATE_NEWEST]: (a, b) => b.timestamp - a.timestamp,
    };
    return [...validComments].sort(
      sortFunctions[sortOption] || sortFunctions[SORT_OPTIONS.DATE_OLDEST]
    );
  }

  function reorderElements(sortedElements, container) {
    if (!sortedElements || sortedElements.length === 0 || !container) return;
    sortedElements.forEach((el) => {
      if (el) container.appendChild(el);
    });
  }

  function applySorting(sortOption) {
    state.currentSort = sortOption;
    savePreference(sortOption);

    const container = safeQuery(".js-discussion");
    if (!container) {
      console.warn("[PR Enhancer] Could not find .js-discussion container");
      return;
    }

    const children = Array.from(container.children);
    if (children.length === 0) return;

    const sortedChildren = children.sort((a, b) => {
      const timeA = a.querySelector("relative-time, time");
      const timeB = b.querySelector("relative-time, time");
      const dateA = timeA ? new Date(timeA.getAttribute("datetime") || 0) : new Date(0);
      const dateB = timeB ? new Date(timeB.getAttribute("datetime") || 0) : new Date(0);

      switch (sortOption) {
        case SORT_OPTIONS.DATE_NEWEST:
          return dateB - dateA;
        case SORT_OPTIONS.DATE_OLDEST:
          return dateA - dateB;
        case SORT_OPTIONS.RESOLVED_LAST:
          const resolvedA = isCommentResolved(a);
          const resolvedB = isCommentResolved(b);
          if (resolvedA !== resolvedB) return resolvedA ? 1 : -1;
          return dateA - dateB;
        case SORT_OPTIONS.UNRESOLVED_LAST:
          const unresolvedA = !isCommentResolved(a);
          const unresolvedB = !isCommentResolved(b);
          if (unresolvedA !== unresolvedB) return unresolvedA ? -1 : 1;
          return dateA - dateB;
        default:
          return dateA - dateB;
      }
    });

    reorderElements(sortedChildren, container);

    if (updateSortIndicator) updateSortIndicator(sortOption);
    if (showNotification) {
      showNotification(`Comments sorted: ${getSortLabel(sortOption)}`);
    }
  }

  function toggleSort() {
    const options = Object.values(SORT_OPTIONS);
    const currentIndex = options.indexOf(state.currentSort);
    const nextIndex = (currentIndex + 1) % options.length;
    applySorting(options[nextIndex]);
  }

  function getSortLabel(sortOption) {
    const labels = {
      [SORT_OPTIONS.DATE_OLDEST]: "Oldest first",
      [SORT_OPTIONS.DATE_NEWEST]: "Newest first",
    };
    return labels[sortOption] || sortOption;
  }

  // Export to global namespace
  window.PRSorter.Sorting = {
    sortComments,
    reorderElements,
    applySorting,
    toggleSort,
    getSortLabel,
  };
})();
