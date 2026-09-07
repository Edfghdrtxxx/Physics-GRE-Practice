/* ==========================================================================
   Interactive Formula Visualizer Engine — Physics GRE Prep Studio
   Master Suite for Formula Retention & Deep Comprehension
   ========================================================================== */
window.PGRE = window.PGRE || {};
window.PGRE.visualizers = window.PGRE.visualizers || {};

(function() {
  var activeModal = null;
  var modalAnimId = null;
  var currentViz = null;
  var currentState = null;

  // Active inline visualizer in the study/flip card view
  var inlineAnimId = null;
  var activeInlineContainer = null;
  var activeInlineViz = null;
  var activeInlineState = null;

  // Off-canvas legend strip (shared by modal + inline). Draw bodies append
  // sections via PGRE.appendVizLegend; they must not paint overlay HUDs.
  window.PGRE._vizLegendSections = [];
  window.PGRE.resetVizLegend = function() {
    window.PGRE._vizLegendSections = [];
  };
  window.PGRE.appendVizLegend = function(title, rows) {
    window.PGRE._vizLegendSections = window.PGRE._vizLegendSections || [];
    window.PGRE._vizLegendSections.push({ title: title || "", rows: rows || [] });
  };
  window.PGRE.setVizLegend = function(title, rows) {
    window.PGRE._vizLegendSections = [{ title: title || "", rows: rows || [] }];
  };

  var LEGEND_REPAINT_MIN_MS = 120;

  function paintLegendStrip(strip, force) {
    if (!strip) return;
    var sections = window.PGRE._vizLegendSections || [];
    var nonempty = sections.filter(function(sec) {
      return (sec.title && String(sec.title).length) || (sec.rows && sec.rows.length);
    });
    if (!nonempty.length) {
      strip.innerHTML = "";
      strip.hidden = true;
      strip._lastHtml = "";
      return;
    }
    strip.hidden = false;
    var html = "";
    nonempty.forEach(function(sec) {
      html += "<div class=\"viz-legend-section\">";
      if (sec.title) html += "<div class=\"viz-legend-title\">" + esc(sec.title) + "</div>";
      html += "<div class=\"viz-legend-rows\">";
      (sec.rows || []).forEach(function(row) {
        var label = row.label || "";
        var value = row.value != null ? row.value : (row.val != null ? row.val : "");
        html += "<div class=\"viz-legend-row\">";
        html += "<span class=\"viz-legend-label\">" + esc(label) + "</span>";
        html += "<span class=\"viz-legend-value\">" + esc(value) + "</span>";
        html += "</div>";
      });
      html += "</div></div>";
    });
    if (strip._lastHtml === html) return;
    var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    if (!force && strip._lastPaintAt && (now - strip._lastPaintAt) < LEGEND_REPAINT_MIN_MS) {
      // Mid-throttle: defer one trailing repaint so the final value still lands.
      if (!strip._pendingPaint) {
        strip._pendingPaint = setTimeout(function() {
          strip._pendingPaint = null;
          paintLegendStrip(strip, true);
        }, LEGEND_REPAINT_MIN_MS);
      }
      return;
    }
    strip._lastPaintAt = now;
    strip.innerHTML = html;
    strip._lastHtml = html;
    typeset(strip);
  }

  // --- Helpers ---
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function typeset(el) {
    if (!el) return;
    if (window.PGRE && window.PGRE.typesetMath) {
      window.PGRE.typesetMath(el);
    } else if (typeof renderMathInElement === "function") {
      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }
  }

  function formatDisplayMath(tex) {
    if (!tex) return "";
    var s = String(tex).trim();
    if ((s.startsWith("$$") && s.endsWith("$$")) || (s.startsWith("\\[") && s.endsWith("\\]"))) {
      return s;
    }
    var singleDollarMatch = s.match(/^\$([^$]+)\$$/);
    if (singleDollarMatch) {
      return "$$" + singleDollarMatch[1].trim() + "$$";
    }
    if (s.includes("$")) {
      return s;
    }
    return "$$" + s + "$$";
  }

  function formatInlineMath(tex) {
    if (!tex) return "";
    var s = String(tex).trim();
    if (s.includes("$") || s.includes("\\(") || s.includes("\\[")) {
      return s;
    }
    if (/[\\=]/.test(s) || (/^[a-zA-Z0-9_^*+-/=<>\s,.:;()]+$/.test(s) && /[=<>]/.test(s))) {
      return "$" + s + "$";
    }
    return s;
  }

  function formatDerivations(steps) {
    if (!steps || !steps.length) return "<p>Derivation details available in formula reference.</p>";
    return steps.map(function(s, idx) {
      if (typeof s === "string") return "<li>" + s + "</li>";
      var title = s.title || ("Step " + (s.step || (idx + 1)));
      var formula = s.formula || s.latex;
      var text = s.text || s.explanation || s.description || "";
      var h = "<li class=\"viz-step-item\">";
      h += "<strong>" + esc(title) + "</strong>";
      if (formula) h += "<div class=\"viz-step-math\">" + formatDisplayMath(formula) + "</div>";
      if (text) h += "<div class=\"viz-step-desc\">" + text + "</div>";
      h += "</li>";
      return h;
    }).join("");
  }

  function formatLimitingCases(limits) {
    if (!limits || !limits.length) return "<p>Standard physical limits apply.</p>";
    return limits.map(function(l) {
      if (typeof l === "string") return "<li class=\"viz-limit-item\">" + formatInlineMath(l) + "</li>";
      var name = l.name || l.case || "";
      var cond = l.condition || "";
      var formula = l.result || l.formula || l.implication;
      var text = l.explanation || l.description || "";

      var head = "";
      if (name && cond && name !== cond) {
        var cleanCond = cond.trim();
        var alreadyInName = name.indexOf(cleanCond) !== -1 ||
          (name.indexOf("$") !== -1 && name.toLowerCase().replace(/[\s\\]/g, "").indexOf(cleanCond.toLowerCase().replace(/[\s\\]/g, "")) !== -1);
        head = "<strong>" + esc(formatInlineMath(name)) + "</strong>";
        if (!alreadyInName) {
          head += " <span class=\"viz-limit-cond\">(" + esc(formatInlineMath(cond)) + ")</span>";
        }
      } else {
        var title = name || cond || "Limiting Case";
        head = "<strong>" + esc(formatInlineMath(title)) + "</strong>";
      }

      var h = "<li class=\"viz-limit-item\">";
      h += "<div class=\"viz-limit-head\">" + head + "</div>";
      if (formula) h += "<div class=\"viz-limit-math\">" + formatDisplayMath(formula) + "</div>";
      if (text) h += "<div class=\"viz-limit-desc\">" + text + "</div>";
      h += "</li>";
      return h;
    }).join("");
  }

  function formatTraps(traps) {
    if (!traps || !traps.length) return "<p>No specific exam traps documented.</p>";
    return traps.map(function(t, idx) {
      if (typeof t === "string") {
        return "<div class=\"viz-trap-card\"><div class=\"viz-trap-title\">Exam Pitfall " + (idx + 1) + "</div><div class=\"viz-trap-body\">" + t + "</div></div>";
      }
      var title = t.trap || t.title || ("Exam Pitfall " + (idx + 1));
      var warning = t.warning || t.description || "";
      var strategy = t.strategy || t.tip || t.proTip || t.fix || "";
      var h = "<div class=\"viz-trap-card\">";
      h += "<div class=\"viz-trap-title\">" + esc(title) + "</div>";
      if (warning) h += "<div class=\"viz-trap-warning\"><strong>Common Pitfall:</strong> " + warning + "</div>";
      if (strategy) h += "<div class=\"viz-trap-strategy\"><strong>Exam Strategy:</strong> " + strategy + "</div>";
      h += "</div>";
      return h;
    }).join("");
  }

  function formatFormulaBanner(formulaLatex) {
    if (!formulaLatex) return "";
    return "<div class=\"viz-formula-banner\">" + formatDisplayMath(formulaLatex) + "</div>";
  }

  window.PGRE.formatInlineMath = formatInlineMath;
  window.PGRE.formatDisplayMath = formatDisplayMath;
  window.PGRE.formatLimitingCases = formatLimitingCases;
  window.PGRE.formatDerivations = formatDerivations;

  function lookupFormulaCard(cardId) {
    if (!cardId) return null;
    if (window.PGRE && typeof window.PGRE.getFormulaCard === "function") {
      var c0 = window.PGRE.getFormulaCard(cardId);
      if (c0) return c0;
    }
    if (window.PGRE && window.PGRE.views && window.PGRE.views.formulas) {
      if (typeof window.PGRE.views.formulas.getCard === "function") {
        var c1 = window.PGRE.views.formulas.getCard(cardId);
        if (c1) return c1;
      }
      if (typeof window.PGRE.views.formulas.getDeck === "function") {
        var d1 = window.PGRE.views.formulas.getDeck();
        if (Array.isArray(d1)) {
          for (var i = 0; i < d1.length; i++) {
            if (d1[i] && d1[i].id === cardId) return d1[i];
          }
        }
      }
    }
    if (window.PGRE && Array.isArray(window.PGRE.deck)) {
      for (var i = 0; i < window.PGRE.deck.length; i++) {
        if (window.PGRE.deck[i] && window.PGRE.deck[i].id === cardId) return window.PGRE.deck[i];
      }
    }
    if (window.PGRE && Array.isArray(window.PGRE.BOOK_FORMULAS)) {
      for (var i = 0; i < window.PGRE.BOOK_FORMULAS.length; i++) {
        if (window.PGRE.BOOK_FORMULAS[i] && window.PGRE.BOOK_FORMULAS[i].id === cardId) return window.PGRE.BOOK_FORMULAS[i];
      }
    }
    if (window.PGRE && Array.isArray(window.PGRE.FORMULAS)) {
      for (var i = 0; i < window.PGRE.FORMULAS.length; i++) {
        if (window.PGRE.FORMULAS[i] && window.PGRE.FORMULAS[i].id === cardId) return window.PGRE.FORMULAS[i];
      }
    }
    if (window.PGRE && window.PGRE.dataFormulas) {
      var df = window.PGRE.dataFormulas;
      var arr = Array.isArray(df) ? df : (df.deck || df.FORMULAS || df.cards);
      if (Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].id === cardId) return arr[i];
        }
      }
    }
    if (window.PGRE && Array.isArray(window.PGRE.allFormulaCards)) {
      for (var i = 0; i < window.PGRE.allFormulaCards.length; i++) {
        if (window.PGRE.allFormulaCards[i] && window.PGRE.allFormulaCards[i].id === cardId) return window.PGRE.allFormulaCards[i];
      }
    }
    if (window.PGRE && window.PGRE.visualizers && window.PGRE.visualizers[cardId]) {
      var vz = window.PGRE.visualizers[cardId];
      return {
        id: cardId,
        topic: vz.topic || "cm",
        name: vz.title || cardId,
        front: vz.physicalStory || vz.title || cardId,
        back: vz.formulaLatex || "",
        note: vz.note || "",
        eq: vz.eq || ""
      };
    }
    return null;
  }

  function buildControls(paramsContainer, viz, state, onParamChange) {
    paramsContainer.innerHTML = "";
    if (!viz.parameters || !viz.parameters.length) return;

    viz.parameters.forEach(function(p) {
      var paramId = p.id;
      var label = p.label || p.name || paramId;
      var type = p.type || (p.options ? "select" : "range");

      if (state[paramId] === undefined) {
        state[paramId] = p.default !== undefined ? p.default : (p.min !== undefined ? p.min : (p.options ? p.options[0] : 0));
      }

      var row = document.createElement("div");
      row.className = "viz-param-row";

      if (type === "select" && p.options) {
        var optsHTML = p.options.map(function(opt) {
          var val = typeof opt === "object" && opt.value !== undefined ? opt.value : opt;
          var lbl = typeof opt === "object" && opt.label !== undefined ? opt.label : opt;
          var sel = String(state[paramId]) === String(val) ? " selected" : "";
          return "<option value=\"" + esc(val) + "\"" + sel + ">" + esc(lbl) + "</option>";
        }).join("");

        row.innerHTML = "" +
          "<div class=\"viz-param-header\"><span class=\"viz-param-label\">" + esc(label) + "</span></div>" +
          "<select class=\"viz-param-select\" id=\"viz-ctrl-" + paramId + "\">" + optsHTML + "</select>";
        paramsContainer.appendChild(row);

        var selEl = row.querySelector("select");
        selEl.addEventListener("change", function() {
          var val = selEl.value;
          state[paramId] = val;
          if (onParamChange) onParamChange(paramId, val);
        });
      } else if (type === "toggle" || type === "boolean") {
        var isChecked = Boolean(state[paramId]);
        row.innerHTML = "" +
          "<button type=\"button\" class=\"viz-toggle-btn" + (isChecked ? " active" : "") + "\" id=\"viz-ctrl-" + paramId + "\">" +
            "<span>" + esc(label) + "</span>" +
            "<span>" + (isChecked ? "ON" : "OFF") + "</span>" +
          "</button>";
        paramsContainer.appendChild(row);

        var btn = row.querySelector("button");
        btn.addEventListener("click", function() {
          var newVal = !state[paramId];
          state[paramId] = newVal;
          btn.classList.toggle("active", newVal);
          btn.querySelectorAll("span")[1].textContent = newVal ? "ON" : "OFF";
          if (onParamChange) onParamChange(paramId, newVal);
        });
      } else {
        // Slider / Range
        var min = p.min !== undefined ? p.min : 0;
        var max = p.max !== undefined ? p.max : 100;
        var step = p.step !== undefined ? p.step : 1;
        var unit = p.unit ? (" " + p.unit) : "";
        var curVal = state[paramId];

        row.innerHTML = "" +
          "<div class=\"viz-param-header\">" +
            "<span class=\"viz-param-label\">" + esc(label) + "</span>" +
            "<span class=\"viz-param-val\" id=\"viz-val-" + paramId + "\">" + curVal + unit + "</span>" +
          "</div>" +
          "<input type=\"range\" class=\"viz-param-slider\" id=\"viz-ctrl-" + paramId + "\" min=\"" + min + "\" max=\"" + max + "\" step=\"" + step + "\" value=\"" + curVal + "\">";
        paramsContainer.appendChild(row);

        var slider = row.querySelector("input");
        slider.addEventListener("input", function() {
          var numVal = parseFloat(slider.value);
          state[paramId] = numVal;
          var valBadge = row.querySelector("#viz-val-" + paramId);
          if (valBadge) valBadge.textContent = numVal + unit;
          if (onParamChange) onParamChange(paramId, numVal);
        });
      }
    });
    typeset(paramsContainer);
  }

  // --- INLINE VISUALIZER (Embeds directly inside flashcard back on "Show answer") ---
  window.PGRE.renderInlineVisualizer = function(cardId, containerEl) {
    window.PGRE.teardownInlineVisualizer();
    if (!containerEl) return;

    var viz = window.PGRE.visualizers[cardId];
    if (!viz) return;

    var wrap = document.createElement("div");
    wrap.className = "viz-inline-container";
    wrap.id = "viz-inline-container";

    var derivationItems = formatDerivations(viz.derivationSteps);
    var limitItems = formatLimitingCases(viz.limitingCases);
    var trapItems = formatTraps(viz.greTraps);

    var challengeHTML = "";
    if (viz.challenge) {
      var optHTML = viz.challenge.options.map(function(opt, idx) {
        return "<button class=\"viz-opt-btn\" data-opt-idx=\"" + idx + "\">" + opt + "</button>";
      }).join("");
      challengeHTML = "" +
        "<div class=\"viz-challenge-box\">" +
          "<div class=\"viz-challenge-q\">" + viz.challenge.question + "</div>" +
          "<div class=\"viz-options-grid\" id=\"viz-inline-options-grid\">" + optHTML + "</div>" +
          "<div class=\"viz-challenge-expl\" id=\"viz-inline-challenge-expl\">" +
            "<strong>Explanation:</strong> " + viz.challenge.explanation +
          "</div>" +
        "</div>";
    } else {
      challengeHTML = "<p>No active challenge for this formula.</p>";
    }

    wrap.innerHTML = "" +
      "<div class=\"viz-inline-header\">" +
        "<h3 class=\"viz-inline-title\"><span>Interactive Physical Visualization</span></h3>" +
        "<span class=\"viz-inline-badge\">" + esc(viz.title || cardId) + "</span>" +
      "</div>" +
      formatFormulaBanner(viz.formulaLatex) +
      "<div class=\"viz-sim-grid\">" +
        "<div class=\"viz-canvas-wrapper\" id=\"viz-inline-canvas-wrap\">" +
          "<canvas id=\"viz-inline-canvas\" width=\"640\" height=\"380\"></canvas>" +
        "</div>" +
        "<div class=\"viz-legend-strip\" id=\"viz-inline-legend-strip\" aria-live=\"polite\"></div>" +
        "<div class=\"viz-controls-panel\" id=\"viz-inline-controls-panel\">" +
          "<div class=\"viz-controls-heading\">Parameters & Controls</div>" +
          "<div id=\"viz-inline-params-container\"></div>" +
        "</div>" +
      "</div>" +
      "<div class=\"viz-info-section\">" +
        "<div class=\"viz-info-nav\">" +
          "<button class=\"viz-info-tab-btn viz-tab-active\" data-viz-tab=\"story\">Physical Story</button>" +
          "<button class=\"viz-info-tab-btn\" data-viz-tab=\"derivation\">Derivation & Limits</button>" +
          "<button class=\"viz-info-tab-btn\" data-viz-tab=\"traps\">GRE Traps</button>" +
          "<button class=\"viz-info-tab-btn\" data-viz-tab=\"challenge\">Retention Challenge</button>" +
        "</div>" +
        "<div class=\"viz-tab-pane viz-pane-active\" id=\"viz-inline-pane-story\">" +
          "<p>" + (viz.physicalStory || "") + "</p>" +
        "</div>" +
        "<div class=\"viz-tab-pane\" id=\"viz-inline-pane-derivation\">" +
          "<h4>Key Derivation Steps</h4>" +
          "<ol class=\"viz-step-list\">" + derivationItems + "</ol>" +
          "<h4>Limiting Cases & Scaling Laws</h4>" +
          "<ul class=\"viz-step-list\">" + limitItems + "</ul>" +
        "</div>" +
        "<div class=\"viz-tab-pane\" id=\"viz-inline-pane-traps\">" + trapItems + "</div>" +
        "<div class=\"viz-tab-pane\" id=\"viz-inline-pane-challenge\">" + challengeHTML + "</div>" +
      "</div>";

    containerEl.appendChild(wrap);
    typeset(wrap);

    activeInlineContainer = wrap;
    activeInlineViz = viz;
    activeInlineState = {};

    // Tab switcher
    wrap.querySelectorAll("[data-viz-tab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        wrap.querySelectorAll("[data-viz-tab]").forEach(function(b) { b.classList.remove("viz-tab-active"); });
        wrap.querySelectorAll(".viz-tab-pane").forEach(function(p) { p.classList.remove("viz-pane-active"); });
        btn.classList.add("viz-tab-active");
        var targetPane = wrap.querySelector("#viz-inline-pane-" + btn.getAttribute("data-viz-tab"));
        if (targetPane) targetPane.classList.add("viz-pane-active");
      });
    });

    // Challenge options handler
    if (viz.challenge) {
      var optBtns = wrap.querySelectorAll(".viz-opt-btn");
      var explBox = wrap.querySelector("#viz-inline-challenge-expl");
      optBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
          var pick = parseInt(btn.getAttribute("data-opt-idx"), 10);
          optBtns.forEach(function(b, idx) {
            b.disabled = true;
            if (idx === viz.challenge.correct) b.classList.add("viz-correct");
            else if (idx === pick) b.classList.add("viz-incorrect");
          });
          if (explBox) {
            explBox.style.display = "block";
            typeset(explBox);
          }
        });
      });
    }

    // Controls setup
    var paramsContainer = wrap.querySelector("#viz-inline-params-container");
    buildControls(paramsContainer, viz, activeInlineState, function(paramId, val) {
      if (viz.onParamChange) viz.onParamChange(paramId, val, activeInlineState);
      if (viz.onChange) viz.onChange(paramId, val, activeInlineState);
      if (viz.onUpdate) viz.onUpdate(activeInlineState);
    });

    // Canvas setup
    var canvas = wrap.querySelector("#viz-inline-canvas");
    var ctx = canvas.getContext("2d");
    var lastTime = performance.now();
    var inlineLegend = wrap.querySelector("#viz-inline-legend-strip");
    // Call init with a live container so viz-defined controls (action buttons) render
    if (typeof viz.init === "function") {
      var initControls = document.createElement("div");
      initControls.className = "viz-init-controls";
      paramsContainer.parentNode.appendChild(initControls);
      viz.init(initControls, activeInlineState, function() {});
    }

    function inlineRenderLoop(now) {
      if (!canvas || !canvas.isConnected) {
        if (inlineAnimId) {
          cancelAnimationFrame(inlineAnimId);
          inlineAnimId = null;
        }
        return;
      }
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Handle HiDPI
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var targetW = rect.width > 0 ? rect.width : 640;
      var targetH = rect.height > 0 ? rect.height : 380;
      var bufW = Math.round(targetW * dpr);
      var bufH = Math.round(targetH * dpr);

      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width = bufW;
        canvas.height = bufH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = (window.PGRE.CV && window.PGRE.CV.colors.bg) || "#faf9f5";
      ctx.fillRect(0, 0, targetW, targetH);
      if (window.PGRE.resetVizLegend) window.PGRE.resetVizLegend();
      if (typeof viz.draw === "function") {
        viz.draw(ctx, targetW, targetH, activeInlineState, dt);
      }
      ctx.restore();
      paintLegendStrip(inlineLegend);

      inlineAnimId = requestAnimationFrame(inlineRenderLoop);
    }

    inlineAnimId = requestAnimationFrame(inlineRenderLoop);
  };

  window.PGRE.teardownInlineVisualizer = function() {
    if (inlineAnimId) {
      cancelAnimationFrame(inlineAnimId);
      inlineAnimId = null;
    }
    if (activeInlineContainer && activeInlineContainer.parentNode) {
      activeInlineContainer.parentNode.removeChild(activeInlineContainer);
    }
    activeInlineContainer = null;
    activeInlineViz = null;
    activeInlineState = null;
  };

  // --- MODAL DIALOG / FULLSCREEN VISUALIZER ---
  window.PGRE.openVisualizerModal = function(cardId) {
    // Synchronous immediate cleanup of previous modal to avoid delayed timeout wipe
    if (modalAnimId) {
      cancelAnimationFrame(modalAnimId);
      modalAnimId = null;
    }
    var oldModal = document.getElementById("viz-modal-backdrop");
    if (oldModal && oldModal.parentNode) {
      oldModal.parentNode.removeChild(oldModal);
    }
    activeModal = null;
    currentViz = null;
    currentState = null;

    var viz = window.PGRE.visualizers && window.PGRE.visualizers[cardId];
    if (viz && typeof viz.draw === "function") {
    var backdrop = document.createElement("div");
    backdrop.className = "viz-modal-backdrop";
    backdrop.id = "viz-modal-backdrop";

    var topicBadge = viz.topic ? ("<span class=\"viz-inline-badge\">" + esc(viz.topic) + "</span>") : "";
    var derivationItems = formatDerivations(viz.derivationSteps);
    var limitItems = formatLimitingCases(viz.limitingCases);
    var trapItems = formatTraps(viz.greTraps);

    var challengeHTML = "";
    if (viz.challenge) {
      var optHTML = viz.challenge.options.map(function(opt, idx) {
        return "<button class=\"viz-opt-btn\" data-opt-idx=\"" + idx + "\">" + opt + "</button>";
      }).join("");
      challengeHTML = "" +
        "<div class=\"viz-challenge-box\">" +
          "<div class=\"viz-challenge-q\">" + viz.challenge.question + "</div>" +
          "<div class=\"viz-options-grid\" id=\"viz-options-grid\">" + optHTML + "</div>" +
          "<div class=\"viz-challenge-expl\" id=\"viz-challenge-expl\">" +
            "<strong>Explanation:</strong> " + viz.challenge.explanation +
          "</div>" +
        "</div>";
    } else {
      challengeHTML = "<p>No active challenge for this formula.</p>";
    }

    backdrop.innerHTML = "" +
      "<div class=\"viz-modal-window\" id=\"viz-modal-window\">" +
        "<div class=\"viz-modal-header\">" +
          "<div class=\"viz-header-title-group\">" +
            "<h2 class=\"viz-header-title\">" + esc(viz.title) + "</h2>" +
            topicBadge +
          "</div>" +
          "<button class=\"viz-close-btn\" id=\"viz-close-btn\" aria-label=\"Close modal\">&times;</button>" +
        "</div>" +
        "<div class=\"viz-modal-body\" id=\"viz-modal-body\">" +
          formatFormulaBanner(viz.formulaLatex) +
          "<div class=\"viz-sim-grid\">" +
            "<div class=\"viz-canvas-wrapper\" id=\"viz-canvas-wrapper\">" +
              "<canvas id=\"viz-canvas\" width=\"640\" height=\"420\"></canvas>" +
            "</div>" +
            "<div class=\"viz-legend-strip\" id=\"viz-legend-strip\" aria-live=\"polite\"></div>" +
            "<div class=\"viz-controls-panel\" id=\"viz-controls-panel\">" +
              "<div class=\"viz-controls-heading\">Parameters & Controls</div>" +
              "<div id=\"viz-params-container\"></div>" +
            "</div>" +
          "</div>" +
          "<div class=\"viz-info-section\">" +
            "<div class=\"viz-info-nav\">" +
              "<button class=\"viz-info-tab-btn viz-tab-active\" data-viz-tab=\"story\">Physical Story</button>" +
              "<button class=\"viz-info-tab-btn\" data-viz-tab=\"derivation\">Derivation & Limits</button>" +
              "<button class=\"viz-info-tab-btn\" data-viz-tab=\"traps\">GRE Traps</button>" +
              "<button class=\"viz-info-tab-btn\" data-viz-tab=\"challenge\">Retention Challenge</button>" +
            "</div>" +
            "<div class=\"viz-tab-pane viz-pane-active\" id=\"viz-pane-story\">" +
              "<p>" + (viz.physicalStory || "") + "</p>" +
            "</div>" +
            "<div class=\"viz-tab-pane\" id=\"viz-pane-derivation\">" +
              "<h4>Key Derivation Steps</h4>" +
              "<ol class=\"viz-step-list\">" + derivationItems + "</ol>" +
              "<h4>Limiting Cases & Scaling Laws</h4>" +
              "<ul class=\"viz-step-list\">" + limitItems + "</ul>" +
            "</div>" +
            "<div class=\"viz-tab-pane\" id=\"viz-pane-traps\">" + trapItems + "</div>" +
            "<div class=\"viz-tab-pane\" id=\"viz-pane-challenge\">" + challengeHTML + "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    document.body.appendChild(backdrop);
    typeset(backdrop);

    requestAnimationFrame(function() {
      backdrop.classList.add("viz-open");
    });

    activeModal = backdrop;
    currentViz = viz;
    currentState = {};

    // Close handlers
    document.getElementById("viz-close-btn").addEventListener("click", window.PGRE.closeVisualizerModal);
    backdrop.addEventListener("click", function(e) {
      if (e.target === backdrop) window.PGRE.closeVisualizerModal();
    });

    // Tab switcher
    backdrop.querySelectorAll("[data-viz-tab]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        backdrop.querySelectorAll("[data-viz-tab]").forEach(function(b) { b.classList.remove("viz-tab-active"); });
        backdrop.querySelectorAll(".viz-tab-pane").forEach(function(p) { p.classList.remove("viz-pane-active"); });
        btn.classList.add("viz-tab-active");
        var targetPane = document.getElementById("viz-pane-" + btn.getAttribute("data-viz-tab"));
        if (targetPane) targetPane.classList.add("viz-pane-active");
      });
    });

    // Challenge options handler
    if (viz.challenge) {
      var optBtns = backdrop.querySelectorAll(".viz-opt-btn");
      var explBox = document.getElementById("viz-challenge-expl");
      optBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
          var pick = parseInt(btn.getAttribute("data-opt-idx"), 10);
          optBtns.forEach(function(b, idx) {
            b.disabled = true;
            if (idx === viz.challenge.correct) b.classList.add("viz-correct");
            else if (idx === pick) b.classList.add("viz-incorrect");
          });
          if (explBox) {
            explBox.style.display = "block";
            typeset(explBox);
          }
        });
      });
    }

    // Controls setup
    var paramsContainer = document.getElementById("viz-params-container");
    buildControls(paramsContainer, viz, currentState, function(paramId, val) {
      if (viz.onParamChange) viz.onParamChange(paramId, val, currentState);
      if (viz.onChange) viz.onChange(paramId, val, currentState);
      if (viz.onUpdate) viz.onUpdate(currentState);
    });

    // Canvas setup
    var canvas = document.getElementById("viz-canvas");
    var ctx = canvas.getContext("2d");
    var lastTime = performance.now();
    var modalLegend = document.getElementById("viz-legend-strip");
    // Call init with a live container so viz-defined controls (action buttons) render
    if (typeof viz.init === "function") {
      var modalInitControls = document.createElement("div");
      modalInitControls.className = "viz-init-controls";
      paramsContainer.parentNode.appendChild(modalInitControls);
      viz.init(modalInitControls, currentState, function() {});
    }

    function renderLoop(now) {
      if (!canvas || !canvas.isConnected) {
        if (modalAnimId) {
          cancelAnimationFrame(modalAnimId);
          modalAnimId = null;
        }
        return;
      }
      var dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Handle HiDPI
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var targetW = rect.width > 0 ? rect.width : 640;
      var targetH = rect.height > 0 ? rect.height : 420;
      var bufW = Math.round(targetW * dpr);
      var bufH = Math.round(targetH * dpr);

      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width = bufW;
        canvas.height = bufH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = (window.PGRE.CV && window.PGRE.CV.colors.bg) || "#faf9f5";
      ctx.fillRect(0, 0, targetW, targetH);
      if (window.PGRE.resetVizLegend) window.PGRE.resetVizLegend();
      if (typeof viz.draw === "function") {
        viz.draw(ctx, targetW, targetH, currentState, dt);
      }
      ctx.restore();
      paintLegendStrip(modalLegend);

      modalAnimId = requestAnimationFrame(renderLoop);
    }

    modalAnimId = requestAnimationFrame(renderLoop);
    } else {
      // Non-visualizer card: Comprehensive Formula Detail Modal
      var c = lookupFormulaCard(cardId) || { id: cardId, name: cardId, front: "Recall the formula.", back: "", topic: "cm" };

      var backdrop = document.createElement("div");
      backdrop.className = "viz-modal-backdrop";
      backdrop.id = "viz-modal-backdrop";

      function renderCardDetailBody(card) {
        var title = (card && (card.name || card.tag)) || (card && card.id) || cardId;
        var topicKey = (card && card.topic) || "";
        var tObj = (window.PGRE && window.PGRE.topicById && topicKey) ? window.PGRE.topicById(topicKey) : null;
        var topicName = tObj ? tObj.name : topicKey;
        var topicBadge = topicName ? ("<span class=\"viz-inline-badge\">" + esc(topicName) + "</span>") : "";
        var eqTag = (card && card.eq) ? ("<span class=\"viz-eq-badge\">Eq " + esc(card.eq) + "</span>") : "";

        var promptRaw = (card && card.front) || "";
        var promptHTML = promptRaw ? (window.PGRE && window.PGRE.formulaTextHTML ? window.PGRE.formulaTextHTML(promptRaw) : promptRaw) : "";

        var noteRaw = (card && card.note) || "";
        var noteHTML = noteRaw ? (window.PGRE && window.PGRE.formulaTextHTML ? window.PGRE.formulaTextHTML(noteRaw) : noteRaw) : "";

        var mnemText = "";
        if (window.PGRE && window.PGRE.srs && typeof window.PGRE.srs.getMnemonic === "function") {
          mnemText = window.PGRE.srs.getMnemonic(cardId) || "";
        } else if (window.PGRE && window.PGRE.store && window.PGRE.store.state && window.PGRE.store.state.cardNotes && window.PGRE.store.state.cardNotes[cardId]) {
          var cn = window.PGRE.store.state.cardNotes[cardId];
          mnemText = (cn && cn.text) ? cn.text : (typeof cn === "string" ? cn : "");
        } else if (card && card.mnemonic) {
          mnemText = card.mnemonic;
        } else if (card && card.mnem) {
          mnemText = card.mnem;
        }

        var promptSection = promptHTML ? (
          "<div class=\"viz-card-detail-section\">" +
            "<div class=\"viz-detail-section-title\">Prompt &amp; Question</div>" +
            "<div class=\"viz-detail-content viz-detail-prompt\">" + promptHTML + "</div>" +
          "</div>"
        ) : "";

        var noteSection = noteHTML ? (
          "<div class=\"viz-card-detail-section\">" +
            "<div class=\"viz-detail-section-title\">Physical &amp; Formula Notes</div>" +
            "<div class=\"viz-detail-content viz-detail-note\">" + noteHTML + "</div>" +
          "</div>"
        ) : "";

        var mnemonicSection = mnemText ? (
          "<div class=\"viz-card-detail-section\">" +
            "<div class=\"viz-detail-section-title\">Mnemonic</div>" +
            "<div class=\"viz-detail-content viz-detail-mnemonic\">" + esc(mnemText) + "</div>" +
          "</div>"
        ) : "";

        var statusNotice = "<div class=\"viz-status-notice\">Interactive simulation in development for this formula</div>";

        return "" +
          "<div class=\"viz-modal-window viz-detail-window\" id=\"viz-modal-window\">" +
            "<div class=\"viz-modal-header\">" +
              "<div class=\"viz-header-title-group\">" +
                "<h2 class=\"viz-header-title\">" + esc(title) + "</h2>" +
                topicBadge +
                eqTag +
              "</div>" +
              "<button class=\"viz-close-btn\" id=\"viz-close-btn\" aria-label=\"Close modal\">&times;</button>" +
            "</div>" +
            "<div class=\"viz-modal-body viz-detail-body\" id=\"viz-modal-body\">" +
              formatFormulaBanner(card && card.back ? card.back : "") +
              promptSection +
              noteSection +
              mnemonicSection +
              statusNotice +
            "</div>" +
          "</div>";
      }

      backdrop.innerHTML = renderCardDetailBody(c);
      document.body.appendChild(backdrop);
      typeset(backdrop);

      requestAnimationFrame(function() {
        backdrop.classList.add("viz-open");
      });

      activeModal = backdrop;
      currentViz = null;
      currentState = null;

      // Close handlers
      var closeBtn = document.getElementById("viz-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", window.PGRE.closeVisualizerModal);
      backdrop.addEventListener("click", function(e) {
        if (e.target === backdrop) window.PGRE.closeVisualizerModal();
      });

      // If card was initially incomplete, attempt async deck lookup
      if ((!c || (!c.back && !c.front)) && window.PGRE && typeof window.PGRE.formulaDeck === "function") {
        window.PGRE.formulaDeck().then(function(loadedDeck) {
          if (Array.isArray(loadedDeck) && activeModal === backdrop) {
            for (var i = 0; i < loadedDeck.length; i++) {
              if (loadedDeck[i] && loadedDeck[i].id === cardId) {
                backdrop.innerHTML = renderCardDetailBody(loadedDeck[i]);
                typeset(backdrop);
                var newCloseBtn = document.getElementById("viz-close-btn");
                if (newCloseBtn) newCloseBtn.addEventListener("click", window.PGRE.closeVisualizerModal);
                break;
              }
            }
          }
        }).catch(function() {});
      }
    }
  };

  window.PGRE.closeVisualizerModal = function() {
    if (modalAnimId) {
      cancelAnimationFrame(modalAnimId);
      modalAnimId = null;
    }
    if (activeModal && activeModal.parentNode) {
      activeModal.classList.remove("viz-open");
      var modalToRemove = activeModal;
      activeModal = null;
      currentViz = null;
      currentState = null;
      setTimeout(function() {
        if (modalToRemove && modalToRemove.parentNode) {
          modalToRemove.parentNode.removeChild(modalToRemove);
        }
      }, 150);
    }
  };

  // Keyboard shortcut: Escape closes modal visualizer
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && activeModal) {
      window.PGRE.closeVisualizerModal();
    }
  });
  // Close an open visualizer modal when the route/hash changes
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("hashchange", function() {
    if (activeModal) {
      window.PGRE.closeVisualizerModal();
    }
  });

})();


