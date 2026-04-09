(function () {
  var DATA_BASE = window.DATA_BASE || "";
  var tabs = document.querySelectorAll(".tabs button");
  var panels = document.querySelectorAll(".tab-panel");

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
    var updated = data.updated ? '<p class="updated">Updated: ' + escapeHtml(data.updated) + '</p>' : "";
    var count = '<p class="count-info">' + data.opportunities.length + ' opportunities from ' + escapeHtml(data.agency || "") + '</p>';
    panel.innerHTML = updated + count + data.opportunities.map(renderOpp).join("");
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
      .then(function (data) { renderPanel(panel, data); })
      .catch(function (err) {
        panel.classList.remove("loading");
        panel.innerHTML = '<p class="error">Failed to load: ' + escapeHtml(err.message) + '</p>';
      });
  }

  panels.forEach(loadPanel);
})();
