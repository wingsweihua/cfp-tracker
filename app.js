(function () {
  var DATA_BASE = window.DATA_BASE || "";
  var tabs = document.querySelectorAll(".tabs button");
  var panels = document.querySelectorAll(".tab-panel");
  var sortBtns = document.querySelectorAll(".sort-btn");

  // Store loaded data per panel id for re-sorting
  var panelData = {};
  var currentSort = "open_date";
  var RELEVANCE_TOPICS = ["AI", "Transportation", "Health", "Spatiotemporal"];

  // ── Tab switching ──
  function switchTab(id) {
    tabs.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === id);
    });
    panels.forEach(function (p) {
      p.classList.toggle("active", p.id === id);
    });
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(btn.getAttribute("data-tab"));
    });
  });

  // ── Sort switching ──
  sortBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      sortBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentSort = btn.getAttribute("data-sort");
      // Re-render all panels with new sort
      panels.forEach(function (panel) {
        var data = panelData[panel.id];
        if (data) renderPanel(panel, data);
      });
    });
  });

  // ── Helpers ──
  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function statusBadge(status) {
    var s = (status || "").toLowerCase();
    if (s === "posted") return '<span class="badge badge-open">Open</span>';
    if (s === "forecasted") return '<span class="badge badge-forecast">Forecasted</span>';
    if (s === "closed") return '<span class="badge badge-closed">Closed</span>';
    return '<span class="badge">' + escapeHtml(status) + '</span>';
  }

  function sortOpportunities(opps, sortKey) {
    var sorted = opps.slice(); // copy
    if (sortKey === "open_date" || sortKey === "close_date") {
      sorted.sort(function (a, b) {
        var da = a[sortKey] || "";
        var db = b[sortKey] || "";
        return db.localeCompare(da); // desc: newest first
      });
    } else if (RELEVANCE_TOPICS.indexOf(sortKey) !== -1) {
      sorted.sort(function (a, b) {
        var sa = (a.relevance && a.relevance[sortKey]) || 0;
        var sb = (b.relevance && b.relevance[sortKey]) || 0;
        return sb - sa; // desc: most relevant first
      });
    }
    return sorted;
  }

  function renderRelevanceTags(opp) {
    var rel = opp.relevance;
    if (!rel) return "";
    var html = '<div class="relevance-tags">';
    RELEVANCE_TOPICS.forEach(function (topic) {
      var score = rel[topic] || 0;
      var cls = "rel-tag";
      if (score >= 3) cls += " high";
      else if (score === 0) cls += " zero";
      html += '<span class="' + cls + '">' + escapeHtml(topic) + ': ' + score + '</span>';
    });
    html += '</div>';
    return html;
  }

  function renderOpp(opp) {
    var desc = opp.description || "";
    var hasDesc = desc.length > 0;
    var html = '<div class="opp-card">';
    html += '<h3><a href="' + escapeHtml(opp.link) + '" target="_blank" rel="noopener">' + escapeHtml(opp.title) + '</a></h3>';
    html += '<div class="opp-meta">';
    if (opp.opp_number) html += '<span>ID: ' + escapeHtml(opp.opp_number) + '</span>';
    if (opp.agency) html += '<span>' + escapeHtml(opp.agency) + '</span>';
    if (opp.open_date) html += '<span>Open: ' + escapeHtml(opp.open_date) + '</span>';
    if (opp.close_date) html += '<span>Close: ' + escapeHtml(opp.close_date) + '</span>';
    html += statusBadge(opp.status);
    html += '</div>';
    html += renderRelevanceTags(opp);
    if (hasDesc) {
      html += '<div class="opp-description collapsed">' + escapeHtml(desc) + '</div>';
    }
    html += '<div class="opp-actions">';
    html += '<a class="btn btn-outline" href="' + escapeHtml(opp.link) + '" target="_blank" rel="noopener">View on Grants.gov</a>';
    html += '</div></div>';
    return html;
  }

  function renderPanel(panel, data) {
    if (!data || !data.opportunities || data.opportunities.length === 0) {
      panel.innerHTML = '<p class="error">No opportunities found.</p>';
      panel.classList.remove("loading");
      return;
    }
    var sorted = sortOpportunities(data.opportunities, currentSort);
    var sortLabel = currentSort;
    var updated = data.updated ? '<p class="updated">Updated: ' + escapeHtml(data.updated) + ' · Sorted by: ' + escapeHtml(sortLabel) + '</p>' : "";
    var count = '<p class="count-info">' + data.opportunities.length + ' opportunities from ' + escapeHtml(data.agency || "") + '</p>';
    panel.innerHTML = updated + count + sorted.map(renderOpp).join("");
    panel.classList.remove("loading");
    // Click to expand description
    panel.querySelectorAll(".opp-description.collapsed").forEach(function (el) {
      el.addEventListener("click", function () {
        el.classList.remove("collapsed");
      });
    });
  }

  function loadPanel(panel) {
    var source = panel.getAttribute("data-source");
    if (!source) return;
    var url = DATA_BASE + "data/" + source;
    panel.classList.add("loading");
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(function (data) {
        panelData[panel.id] = data; // cache for re-sorting
        renderPanel(panel, data);
      })
      .catch(function (err) {
        panel.classList.remove("loading");
        panel.innerHTML = '<p class="error">Failed to load: ' + escapeHtml(err.message) + '</p>';
      });
  }

  panels.forEach(loadPanel);
})();