/* Shared drawing helpers used by the 10 trio files. */
(function (global) {
  global.PGRE = global.PGRE || {};
  global.PGRE.visualizers = global.PGRE.visualizers || {};
  // Stage palette read at draw time so canvas visualizers follow dark mode.
  var VIZ_STAGE_THEMES = {
    light: {
      bg: '#faf9f5', ink: '#141413', muted: '#6c6a64',
      grid: 'rgba(20, 20, 19, 0.06)',
      gridMid: 'rgba(20, 20, 19, 0.08)',
      gridBright: 'rgba(20, 20, 19, 0.12)',
      line: '#e6dfd8', panel: '#f5f0e8', ivory: '#efe9de',
      cardBg: 'rgba(245, 240, 232, 0.96)',
      hudBg: 'rgba(245, 240, 232, 0.96)',
      hudBorder: 'rgba(20, 20, 19, 0.12)',
      chip: 'rgba(250, 249, 245, 0.94)',
      chipLine: 'rgba(20, 20, 19, 0.10)',
      inkFade: function (a) { return 'rgba(20, 20, 19, ' + a + ')'; },
      chipFade: function (a) { return 'rgba(250, 249, 245, ' + a + ')'; }
    },
    dark: {
      bg: '#181715', ink: '#f3f1ea', muted: '#a8a49a',
      grid: 'rgba(243, 241, 234, 0.07)',
      gridMid: 'rgba(243, 241, 234, 0.09)',
      gridBright: 'rgba(243, 241, 234, 0.14)',
      line: 'rgba(243, 241, 234, 0.16)', panel: '#242220', ivory: '#2b2926',
      cardBg: 'rgba(36, 34, 32, 0.96)',
      hudBg: 'rgba(36, 34, 32, 0.96)',
      hudBorder: 'rgba(243, 241, 234, 0.14)',
      chip: 'rgba(36, 34, 32, 0.94)',
      chipLine: 'rgba(243, 241, 234, 0.12)',
      inkFade: function (a) { return 'rgba(243, 241, 234, ' + a + ')'; },
      chipFade: function (a) { return 'rgba(24, 23, 21, ' + a + ')'; }
    }
  };
  function vizStageTheme() {
    var dark = typeof document !== 'undefined' && document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'dark';
    return dark ? VIZ_STAGE_THEMES.dark : VIZ_STAGE_THEMES.light;
  }
  global.PGRE.vizStageTheme = vizStageTheme;

  var CV = {
  // Claude aesthetic colors for simulation canvas
  colors: {
    get bg() { return vizStageTheme().bg; },
    get grid() { return vizStageTheme().grid; },
    get gridBright() { return vizStageTheme().gridBright; },
    get text() { return vizStageTheme().ink; },
    get textMuted() { return vizStageTheme().muted; },
    sun: '#d4a017',        // Warm gold
    sunGlow: 'rgba(212, 160, 23, 0.35)',
    orbit: 'rgba(204, 120, 92, 0.45)', // Brand Coral
    particle: '#cc785c',   // Coral
    particleGlow: 'rgba(204, 120, 92, 0.5)',
    vecR: '#5db8a6',       // Teal / position
    vecV: '#4e9b6f',       // Emerald / velocity
    vecA: '#e05666',       // Rose / acceleration
    vecF: '#cc785c',       // Coral / force
    vecCor: '#9d7cd8',     // Violet / Coriolis
    vecCent: '#d4a017',    // Amber / Centrifugal
    vecEff: '#5db8a6',     // Teal
    energy: '#e05666',     // Crimson
    get hudBg() { return vizStageTheme().hudBg; },
    get hudBorder() { return vizStageTheme().hudBorder; }
  },

  drawGrid(ctx, width, height, step = 40) {
    ctx.save();
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  },

  drawArrow(ctx, fromX, fromY, toX, toY, color, label = '', lineWidth = 2.2, arrowSize = 8) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Optional Label with high-contrast background to prevent overlapping lines
    if (label) {
      ctx.font = '500 11px "Inter", -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const offset = 14;
      const nx = -Math.sin(angle) * offset;
      const ny = Math.cos(angle) * offset;
      const midX = (fromX + toX) / 2 + nx;
      const midY = (fromY + toY) / 2 + ny;

      const textMetrics = ctx.measureText ? ctx.measureText(label) : null;
      const textWidth = (textMetrics && textMetrics.width) ? textMetrics.width : (label.length * 7);
      ctx.fillStyle = vizStageTheme().chip;
      ctx.fillRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16);
      ctx.strokeStyle = vizStageTheme().chipLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16);

      ctx.fillStyle = color;
      ctx.fillText(label, midX, midY);
    }
    ctx.restore();
  },

  drawGlowCircle(ctx, x, y, radius, fillColor, glowColor, glowBlur = 12) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawHUD(ctx, x, y, width, rows, title) {
    title = title || '';
    if (typeof window !== 'undefined' && window.PGRE && window.PGRE.appendVizLegend) {
      window.PGRE.appendVizLegend(title, rows || []);
    }
  }
};
  var DrawUtils = {
    colors: {
      get bg() { return vizStageTheme().bg; },
      get cardBg() { return vizStageTheme().cardBg; },
      get cardBorder() { return vizStageTheme().line; },
      get grid() { return vizStageTheme().gridMid; },
      get gridText() { return vizStageTheme().muted; },
      get text() { return vizStageTheme().ink; },
      get textMuted() { return vizStageTheme().muted; },
      cyan: '#cc785c',
      cyanGlow: 'rgba(204, 120, 92, 0.35)',
      emerald: '#4e9b6f',
      emeraldGlow: 'rgba(78, 155, 111, 0.35)',
      rose: '#e05666',
      roseGlow: 'rgba(224, 86, 102, 0.35)',
      amber: '#d4a017',
      amberGlow: 'rgba(212, 160, 23, 0.35)',
      violet: '#9d7cd8',
      violetGlow: 'rgba(157, 124, 216, 0.35)',
      blue: '#5db8a6',
      get white() { return vizStageTheme().ink; }
    },

    drawAxes(ctx, cx, cy, width, height, xLabel, yLabel, gridStep) {
      gridStep = gridStep || 40;
      ctx.save();
      ctx.strokeStyle = this.colors.grid;
      ctx.lineWidth = 1;

      const halfW = width / 2;
      const halfH = height / 2;

      for (let x = cx - Math.floor(halfW / gridStep) * gridStep; x <= cx + halfW; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, cy - halfH);
        ctx.lineTo(x, cy + halfH);
        ctx.stroke();
      }

      for (let y = cy - Math.floor(halfH / gridStep) * gridStep; y <= cy + halfH; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(cx - halfW, y);
        ctx.lineTo(cx + halfW, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(cx - halfW, cy);
      ctx.lineTo(cx + halfW, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - halfH);
      ctx.lineTo(cx, cy + halfH);
      ctx.stroke();

      ctx.fillStyle = this.colors.textMuted;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(xLabel, cx + halfW - 8, cy - 8);
      ctx.textAlign = 'left';
      ctx.fillText(yLabel, cx + 8, cy - halfH + 14);

      ctx.restore();
    },

    drawVector(ctx, fromX, fromY, toX, toY, color, label, lineWidth) {
      lineWidth = lineWidth || 2;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const headLen = Math.min(10, len * 0.4);
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midX = (fromX + toX) / 2 + Math.cos(angle - Math.PI / 2) * 12;
        const midY = (fromY + toY) / 2 + Math.sin(angle - Math.PI / 2) * 12;
        ctx.fillText(label, midX, midY);
      }
      ctx.restore();
    },

    drawSpring(ctx, x1, y1, x2, y2, coils, width, color, activeStress) {
      coils = coils || 12;
      width = width || 16;
      color = color || '#cc785c';
      activeStress = activeStress || 0;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);

      const lead = 15;
      const coilLength = Math.max(10, length - 2 * lead);
      const step = coilLength / (coils * 2);

      let strokeColor = color;
      if (activeStress > 0.05) {
        strokeColor = 'rgb(' + Math.min(255, Math.floor(56 + activeStress * 400)) + ', ' + Math.max(100, Math.floor(189 - activeStress * 200)) + ', 120)';
      } else if (activeStress < -0.05) {
        strokeColor = 'rgb(96, ' + Math.min(240, Math.floor(165 - activeStress * 180)) + ', ' + Math.min(255, Math.floor(250 - activeStress * 200)) + ')';
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lead, 0);

      for (let i = 0; i < coils * 2; i++) {
        const x = lead + (i + 0.5) * step;
        const y = (i % 2 === 0 ? -1 : 1) * (width / 2);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(lead + coilLength, 0);
      ctx.lineTo(length, 0);
      ctx.stroke();

      ctx.restore();
    },

    drawHatchedWall(ctx, x, y, width, height, orientation) {
      orientation = orientation || 'vertical-left';
      ctx.save();
      ctx.fillStyle = '#efe9de';
      ctx.strokeStyle = '#8e8b82';
      ctx.lineWidth = 2;

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const step = 8;
      if (orientation.indexOf('vertical') !== -1) {
        for (let py = y - width; py < y + height + width; py += step) {
          ctx.moveTo(x, Math.max(y, py));
          ctx.lineTo(x + width, Math.min(y + height, py + width));
        }
      } else {
        for (let px = x - height; px < x + width + height; px += step) {
          ctx.moveTo(Math.max(x, px), y);
          ctx.lineTo(Math.min(x + width, px + height), y + height);
        }
      }
      ctx.stroke();
      ctx.restore();
    },

    drawMassBlock(ctx, cx, cy, size, label, color, isHovered) {
      color = color || '#cc785c';
      ctx.save();
      const half = size / 2;

      ctx.shadowColor = isHovered ? '#cc785c' : color;
      ctx.shadowBlur = isHovered ? 16 : 8;

      const grad = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
      grad.addColorStop(0, '#e6dfd8');
      grad.addColorStop(0.5, '#efe9de');
      grad.addColorStop(1, '#f5f0e8');
      ctx.fillStyle = grad;

      ctx.strokeStyle = isHovered ? '#cc785c' : color;
      ctx.lineWidth = isHovered ? 3 : 2;

      const radius = 6;
      ctx.beginPath();
      ctx.moveTo(cx - half + radius, cy - half);
      ctx.lineTo(cx + half - radius, cy - half);
      ctx.quadraticCurveTo(cx + half, cy - half, cx + half, cy - half + radius);
      ctx.lineTo(cx + half, cy + half - radius);
      ctx.quadraticCurveTo(cx + half, cy + half, cx + half - radius, cy + half);
      ctx.lineTo(cx - half + radius, cy + half);
      ctx.quadraticCurveTo(cx - half, cy + half, cx - half, cy + half - radius);
      ctx.lineTo(cx - half, cy - half + radius);
      ctx.quadraticCurveTo(cx - half, cy - half, cx - half + radius, cy - half);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - half + radius + 2, cy - half + 2);
      ctx.lineTo(cx + half - radius - 2, cy - half + 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = vizStageTheme().ink;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, cx, cy - 8);

      ctx.restore();
    },

    drawHud(ctx, x, y, width, height, title, lines) {
      lines = lines || [];
      var rows = lines.map(function(item) {
        return { label: item.label || '', value: item.val != null ? item.val : (item.value || ''), valueColor: item.color };
      });
      if (typeof window !== 'undefined' && window.PGRE && window.PGRE.appendVizLegend) {
        window.PGRE.appendVizLegend(title || '', rows);
      }
    }
  };
  var U = {
    drawGrid(ctx, w, h, step = 40, color = 'rgba(20, 20, 19, 0.08)') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
    },

    drawAxes(ctx, cx, cy, w, h, xLabel = 'x', yLabel = 'y', color = 'rgba(20, 20, 19, 0.35)') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5;
      ctx.font = '12px system-ui, -apple-system, sans-serif';

      // X axis
      ctx.beginPath();
      ctx.moveTo(20, cy);
      ctx.lineTo(w - 20, cy);
      ctx.stroke();
      U.drawArrowHead(ctx, w - 20, cy, 0, 8, color);
      ctx.fillText(xLabel, w - 15, cy - 8);

      // Y axis
      ctx.beginPath();
      ctx.moveTo(cx, h - 20);
      ctx.lineTo(cx, 20);
      ctx.stroke();
      U.drawArrowHead(ctx, cx, 20, -Math.PI / 2, 8, color);
      ctx.fillText(yLabel, cx + 8, 20);

      ctx.restore();
    },

    drawArrowHead(ctx, x, y, angle, size = 8, color = '#cc785c') {
      ctx.save();
      ctx.fillStyle = color;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size * 0.4);
      ctx.lineTo(-size * 0.7, 0);
      ctx.lineTo(-size, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawVector(ctx, x1, y1, x2, y2, color = '#cc785c', width = 2, label = '', labelOffset = { x: 0, y: -8 }) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const angle = Math.atan2(dy, dx);
      U.drawArrowHead(ctx, x2, y2, angle, Math.min(10, len * 0.4), color);

      if (label) {
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText(label, (x1 + x2) / 2 + labelOffset.x, (y1 + y2) / 2 + labelOffset.y);
      }
      ctx.restore();
    },

    drawGlowDisk(ctx, x, y, r, color = '#cc785c', glowSize = 15) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = glowSize;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawCardBadge(ctx, text, x, y, bg = 'rgba(204, 120, 92, 0.15)', border = '#cc785c', textCol = vizStageTheme().ink) {
      ctx.save();
      ctx.font = '11px monospace';
      const tw = ctx.measureText(text).width;
      const padX = 8, padY = 4;
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, tw + padX * 2, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(text, x + padX, y + 14);
      ctx.restore();
    },

    createControlUI(container, controls, onChange) {
      if (!controls || !controls.length) {
        container.style.display = 'none';
        return;
      }
      var theme = vizStageTheme();
      container.innerHTML = '';
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.gap = '12px';
      container.style.padding = '10px 14px';
      container.style.background = theme.cardBg;
      container.style.borderTop = '1px solid ' + theme.hudBorder;
      container.style.borderRadius = '0 0 8px 8px';
      container.style.fontSize = '12px';
      container.style.color = theme.ink;

      controls.forEach(ctrl => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '6px';

        const label = document.createElement('label');
        label.innerText = ctrl.label;
        label.style.fontWeight = '500';
        label.style.color = theme.muted;
        item.appendChild(label);

        if (ctrl.type === 'range') {
          const input = document.createElement('input');
          input.type = 'range';
          input.min = ctrl.min;
          input.max = ctrl.max;
          input.step = ctrl.step || '1';
          input.value = ctrl.value;
          input.style.width = ctrl.width || '110px';
          input.style.cursor = 'pointer';

          const valDisplay = document.createElement('span');
          valDisplay.innerText = ctrl.format ? ctrl.format(ctrl.value) : ctrl.value;
          valDisplay.style.minWidth = '36px';
          valDisplay.style.fontFamily = 'monospace';
          valDisplay.style.color = '#cc785c';

          input.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            ctrl.value = v;
            valDisplay.innerText = ctrl.format ? ctrl.format(v) : v;
            onChange(ctrl.id, v);
          });

          item.appendChild(input);
          item.appendChild(valDisplay);
        } else if (ctrl.type === 'select') {
          const sel = document.createElement('select');
          sel.style.background = theme.ivory;
          sel.style.color = theme.ink;
          sel.style.border = '1px solid ' + theme.hudBorder;
          sel.style.borderRadius = '4px';
          sel.style.padding = '2px 6px';
          sel.style.fontSize = '12px';

          ctrl.options.forEach(opt => {
            const opEl = document.createElement('option');
            opEl.value = opt.value;
            opEl.innerText = opt.label;
            if (opt.value === ctrl.value) opEl.selected = true;
            sel.appendChild(opEl);
          });

          sel.addEventListener('change', (e) => {
            ctrl.value = e.target.value;
            onChange(ctrl.id, e.target.value);
          });

          item.appendChild(sel);
        } else if (ctrl.type === 'button') {
          const btn = document.createElement('button');
          btn.innerText = ctrl.text || ctrl.label;
          btn.style.background = '#964b32';
          btn.style.color = '#ffffff';
          btn.style.border = 'none';
          btn.style.borderRadius = '4px';
          btn.style.padding = '4px 10px';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '11px';
          btn.style.fontWeight = '600';

          btn.addEventListener('click', () => {
            ctrl.onClick && ctrl.onClick();
            onChange(ctrl.id, true);
          });

          item.appendChild(btn);
        } else if (ctrl.type === 'toggle') {
          const btn = document.createElement('button');
          let active = !!ctrl.value;
          const updateBtn = () => {
            btn.innerText = (ctrl.label ? ctrl.label + ': ' : '') + (active ? (ctrl.onText || 'ON') : (ctrl.offText || 'OFF'));
            btn.style.background = active ? '#059669' : '#e6dfd8';
          };
          btn.style.color = '#ffffff';
          btn.style.border = 'none';
          btn.style.borderRadius = '4px';
          btn.style.padding = '3px 8px';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '11px';
          updateBtn();

          btn.addEventListener('click', () => {
            active = !active;
            ctrl.value = active;
            updateBtn();
            onChange(ctrl.id, active);
          });

          item.appendChild(btn);
        }

        container.appendChild(item);
      });
    }
  };

  global.CV = CV;
  global.DrawUtils = DrawUtils;
  global.PGRE.CV = CV;
  global.PGRE.DrawUtils = DrawUtils;
  global.PGRE.VizU = U;

  function createStyleIfNotExists() { return; }
  function createControlStyles() { return; }
  global.createStyleIfNotExists = createStyleIfNotExists;
  global.createControlStyles = createControlStyles;
  global.PGRE.createStyleIfNotExists = createStyleIfNotExists;

    const EPSILON_0 = 8.8541878128e-12;
  const K_COULOMB = 1 / (4 * Math.PI * EPSILON_0);

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function formatSci(num, sigFigs) {
    sigFigs = sigFigs || 3;
    if (Math.abs(num) === 0) return "0";
    if (Math.abs(num) >= 0.01 && Math.abs(num) < 10000) {
      return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
    return num.toExponential(sigFigs - 1);
  }

  // Color mapping: Blue (negative/low) -> Dark/Cyan/Green -> Yellow/Red (positive/high)
  function getPotentialColor(v, maxV, alpha) {
    maxV = maxV || 50;
    alpha = alpha !== undefined ? alpha : 0.8;
    const norm = clamp(v / maxV, -1, 1);
    let r = 0, g = 0, b = 0;
    if (norm < 0) {
      const t = -norm; // 0 to 1
      r = Math.round(20 + 30 * (1 - t));
      g = Math.round(80 + 100 * (1 - t) + 40 * t);
      b = Math.round(180 + 75 * t);
    } else {
      const t = norm; // 0 to 1
      r = Math.round(200 + 55 * t);
      g = Math.round(80 + 120 * (1 - t));
      b = Math.round(30 + 40 * (1 - t));
    }
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  // Helper to ensure card 1 charge preset initialization
  function initCard1Charges(state) {
    const q = state.chargeMag !== undefined ? state.chargeMag : 1.0;
    if (state.preset === "point_pos") {
      state.charges = [{ x: 0.0, y: 0.0, q: q, id: 1 }];
    } else if (state.preset === "point_neg") {
      state.charges = [{ x: 0.0, y: 0.0, q: -q, id: 1 }];
    } else if (state.preset === "like_charges") {
      state.charges = [
        { x: -0.35, y: 0.0, q: q, id: 1 },
        { x: 0.35, y: 0.0, q: q, id: 2 }
      ];
    } else if (state.preset === "quadrupole") {
      state.charges = [
        { x: -0.3, y: -0.3, q: q, id: 1 },
        { x: 0.3, y: -0.3, q: -q, id: 2 },
        { x: 0.3, y: 0.3, q: q, id: 3 },
        { x: -0.3, y: 0.3, q: -q, id: 4 }
      ];
    } else if (state.preset === "capacitor") {
      state.charges = [];
      for (let i = -3; i <= 3; i++) {
        state.charges.push({ x: -0.35, y: i * 0.12, q: q * 0.4, id: 10 + i });
        state.charges.push({ x: 0.35, y: i * 0.12, q: -q * 0.4, id: 20 + i });
      }
    } else {
      // Default: Dipole (+ / -)
      state.charges = [
        { x: -0.35, y: 0.0, q: q, id: 1 },
        { x: 0.35, y: 0.0, q: -q, id: 2 }
      ];
    }
  }

  // Marching Squares Vector Contour Renderer Helper
  function drawMarchingContours(ctx, getVFunc, toNormFunc, toScreenFunc, width, height, isoLevels, gridStep) {
    gridStep = gridStep || 10;
    const cols = Math.floor(width / gridStep);
    const rows = Math.floor(height / gridStep);

    const grid = new Float32Array((cols + 1) * (rows + 1));
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const norm = toNormFunc(i * gridStep, j * gridStep);
        grid[j * (cols + 1) + i] = getVFunc(norm.x, norm.y);
      }
    }

    ctx.save();
    isoLevels.forEach(level => {
      const isZero = Math.abs(level) < 0.001;
      ctx.strokeStyle = isZero ? "rgba(226, 232, 240, 0.75)" : (level > 0 ? "rgba(249, 115, 22, 0.55)" : "rgba(204, 120, 92, 0.55)");
      ctx.lineWidth = isZero ? 1.6 : 1.0;
      ctx.setLineDash(isZero ? [4, 4] : []);
      ctx.beginPath();

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x0 = i * gridStep;
          const y0 = j * gridStep;
          const x1 = x0 + gridStep;
          const y1 = y0 + gridStep;

          const v00 = grid[j * (cols + 1) + i];
          const v10 = grid[j * (cols + 1) + (i + 1)];
          const v11 = grid[(j + 1) * (cols + 1) + (i + 1)];
          const v01 = grid[(j + 1) * (cols + 1) + i];

          const minV = Math.min(v00, v10, v11, v01);
          const maxV = Math.max(v00, v10, v11, v01);
          if (level < minV || level > maxV) continue;

          // Points on 4 edges: top, right, bottom, left
          const pts = [];
          if ((v00 <= level && v10 > level) || (v00 > level && v10 <= level)) {
            const t = (level - v00) / (v10 - v00 + 1e-12);
            pts.push({ x: x0 + t * gridStep, y: y0 });
          }
          if ((v10 <= level && v11 > level) || (v10 > level && v11 <= level)) {
            const t = (level - v10) / (v11 - v10 + 1e-12);
            pts.push({ x: x1, y: y0 + t * gridStep });
          }
          if ((v01 <= level && v11 > level) || (v01 > level && v11 <= level)) {
            const t = (level - v01) / (v11 - v01 + 1e-12);
            pts.push({ x: x0 + t * gridStep, y: y1 });
          }
          if ((v00 <= level && v01 > level) || (v00 > level && v01 <= level)) {
            const t = (level - v00) / (v01 - v00 + 1e-12);
            pts.push({ x: x0, y: y0 + t * gridStep });
          }

          if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
          } else if (pts.length === 4) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.moveTo(pts[2].x, pts[2].y);
            ctx.lineTo(pts[3].x, pts[3].y);
          }
        }
      }
      ctx.stroke();
    });
    ctx.restore();
  }
    function initAtomLattice(state) {
    const rows = 14;
    const cols = 18;
    state._atoms = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        state._atoms.push({
          x: (c + 0.5 + (Math.random() - 0.5) * 0.3) / cols,
          y: (r + 0.5 + (Math.random() - 0.5) * 0.3) / rows,
          decayed: false,
          decayTime: 0
        });
      }
    }
    state._ejections = [];
  }

  global.PGRE.VizH = {
    clamp: clamp,
    formatSci: formatSci,
    getPotentialColor: getPotentialColor,
    initCard1Charges: initCard1Charges,
    drawMarchingContours: drawMarchingContours,
    EPSILON_0: EPSILON_0,
    K_COULOMB: K_COULOMB,
    initAtomLattice: initAtomLattice
  };
})(typeof window !== 'undefined' ? window : globalThis);
