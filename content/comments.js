/**
 * PR Enhancer - Comments Module
 *
 * @fileoverview Comment detection, extraction, and resolution checking
 * @module comments
 */

window.PRSorter = window.PRSorter || {};

(function() {
  "use strict";

  const { safeQuery, safeQueryAll } = window.PRSorter.Core;

  // ============================================
  // COMMENT RESOLUTION DETECTION
  // ============================================

  /**
   * Determine if a comment thread is resolved
   */
  function isCommentResolved(element) {
    const unresolvedThread = element.querySelector(
      'details[data-resolved="false"]'
    );
    return !unresolvedThread;
  }

  /**
   * Get all review thread containers
   */
  function getReviewThreads() {
    let threads = safeQueryAll(".js-resolvable-timeline-thread-container");

    if (threads.length === 0) {
      threads = safeQueryAll(
        [
          ".review-thread-component",
          ".timeline-comment-group:has(.review-comment)",
          ".review-thread",
          '[data-gid^="RC_"]',
        ].join(", ")
      );
    }

    const resolveButtons = safeQueryAll("button");
    const threadsByButton = new Set();

    resolveButtons.forEach((btn) => {
      const text = btn.textContent.trim().toLowerCase();
      if (
        text === "resolve conversation" ||
        text === "unresolve conversation"
      ) {
        const threadContainer = btn.closest(
          ".js-resolvable-timeline-thread-container, " +
            ".js-timeline-item, " +
            ".timeline-comment-group, " +
            ".review-thread-component, " +
            ".TimelineItem"
        );
        if (threadContainer) {
          threadsByButton.add(threadContainer);
        }
      }
    });

    const allThreads = new Set([...threads, ...threadsByButton]);
    return Array.from(allThreads);
  }

  /**
   * Get all comment containers from the PR page
   */
  function getCommentContainers() {
    const timelineComments = safeQueryAll(".js-timeline-item");
    const reviewComments = safeQueryAll(".review-comment");
    const discussionComments = safeQueryAll(".timeline-comment-group");

    return {
      timeline: timelineComments.filter((el) =>
        el.querySelector("relative-time, time")
      ),
      review: reviewComments,
      discussion: discussionComments,
    };
  }

  /**
   * Extract comment data from a comment element
   */
  function extractCommentData(element, index) {
    if (!element) return null;

    try {
      const timeElement = element.querySelector("relative-time, time");
      let timestamp;

      if (timeElement) {
        const datetime = timeElement.getAttribute("datetime");
        timestamp = datetime ? new Date(datetime) : new Date();
      } else {
        timestamp = new Date(Date.now() + index);
      }

      let resolved = false;
      try {
        resolved = isCommentResolved(element);
      } catch (e) {
        resolved = false;
      }

      return {
        element,
        timestamp,
        resolved,
        hasTimeElement: !!timeElement,
      };
    } catch (e) {
      console.warn("[PR Enhancer] Error extracting comment data:", e, element);
      return {
        element,
        timestamp: new Date(Date.now() + index),
        resolved: false,
        hasTimeElement: false,
      };
    }
  }

  /**
   * Get all unresolved conversations
   */
  function getUnresolvedConversations() {
    const unresolvedDetails = safeQueryAll('details[data-resolved="false"]');
    return unresolvedDetails.map((details, index) => {
      const container = details;
      const authorEl = details.querySelector(".author, .js-author");
      const username = authorEl ? authorEl.textContent.trim() : "Unknown";

      const bodyEl = details.querySelector(".comment-body");
      let snippet = bodyEl
        ? bodyEl.textContent.trim().replace(/\s+/g, " ")
        : "";
      if (snippet.length > 60) snippet = snippet.substring(0, 60) + "...";

      return {
        element: container,
        username,
        snippet,
        id: container.id || `unresolved-${index}`,
      };
    });
  }

  // Export to global namespace
  window.PRSorter.Comments = {
    isCommentResolved,
    getReviewThreads,
    getCommentContainers,
    extractCommentData,
    getUnresolvedConversations,
  };
})();
