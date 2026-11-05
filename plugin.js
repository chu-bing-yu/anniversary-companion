/* anniversary-companion v0.1.0 | built 2026-11-05T12:15:00.825Z */
(() => {
  // src/services/host.js
  function isFn(obj, name) {
    return !!obj && typeof obj[name] === "function";
  }
  function clone(value) {
    if (value === void 0) return void 0;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value;
    }
  }
  function createHost(roche) {
    var api = roche || {};
    var memoryMirror = {};
    var storageUsable = isFn(api.storage, "get") && isFn(api.storage, "set");
    var caps = {
      storage: storageUsable,
      storageDelete: isFn(api.storage, "delete"),
      ui: !!api.ui,
      uiToast: isFn(api.ui, "toast"),
      uiConfirm: isFn(api.ui, "confirm"),
      uiClose: isFn(api.ui, "closeApp"),
      uiOpen: isFn(api.ui, "openApp"),
      character: isFn(api.character, "list"),
      characterGet: isFn(api.character, "get"),
      persona: isFn(api.persona, "getActiveUserPersona"),
      personaForConversation: isFn(api.persona, "getUserPersonaForConversation"),
      conversation: isFn(api.conversation, "list"),
      memory: isFn(api.memory, "getLongTerm"),
      memoryShort: isFn(api.memory, "getShortTerm"),
      memorySearch: isFn(api.memory, "search"),
      ai: isFn(api.ai, "chat"),
      voice: isFn(api.voice, "tts"),
      voiceProvider: isFn(api.voice, "getProvider"),
      chatCard: !!api.chat && isFn(api.chat, "createCard"),
      chatUpdateCard: !!api.chat && isFn(api.chat, "updateCard"),
      chatAction: !!api.chat && isFn(api.chat, "dispatchCardAction")
    };
    async function safe(label, fn, fallback) {
      try {
        return await fn();
      } catch (e) {
        if (typeof window !== "undefined" && window.console) {
          console.warn("[anniversary-companion] " + label + " 失败:", e && e.message);
        }
        return fallback;
      }
    }
    var storage = {
      async get(key) {
        if (!storageUsable) return clone(memoryMirror[key]);
        var value = await safe("storage.get " + key, function() {
          return api.storage.get(key);
        }, void 0);
        return value === void 0 ? clone(memoryMirror[key]) : value;
      },
      async set(key, value) {
        memoryMirror[key] = clone(value);
        if (!storageUsable) return false;
        var ok = await safe("storage.set " + key, function() {
          return api.storage.set(key, clone(value));
        }, false);
        return ok !== false;
      },
      async remove(key) {
        delete memoryMirror[key];
        if (!caps.storageDelete) return true;
        await safe("storage.delete " + key, function() {
          return api.storage.delete(key);
        }, null);
        return true;
      }
    };
    var ui = {
      toast(message) {
        if (caps.uiToast) {
          safe("ui.toast", function() {
            return api.ui.toast(message);
          });
          return;
        }
        if (typeof window !== "undefined" && window.console) console.info("[toast]", message);
      },
      async confirm(options) {
        if (caps.uiConfirm) {
          var result = await safe("ui.confirm", function() {
            return api.ui.confirm(options);
          }, null);
          if (typeof result === "boolean") return result;
        }
        if (typeof window !== "undefined" && typeof window.confirm === "function") {
          return window.confirm((options && options.title ? options.title + "\n\n" : "") + (options && options.message ? options.message : ""));
        }
        return false;
      },
      closeApp() {
        if (caps.uiClose) safe("ui.closeApp", function() {
          return api.ui.closeApp();
        });
      },
      openApp(appId) {
        if (caps.uiOpen && appId) safe("ui.openApp", function() {
          return api.ui.openApp(appId);
        });
      }
    };
    var character = {
      async list() {
        if (!caps.character) return [];
        var list = await safe("character.list", function() {
          return api.character.list();
        }, []);
        return Array.isArray(list) ? list : [];
      },
      async get(id) {
        if (!caps.characterGet || !id) return null;
        return await safe("character.get", function() {
          return api.character.get(id);
        }, null);
      }
    };
    var persona = {
      async active() {
        if (!caps.persona) return null;
        return await safe("persona.getActiveUserPersona", function() {
          return api.persona.getActiveUserPersona();
        }, null);
      },
      async forConversation(conversationId) {
        if (!conversationId) return persona.active();
        if (caps.personaForConversation) {
          var p = await safe("persona.getUserPersonaForConversation", function() {
            return api.persona.getUserPersonaForConversation(conversationId);
          }, null);
          if (p) return p;
        }
        return persona.active();
      }
    };
    var memory = {
      async longTerm(conversationId, limit) {
        if (!caps.memory || !conversationId) return null;
        return await safe("memory.getLongTerm", function() {
          return api.memory.getLongTerm({ conversationId, limit: limit || 100 });
        }, null);
      },
      async shortTerm(conversationId, limit) {
        if (!caps.memoryShort || !conversationId) return [];
        var list = await safe("memory.getShortTerm", function() {
          return api.memory.getShortTerm({ conversationId, limit: limit || 12 });
        }, []);
        return Array.isArray(list) ? list : [];
      }
    };
    var conversation = {
      async list(options) {
        if (!caps.conversation) return [];
        var list = await safe("conversation.list", function() {
          return api.conversation.list(options);
        }, []);
        return Array.isArray(list) ? list : [];
      }
    };
    var ai = {
      /** 统一返回 { ok, text, model } / { ok:false, reason } */
      async chat(options) {
        if (!caps.ai) return { ok: false, reason: "no_api" };
        try {
          var res = await api.ai.chat(options);
          var text = res && (res.text || res.content || res.message);
          if (!text) return { ok: false, reason: "empty" };
          return { ok: true, text: String(text), model: String(res && (res.model || res.modelName) || "") };
        } catch (e) {
          if (typeof window !== "undefined" && window.console) {
            console.warn("[anniversary-companion] ai.chat 失败:", e && e.message);
          }
          return { ok: false, reason: "error" };
        }
      }
    };
    var voice = {
      async provider() {
        if (caps.voiceProvider) {
          var p = await safe("voice.getProvider", function() {
            return api.voice.getProvider();
          }, "");
          return p === "elevenlabs" ? "elevenlabs" : p === "minimax" ? "minimax" : "";
        }
        return "";
      },
      async tts(options) {
        if (!caps.voice) return { ok: false, reason: "no_api" };
        try {
          var url = await api.voice.tts(options);
          if (!url || typeof url !== "string") return { ok: false, reason: "empty" };
          return { ok: true, url };
        } catch (e) {
          if (typeof window !== "undefined" && window.console) {
            console.warn("[anniversary-companion] voice.tts 失败:", e && e.message);
          }
          return { ok: false, reason: "error" };
        }
      }
    };
    var chat = {
      async createCard(payload) {
        if (!caps.chatCard) return { ok: false, reason: "no_api" };
        try {
          var message = await api.chat.createCard(payload);
          return { ok: true, message: message || null };
        } catch (e) {
          if (typeof window !== "undefined" && window.console) {
            console.warn("[anniversary-companion] chat.createCard 失败:", e && e.message);
          }
          return { ok: false, reason: "error" };
        }
      },
      async updateCard(payload) {
        if (!caps.chatUpdateCard) return { ok: false, reason: "no_api" };
        try {
          await api.chat.updateCard(payload);
          return { ok: true };
        } catch (e) {
          return { ok: false, reason: "error" };
        }
      }
    };
    return {
      caps,
      raw: api,
      storage,
      ui,
      character,
      persona,
      memory,
      conversation,
      ai,
      voice,
      chat
    };
  }

  // src/core/format.js
  var KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function parseDateKey(key) {
    var m = KEY_RE.exec(String(key || ""));
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }
  function isValidDateKey(key) {
    return !!parseDateKey(key);
  }
  function toDateKey(dt) {
    if (!(dt instanceof Date) || isNaN(dt.getTime())) return "";
    return dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate());
  }
  function todayKey(now) {
    return toDateKey(new Date(typeof now === "number" ? now : Date.now()));
  }
  function dayNumber(key) {
    var dt = parseDateKey(key);
    if (!dt) return NaN;
    return Math.round(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 864e5);
  }
  function daysBetween(fromKey, toKey) {
    var a = dayNumber(fromKey);
    var b = dayNumber(toKey);
    if (isNaN(a) || isNaN(b)) return NaN;
    return b - a;
  }
  function cnDate(key) {
    var dt = parseDateKey(key);
    if (!dt) return "未设置";
    return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
  }
  function cnDateShort(key) {
    var dt = parseDateKey(key);
    if (!dt) return "未设置";
    return dt.getMonth() + 1 + "月" + dt.getDate() + "日";
  }
  function cnWeekday(key) {
    var dt = parseDateKey(key);
    if (!dt) return "";
    return "日一二三四五六".charAt(dt.getDay());
  }
  function anniversaryIndex(baseKey, occurrenceKey2) {
    var a = parseDateKey(baseKey);
    var b = parseDateKey(occurrenceKey2);
    if (!a || !b) return 1;
    return Math.max(1, b.getFullYear() - a.getFullYear() + 1);
  }
  function truncate(text, max) {
    var s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    var limit = Number(max) || 40;
    return s.length > limit ? s.slice(0, limit) + "…" : s;
  }
  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // src/core/plans.js
  var SECRECY_IDS = ["secret", "hint", "open"];
  var RECURRENCE_IDS = ["yearly", "once"];
  var TYPE_IDS = ["met", "confession", "first-date", "birthday", "custom"];
  var OFFSET_LADDER = [30, 21, 14, 10, 7, 5, 3, 2, 1, 0];
  function str(value, max) {
    return String(value == null ? "" : value).slice(0, max);
  }
  function pick(value, list, fallback) {
    return list.indexOf(value) === -1 ? fallback : value;
  }
  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return "p_" + crypto.randomUUID().slice(0, 8);
    return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function newPlanId() {
    return uid();
  }
  function stageOffsets(daysLeft2) {
    var left = Math.max(0, Math.floor(Number(daysLeft2) || 0));
    var out = OFFSET_LADDER.filter(function(n) {
      return n <= left;
    });
    if (out.indexOf(0) === -1) out.push(0);
    if (out.length > 8) out = out.slice(0, 7).concat([0]);
    return out;
  }
  function normalizeStage(raw) {
    if (!raw || typeof raw !== "object") return null;
    var offsetDays = Math.max(0, Math.min(365, Math.floor(Number(raw.offsetDays) || 0)));
    var teaser = str(raw.teaser, 200).trim();
    var detail = str(raw.detail, 400).trim();
    if (!teaser && !detail) return null;
    var doneAt = Number(raw.doneAt) || 0;
    return {
      offsetDays,
      teaser: teaser || detail,
      detail: detail || teaser,
      doneAt: doneAt > 0 ? doneAt : 0
    };
  }
  function normalizeStages(raw) {
    if (!Array.isArray(raw)) return [];
    var list = raw.map(normalizeStage).filter(Boolean);
    list.sort(function(a, b) {
      return b.offsetDays - a.offsetDays;
    });
    return list.slice(0, 8);
  }
  function normalizeLetter(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function(item) {
      if (!item || typeof item !== "object") return null;
      var title = str(item.title, 40).trim();
      var body = str(item.body, 1200).trim();
      if (!body) return null;
      return { title: title || "", body };
    }).filter(Boolean).slice(0, 5);
  }
  function normalizeTimeline(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function(item) {
      if (!item || typeof item !== "object") return null;
      var text = str(item.text, 320).trim();
      if (!text) return null;
      return { when: str(item.when, 40).trim(), text };
    }).filter(Boolean).slice(0, 12);
  }
  function normalizeDetails(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function(item) {
      if (typeof item === "string") return item.trim() ? { text: str(item, 240).trim(), source: "" } : null;
      if (!item || typeof item !== "object") return null;
      var text = str(item.text, 240).trim();
      if (!text) return null;
      return { text, source: str(item.source, 40).trim() };
    }).filter(Boolean).slice(0, 5);
  }
  function normalizeSurprise(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var gift = src.gift && typeof src.gift === "object" ? src.gift : {};
    var audio = src.audio && typeof src.audio === "object" ? src.audio : {};
    return {
      letter: normalizeLetter(src.letter),
      gift: {
        name: str(gift.name, 60).trim(),
        desc: str(gift.desc, 600).trim()
      },
      timeline: normalizeTimeline(src.timeline),
      details: normalizeDetails(src.details),
      cardHtml: typeof src.cardHtml === "string" ? src.cardHtml : "",
      cardStyleId: str(src.cardStyleId, 24),
      generatedAt: Number(src.generatedAt) || 0,
      audio: {
        url: typeof audio.url === "string" ? audio.url : "",
        voiceId: str(audio.voiceId, 80),
        at: Number(audio.at) || 0
      }
    };
  }
  function normalizePlan(raw) {
    if (!raw || typeof raw !== "object") return null;
    var date = isValidDateKey(raw.date) ? raw.date : "";
    if (!date) return null;
    var prepare = raw.prepare && typeof raw.prepare === "object" ? raw.prepare : {};
    var reveal = raw.reveal && typeof raw.reveal === "object" ? raw.reveal : {};
    var chatCard = raw.chatCard && typeof raw.chatCard === "object" ? raw.chatCard : {};
    var nextYearNote = raw.nextYearNote && typeof raw.nextYearNote === "object" ? raw.nextYearNote : {};
    return {
      id: str(raw.id, 40) || uid(),
      characterId: str(raw.characterId, 60),
      characterName: str(raw.characterName, 60),
      characterAvatar: str(raw.characterAvatar, 400),
      type: pick(raw.type, TYPE_IDS, "custom"),
      title: str(raw.title, 40).trim() || "纪念日",
      date,
      recurrence: pick(raw.recurrence, RECURRENCE_IDS, "yearly"),
      secrecy: pick(raw.secrecy, SECRECY_IDS, "hint"),
      createdAt: Number(raw.createdAt) || 0,
      updatedAt: Number(raw.updatedAt) || 0,
      archived: !!raw.archived,
      prepare: {
        originDate: isValidDateKey(prepare.originDate) ? prepare.originDate : date,
        lastTickDay: isValidDateKey(prepare.lastTickDay) ? prepare.lastTickDay : "",
        scriptedAt: Number(prepare.scriptedAt) || 0,
        stages: normalizeStages(prepare.stages)
      },
      surprise: normalizeSurprise(raw.surprise),
      reveal: {
        unlockedAt: Number(reveal.unlockedAt) || 0,
        sealed: reveal.sealed === void 0 ? true : !!reveal.sealed
      },
      nextYearNote: {
        text: str(nextYearNote.text, 140).trim(),
        at: Number(nextYearNote.at) || 0
      },
      chatCard: {
        messageId: str(chatCard.messageId, 60),
        sentDay: str(chatCard.sentDay, 10)
      }
    };
  }
  function normalizePlans(raw) {
    if (!Array.isArray(raw)) return [];
    var seen = {};
    var out = [];
    raw.forEach(function(item) {
      var plan = normalizePlan(item);
      if (!plan || seen[plan.id]) return;
      seen[plan.id] = true;
      out.push(plan);
    });
    return out;
  }
  function occurrenceKey(plan, now) {
    var nowKey = todayKey(now);
    if (!plan || plan.recurrence !== "yearly") return plan ? plan.date : nowKey;
    var base = plan.date;
    var parts = base.split("-");
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    var todayYear = Number(nowKey.slice(0, 4));
    var y = Math.max(year, todayYear);
    for (var i = 0; i < 3; i++) {
      var key = y + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
      if (!isValidDateKey(key)) key = toDateKey(new Date(y, month - 1, day - 1, 12));
      if (key >= nowKey) return key;
      y += 1;
    }
    return base;
  }
  function daysLeft(plan, now) {
    if (!plan) return NaN;
    var target = occurrenceKey(plan, now);
    return daysBetween(todayKey(now), target);
  }
  function isRevealDay(plan, now) {
    var left = daysLeft(plan, now);
    return isFinite(left) && left <= 0;
  }
  function planIndex(plan, now) {
    return anniversaryIndex(plan.date, occurrenceKey(plan, now));
  }
  function tickPlan(plan, now) {
    if (!plan) return { plan, changed: false };
    var left = daysLeft(plan, now);
    if (!isFinite(left)) return { plan, changed: false };
    var at = typeof now === "number" ? now : Date.now();
    var changed = false;
    var today = todayKey(at);
    var stages = plan.prepare.stages.map(function(stage) {
      if (stage.doneAt) return stage;
      if (left > stage.offsetDays) return stage;
      changed = true;
      return Object.assign({}, stage, { doneAt: at });
    });
    if (!changed && plan.prepare.lastTickDay === today) return { plan, changed: false };
    return {
      plan: Object.assign({}, plan, {
        prepare: Object.assign({}, plan.prepare, {
          stages,
          lastTickDay: today
        })
      }),
      changed: true
    };
  }
  function tickPlans(plans, now) {
    var changed = false;
    var out = plans.map(function(plan) {
      var res = tickPlan(plan, now);
      if (res.changed) changed = true;
      return res.plan;
    });
    return { plans: changed ? out : plans, changed };
  }
  function prepareProgress(plan, now) {
    var stages = plan && plan.prepare ? plan.prepare.stages : [];
    var total = stages.length;
    var done = 0;
    var left = daysLeft(plan, now);
    stages.forEach(function(stage) {
      if (stage.doneAt || isFinite(left) && left <= stage.offsetDays) done += 1;
    });
    return {
      done,
      total,
      ratio: total ? done / total : 0
    };
  }
  function sortPlans(plans, now) {
    return plans.slice().sort(function(a, b) {
      if (!!a.archived !== !!b.archived) return a.archived ? 1 : -1;
      var da = daysLeft(a, now);
      var db = daysLeft(b, now);
      if (da === db) return (a.createdAt || 0) - (b.createdAt || 0);
      return da - db;
    });
  }
  function activePlans(plans, now) {
    return sortPlans(plans.filter(function(p) {
      return !p.archived;
    }), now);
  }
  function findPlan(plans, id) {
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === id) return plans[i];
    }
    return null;
  }
  function upsertPlan(plans, plan) {
    var list = plans.slice();
    var index = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === plan.id) {
        index = i;
        break;
      }
    }
    if (index === -1) list.push(plan);
    else list[index] = plan;
    return list;
  }
  function removePlan(plans, id) {
    return plans.filter(function(p) {
      return p.id !== id;
    });
  }

  // src/core/settings.js
  var SCHEMA_VERSION = 1;
  var CARD_STYLES = [
    { id: "envelope", label: "信封" },
    { id: "polaroid", label: "拍立得" },
    { id: "starry", label: "星空" }
  ];
  var LIMITS = {
    dailyLimit: [1, 200],
    temperature: [0, 1.5]
  };
  function defaultSettings() {
    return {
      schemaVersion: SCHEMA_VERSION,
      ai: {
        enabled: true,
        dailyLimit: 30,
        temperature: 0.85
      },
      defaultSecrecy: "hint",
      cardStyle: "envelope",
      theme: "auto"
    };
  }
  function clampInt(value, fallback, range) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    n = Math.round(n);
    if (n < range[0]) return range[0];
    if (n > range[1]) return range[1];
    return n;
  }
  function clampNum(value, fallback, range) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    if (n < range[0]) return range[0];
    if (n > range[1]) return range[1];
    return n;
  }
  function pick2(value, list, fallback) {
    return list.indexOf(value) === -1 ? fallback : value;
  }
  function mergeSettings(raw) {
    var def = defaultSettings();
    if (!raw || typeof raw !== "object") return def;
    var ai = raw.ai && typeof raw.ai === "object" ? raw.ai : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      ai: {
        enabled: typeof ai.enabled === "boolean" ? ai.enabled : def.ai.enabled,
        dailyLimit: clampInt(ai.dailyLimit, def.ai.dailyLimit, LIMITS.dailyLimit),
        temperature: clampNum(ai.temperature, def.ai.temperature, LIMITS.temperature)
      },
      defaultSecrecy: pick2(raw.defaultSecrecy, SECRECY_IDS, def.defaultSecrecy),
      cardStyle: pick2(raw.cardStyle, CARD_STYLES.map(function(s) {
        return s.id;
      }), def.cardStyle),
      theme: raw.theme === "dark" || raw.theme === "light" ? raw.theme : "auto"
    };
  }
  function patchSettings(settings, patch) {
    var base = settings || defaultSettings();
    var next = Object.assign({}, base);
    Object.keys(patch || {}).forEach(function(key) {
      var value = patch[key];
      var current = base[key];
      if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)) {
        next[key] = Object.assign({}, current, value);
      } else {
        next[key] = value;
      }
    });
    return mergeSettings(next);
  }

  // src/services/store.js
  var KEYS = {
    settings: "ac:settings",
    plans: "ac:plans",
    meta: "ac:meta"
  };
  function normalizeMeta(raw) {
    var meta = raw && typeof raw === "object" ? raw : {};
    var ai = meta.ai && typeof meta.ai === "object" ? meta.ai : {};
    var day = typeof ai.day === "string" ? ai.day : "";
    var count = Number(ai.count);
    return {
      ai: {
        day,
        count: isFinite(count) && count > 0 ? Math.floor(count) : 0
      },
      lastOpenAt: Number(meta.lastOpenAt) || 0,
      pendingOpen: typeof meta.pendingOpen === "string" ? meta.pendingOpen.slice(0, 40) : "",
      pendingReveal: typeof meta.pendingReveal === "string" ? meta.pendingReveal.slice(0, 40) : ""
    };
  }
  function createStore(host) {
    async function loadSettings() {
      return mergeSettings(await host.storage.get(KEYS.settings));
    }
    async function saveSettings(settings) {
      return host.storage.set(KEYS.settings, settings);
    }
    async function loadPlans() {
      return normalizePlans(await host.storage.get(KEYS.plans));
    }
    async function savePlans(plans) {
      return host.storage.set(KEYS.plans, plans || []);
    }
    async function loadMeta() {
      return normalizeMeta(await host.storage.get(KEYS.meta));
    }
    async function saveMeta(meta) {
      return host.storage.set(KEYS.meta, meta);
    }
    async function exportAll() {
      return {
        plugin: "anniversary-companion",
        version: 1,
        exportedAt: Date.now(),
        settings: await host.storage.get(KEYS.settings),
        plans: await host.storage.get(KEYS.plans),
        meta: await host.storage.get(KEYS.meta)
      };
    }
    async function clearAll() {
      await host.storage.remove(KEYS.plans);
      await host.storage.remove(KEYS.meta);
      return true;
    }
    return {
      loadSettings,
      saveSettings,
      loadPlans,
      savePlans,
      loadMeta,
      saveMeta,
      exportAll,
      clearAll,
      todayKey
    };
  }

  // src/core/json.js
  function parseJsonLoose(raw) {
    if (raw === null || raw === void 0) return null;
    var text = String(raw).trim();
    if (!text) return null;
    var fence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text);
    if (fence) text = fence[1].trim();
    var start = text.indexOf("{");
    var end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    var slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (e) {
    }
    var repaired = slice.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(repaired);
    } catch (e) {
      return null;
    }
  }
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }
  function asText(value, max) {
    if (value === null || value === void 0) return "";
    var text = typeof value === "string" ? value : String(value.text || value.content || "");
    text = text.replace(/\s+/g, " ").trim();
    var limit = Number(max) || 200;
    return text.length > limit ? text.slice(0, limit) : text;
  }

  // src/services/ai.js
  function createAi(options) {
    var host = options.host;
    var getSettings = options.getSettings;
    var getMeta = options.getMeta;
    var saveMeta = options.saveMeta;
    var queue = Promise.resolve();
    var stats = { calls: 0, lastReason: "" };
    function settings() {
      return getSettings() || { ai: { enabled: true, dailyLimit: 30, temperature: 0.85 } };
    }
    function usedToday() {
      var meta = getMeta();
      var today = todayKey(Date.now());
      if (!meta || !meta.ai || meta.ai.day !== today) return 0;
      return Number(meta.ai.count) || 0;
    }
    function left() {
      var conf = settings().ai || {};
      return Math.max(0, (Number(conf.dailyLimit) || 0) - usedToday());
    }
    function markUse() {
      var meta = getMeta() || {};
      var today = todayKey(Date.now());
      var count = usedToday() + 1;
      var next = Object.assign({}, meta, { ai: { day: today, count } });
      saveMeta(next);
      stats.calls += 1;
    }
    function chat(messages, opts) {
      var conf = settings().ai || {};
      var input = opts || {};
      if (!conf.enabled) return Promise.resolve({ ok: false, reason: "ai_off" });
      if (!host.caps.ai) return Promise.resolve({ ok: false, reason: "no_api" });
      if (left() <= 0) return Promise.resolve({ ok: false, reason: "quota" });
      var run = queue.then(function() {
        if (left() <= 0) return { ok: false, reason: "quota" };
        markUse();
        return host.ai.chat({
          messages,
          temperature: typeof input.temperature === "number" ? input.temperature : conf.temperature
        }).then(function(res) {
          if (!res || !res.ok) {
            stats.lastReason = res && res.reason || "error";
            return { ok: false, reason: stats.lastReason };
          }
          return res;
        });
      });
      queue = run.catch(function() {
        return null;
      });
      return run;
    }
    async function chatJson(messages, opts) {
      var res = await chat(messages, opts);
      if (!res.ok) return res;
      var data = parseJsonLoose(res.text);
      if (!data || typeof data !== "object") return { ok: false, reason: "parse", raw: res.text };
      return { ok: true, data, raw: res.text };
    }
    return {
      chat,
      chatJson,
      left,
      used: usedToday,
      stats
    };
  }

  // src/core/templates.js
  var TYPES = [
    {
      id: "met",
      label: "相识",
      title: "我们认识的那天",
      tone: "温柔、带着回忆的暖，像重新讲一遍第一次见面的细节",
      seal: "rose"
    },
    {
      id: "confession",
      label: "告白",
      title: "我说出口的那天",
      tone: "郑重又克制，心跳被压低了声音，句子短而慢",
      seal: "gold"
    },
    {
      id: "first-date",
      label: "第一次约会",
      title: "我们第一次单独出去",
      tone: "明亮、具体，记得天气、走路的方向和当时吃的东西",
      seal: "peach"
    },
    {
      id: "birthday",
      label: "生日",
      title: "你的生日",
      tone: "轻快、纵容，允许自己说一点撒娇的话",
      seal: "rose"
    },
    {
      id: "custom",
      label: "自定义",
      title: "我们的纪念日",
      tone: "自然、真诚，像面对面把话说完",
      seal: "rose"
    }
  ];
  function typeOf(id) {
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].id === id) return TYPES[i];
    }
    return TYPES[TYPES.length - 1];
  }
  var SEALS = {
    rose: { ink: "#C9605A", paper: "#FBEFEC" },
    gold: { ink: "#C9A227", paper: "#FBF5E4" },
    peach: { ink: "#E8A08B", paper: "#FCF2ED" }
  };
  function sealOf(plan) {
    var type = typeOf(plan && plan.type);
    return SEALS[type.seal] || SEALS.rose;
  }
  var FALLBACK_STAGES = {
    met: [
      "把那天走的那条路又走了一遍，回来的时候口袋里多了一颗糖。",
      "翻到一张很久以前的截图，看了很久，最后没有删掉。",
      "在一张纸上写你当时的表情，写完又觉得写得不像。",
      "找了一家安静的店，问了几个看起来很奇怪的问题。",
      "把要说的话在心里过了三遍，删掉两句，又加回来一句。",
      "东西差不多准备好了，剩下最后一点要留到当天。",
      "把桌面收拾干净了，明天想好好说话。",
      "今天什么都没做，只是等着。"
    ],
    confession: [
      "把想说的那句话写下来，又划掉，换了个开头。",
      "反复听一首歌，听到某一句的时候停下来。",
      "在抽屉里腾出一个位置，放进去一样东西。",
      "练了一遍怎么开口，对着空房间说的。",
      "把日期在日历上圈起来，圈得很轻。",
      "开始担心当天会不会太紧张。",
      "把要说的话压缩成三句，剩下两句留到以后。",
      "准备完了，剩下的交给那天。"
    ],
    "first-date": [
      "去那家店看了一眼，确认它还在。",
      "想起那天点的是什么，顺手记在备忘录里。",
      "试着复刻一次当时的味道，失败了两次。",
      "查了一下那天的天气，居然记得比预报还清楚。",
      "准备了一点小东西，不大，能放进口袋。",
      "把路线在脑子里走了一遍，连拐弯都想好了。",
      "把要穿的衣服提前拿出来挂好。",
      "都准备好了，只差把这一天重新过一遍。"
    ],
    birthday: [
      "偷偷问了一句你喜欢什么，问得很随意。",
      "在网上翻到一样东西，加购之后又看了三遍。",
      "练习了一次怎么把礼物藏起来。",
      "开始想蛋糕上要写什么字，写了七八个都不满意。",
      "把当天的时间空出来了，没告诉任何人。",
      "差一点说漏嘴，及时把话咽回去了。",
      "东西到手了，藏在你看不到的地方。",
      "就等那天了。"
    ],
    custom: [
      "在想要怎么把这一天变得不一样。",
      "找了一件小事做，当作准备的一部分。",
      "把想说的话写下来，留着当天再给你看。",
      "重新看了一遍你们之间的一些记录。",
      "把东西收好，确认不会被提前发现。",
      "开始期待那天到来。",
      "准备得差不多了，还有点小紧张。",
      "今天只做了一件事：等。"
    ]
  };
  function linesFor(type) {
    return FALLBACK_STAGES[type] || FALLBACK_STAGES.custom;
  }
  function fallbackStages(type, offsets, charName) {
    var lines = linesFor(type);
    var name = charName || "TA";
    return (offsets || []).map(function(offset, i) {
      var line = lines[i % lines.length];
      var teaser = offset === 0 ? name + "说今天有东西要给你" : offset <= 3 ? "手邊的东西快收尾了" : "又在偷偷忙一点什么";
      return {
        offsetDays: offset,
        teaser,
        detail: line,
        doneAt: 0
      };
    });
  }
  var NEAR_LINES = {
    7: "他把东西藏起来了",
    3: "开始有点坐不住",
    1: "明天就是",
    0: "就是今天"
  };
  function nearLine(days) {
    if (days === 0) return NEAR_LINES[0];
    if (days === 1) return NEAR_LINES[1];
    if (days === 3) return NEAR_LINES[3];
    if (days === 7) return NEAR_LINES[7];
    return "";
  }
  var TYPE_PILLS = TYPES.map(function(t) {
    return { id: t.id, label: t.label };
  });

  // src/core/prompts.js
  var PATTERN = /\{\{(\w+)\}\}/g;
  function renderPrompt(template, vars) {
    return String(template || "").replace(PATTERN, function(match, key) {
      var v = vars ? vars[key] : "";
      return v === void 0 || v === null ? "" : String(v);
    });
  }
  var BASE_RULES = [
    "你正在为一个角色扮演插件写内容，服务对象是真实用户，不是做数据分析。",
    "硬性要求：",
    "1. 只用中文，第一人称（我就是这个角色），口语，不写书面总结。",
    "2. 不出现「AI」「模型」「提示词」「token」「记忆库」这类词，也不要说「根据你的记忆」。",
    "3. 不编造资料里没有的具体事实、日期、地点、人物；资料没写就只写感受和动作。",
    "4. 不用 Markdown，不写标题层级、不加粗、不列点。",
    "5. 只输出 JSON，不要解释，不要 ``` 代码块包裹。"
  ].join("\n");
  var SUGGEST_SYSTEM = "你是一个擅长从聊天记录里找出「对这两个人有意义的日子」的助手。\n" + BASE_RULES + "\n" + [
    "输出格式（严格 JSON）：",
    '{"candidates":[{"title":"4-8字的中文名称","date":"YYYY-MM-DD","evidence":"30字以内的依据，引用资料里的细节","confidence":1}]}',
    "confidence 取 1-5 的整数，5 表示资料里明确写了日期。",
    "date 规则：能确定最初发生的年份就用那一年；只能确定月日时用今年。必须是合法日期。",
    "最多 4 个，最少 1 个；不要给重复的日期。"
  ].join("\n");
  function suggestMessages(input) {
    var content = renderPrompt([
      "【今天是】{{today}}",
      "【角色】{{char}}",
      "【角色人设】{{char_persona}}",
      "【用户】{{user}}",
      "【用户人设】{{user_persona}}",
      "",
      "【长期记忆】",
      "{{memory}}",
      "",
      "【最近对话】",
      "{{recent}}",
      "",
      "请从上面这些资料里，找出可能值得做成纪念日的日子（相识、告白、第一次约会、生日、一起经历的某件事）。",
      "每条要有明确依据；找不到就只给最有把握的那一个。"
    ].join("\n"), input || {});
    return [
      { role: "system", content: SUGGEST_SYSTEM },
      { role: "user", content }
    ];
  }
  var PREPARE_SYSTEM = "你是一个角色扮演写手，擅长写「偷偷准备惊喜的人」的日常横切面。\n" + BASE_RULES + "\n" + [
    "输出格式（严格 JSON）：",
    '{"stages":[{"teaser":"16字以内的状态，不剧透内容","detail":"40字以内，具体做了什么"}]}',
    "stages 的数量必须和给定阶段数完全一致，顺序对应。",
    "teaser 是别人能看到的模糊状态，例如「手边的东西快收尾了」「今天有点坐不住」；不能出现礼物名称。",
    "detail 是角色自己的内心记录，可以写小动作、犹豫、练习、藏东西，但不能提前说出惊喜内容。",
    "每个阶段都要有推进感，不要重复同一个动作。"
  ].join("\n");
  function prepareMessages(input) {
    var stagesText = (input.stages || []).map(function(offset, i) {
      return "第 " + (i + 1) + " 个阶段：距离纪念日还有 " + offset + " 天";
    }).join("\n");
    var content = renderPrompt([
      "【今天是】{{today}}",
      "【角色】{{char}}",
      "【角色人设】{{char_persona}}",
      "【用户】{{user}}",
      "【这个日子】{{title}}（{{date}}，第 {{index}} 个）",
      "【语气基调】{{tone}}",
      "",
      "【我们之间记得的事】",
      "{{memory}}",
      "",
      "【准备阶段】",
      "{{stages}}",
      "",
      "请按阶段写这次的准备过程。最后一个阶段（0 天）就是当天，写他准备好的那一刻。"
    ].join("\n"), Object.assign({ stages: stagesText }, input || {}));
    return [
      { role: "system", content: PREPARE_SYSTEM },
      { role: "user", content }
    ];
  }
  var SURPRISE_SYSTEM = "你是一个角色扮演写手，负责写纪念日当天揭晓的惊喜内容。\n" + BASE_RULES + "\n" + [
    "输出格式（严格 JSON）：",
    '{"letter":[{"title":"小标题","body":"一段话"}],"gift":{"name":"礼物名","desc":"礼物说明"},"timeline":[{"when":"时间标记","text":"一句话回忆"}],"details":[{"text":"他记得的一件小事"}]}',
    "letter 写 3-4 段，每段 60-120 字；第一段要接住「去年写给今年的话」（如果有）。",
    "gift 要像真的准备了东西，可以是实物也可以是做过的事；desc 40-80 字。",
    "timeline 取 3-6 条，when 用「第一次」「某个雨天」「去年冬天」这类相对时间，不要编具体日期。",
    "details 取 2-3 条，写「他记得但你可能忘了」的细节，每条 20-40 字，要具体到动作或一句话。",
    "整体语气：{{tone}}。"
  ].join("\n");
  function surpriseMessages(input) {
    var content = renderPrompt([
      "【今天是】{{today}}",
      "【角色】{{char}}",
      "【角色人设】{{char_persona}}",
      "【用户】{{user}}",
      "【用户人设】{{user_persona}}",
      "",
      "【这个日子】{{title}}（{{date}}，第 {{index}} 个）",
      "【保密度】{{secrecy}}",
      "【语气基调】{{tone}}",
      "【去年写给今年的话】{{last_year_note}}",
      "",
      "【我们之间记得的事】",
      "{{memory}}",
      "",
      "【最近对话】",
      "{{recent}}",
      "",
      "【他这些天做的准备】",
      "{{stages}}",
      "",
      "请把惊喜内容写出来。写信的时候，就当用户正站在你面前拆开它。"
    ].join("\n"), input || {});
    return [
      { role: "system", content: SURPRISE_SYSTEM },
      { role: "user", content }
    ];
  }
  var CARD_SYSTEM = [
    "你是一个擅长做「纸质贺卡」的前端设计师，输出会被放进一个沙箱 iframe 里运行。",
    "",
    "硬性技术约束（违反任何一条，整张卡会被丢弃）：",
    "1. 只输出一个完整的 HTML 文档，从 <!DOCTYPE html> 开始，不要解释、不要 ``` 代码块。",
    "2. 所有样式写在文档内的 <style>，所有脚本写在文档内的 <script>；不允许出现 src=、href=、<link、<iframe、<form、<object、<embed、<base。",
    "3. 不允许联网：不能出现 fetch、XMLHttpRequest、WebSocket、sendBeacon、import(、importScripts。",
    "4. 不允许访问宿主：不能出现 localStorage、sessionStorage、indexedDB、document.cookie、parent.document、top.document、window.top。",
    "5. 不能用外部字体与外部图片。需要纹理用 repeating-linear-gradient、radial-gradient 或内联 SVG。",
    "6. 尺寸自适应：html,body{width:100%;margin:0}，卡片内容宽度 100%，不要写固定 width:375px 之类的手机外壳，不要写 position:fixed 全屏遮罩。",
    "7. 深浅色都要能看：背景用 var(--ac-paper, #FAF7F2)，文字用 var(--ac-ink, #2B2320)；深色由外部变量覆盖，你只要给出浅色兜底值。",
    "8. 必须支持 prefers-reduced-motion：动画在 reduce 时全部关闭。",
    "",
    "交互契约：",
    "- 只允许「点击 / 长按 / 拖动」这类本地交互，典型是打开信封、翻一页、点亮蜡烛、放一束烟花，不要做输入表单。",
    '- 打开完成后调用一次 window.parent.postMessage({type:"ac-card",action:"done",payload:{}}, "*")。',
    '- 页面渲染完成与每次内容高度变化后调用 window.parent.postMessage({type:"ac-card",action:"height",payload:{height:document.documentElement.scrollHeight}}, "*")。',
    "- 不要依赖宿主返回任何数据，所有文案都写在卡片里。",
    "",
    "设计要求：",
    "- 视觉方向：温暖纸感、私人纪念册、克制留白、细描边、胭脂红 #C9605A 点缀。",
    "- 卡片高度控制在 380-720px 之间，打开前后高度变化不要超过 40%。",
    "- 文字用衬线标题 + 无衬线正文，字号层级清楚，不要堆满屏。",
    "- 不要用大段文字，正文合计不超过 120 字。"
  ].join("\n");
  function cardMessages(input) {
    var content = renderPrompt([
      "请做一张纪念日贺卡。",
      "",
      "【风格】{{style}}",
      "【纪念日】{{title}}（{{date}}，第 {{index}} 个）",
      "【主角】{{char}} 写给 {{user}}",
      "【卡片上的话】{{excerpt}}",
      "【配色倾向】{{seal}}",
      "",
      "风格说明：",
      "- 信封：米白纸面、折角封口、点击后信纸抽出；适合温柔克制。",
      '- 拍立得：白框相纸、渐变"照片"区域、手写风标注；适合具体明亮的回忆。',
      "- 星空：深色底、点状星芒、文字像被月光照着；适合郑重的话。",
      "",
      "只输出 HTML。"
    ].join("\n"), input || {});
    return [
      { role: "system", content: CARD_SYSTEM },
      { role: "user", content }
    ];
  }
  function dateText(key) {
    return cnDate(key);
  }

  // src/services/prepare.js
  function stageOffsetsFor(plan, now) {
    var left = daysLeft(plan, now);
    return stageOffsets(Math.max(0, isFinite(left) ? left : 0));
  }
  function displayName(char, fallback) {
    if (!char) return fallback || "TA";
    return char.handle || char.name || fallback || "TA";
  }
  async function generateScript(input) {
    var ai = input.ai;
    var plan = input.plan;
    var char = input.char;
    var now = input.now;
    var offsets = stageOffsetsFor(plan, now);
    var local = fallbackStages(plan.type, offsets, displayName(char));
    if (!ai) return { stages: local, source: "fallback", reason: "no_ai" };
    var type = typeOf(plan.type);
    var occurrence = occurrenceKey(plan, now);
    var prompt = prepareMessages({
      today: cnDate(todayKey(now)),
      char: displayName(char),
      char_persona: String(char && (char.persona || char.bio) || "").slice(0, 900),
      user: input.userName || "你",
      title: plan.title,
      date: cnDate(occurrence),
      index: String(planIndex(plan, now)),
      tone: type.tone,
      memory: String(input.memoryText || "（暂无记录，可以只写动作和心情）").slice(0, 1800),
      stages: offsets
    });
    var res = await ai.chatJson(prompt, { temperature: 0.9 });
    if (!res.ok) return { stages: local, source: "fallback", reason: res.reason };
    var rawStages = asArray(res.data.stages);
    if (!rawStages.length) return { stages: local, source: "fallback", reason: "empty_stages" };
    var stages = offsets.map(function(offset, i) {
      var item = rawStages[i] || {};
      var teaser = asText(item.teaser, 60) || local[i].teaser;
      var detail = asText(item.detail, 160) || local[i].detail;
      return {
        offsetDays: offset,
        teaser,
        detail,
        doneAt: 0
      };
    });
    return { stages, source: "ai" };
  }
  function applyScript(plan, stages, now) {
    var at = typeof now === "number" ? now : Date.now();
    var old = {};
    (plan.prepare.stages || []).forEach(function(stage) {
      old[stage.offsetDays] = stage.doneAt;
    });
    var next = stages.map(function(stage) {
      return Object.assign({}, stage, {
        doneAt: stage.doneAt || old[stage.offsetDays] || 0
      });
    });
    return Object.assign({}, plan, {
      prepare: Object.assign({}, plan.prepare, {
        stages: next,
        scriptedAt: at,
        lastTickDay: ""
      }),
      updatedAt: at
    });
  }

  // src/core/cardSafety.js
  var MAX_HTML_BYTES = 6e4;
  var CSP = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "media-src data: blob:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'"
  ].join("; ");
  var RULES = [
    { re: /<script[^>]*\ssrc\s*=/i, reason: "external-script" },
    { re: /<link\b/i, reason: "external-link" },
    { re: /<iframe\b/i, reason: "iframe" },
    { re: /<object\b/i, reason: "object" },
    { re: /<embed\b/i, reason: "embed" },
    { re: /<form\b/i, reason: "form" },
    { re: /<base\b/i, reason: "base" },
    { re: /<meta[^>]+http-equiv\s*=\s*["']?refresh/i, reason: "meta-refresh" },
    { re: /<\w+[^>]*\b(src|href|action)\s*=\s*["']?\s*(https?:|\/\/)/i, reason: "remote-asset" },
    { re: /url\(\s*['"]?\s*(https?:|\/\/)/i, reason: "remote-css-url" },
    { re: /javascript\s*:/i, reason: "javascript-protocol" },
    { re: /vbscript\s*:/i, reason: "vbscript-protocol" },
    { re: /\bfetch\s*\(/i, reason: "fetch" },
    { re: /XMLHttpRequest/i, reason: "xhr" },
    { re: /WebSocket/i, reason: "websocket" },
    { re: /sendBeacon/i, reason: "beacon" },
    { re: /importScripts/i, reason: "import-scripts" },
    { re: /\bimport\s*\(/i, reason: "dynamic-import" },
    { re: /localStorage/i, reason: "local-storage" },
    { re: /sessionStorage/i, reason: "session-storage" },
    { re: /indexedDB/i, reason: "indexed-db" },
    { re: /document\s*\.\s*cookie/i, reason: "cookie" },
    { re: /(parent|top)\s*\.\s*document/i, reason: "parent-dom" },
    { re: /(parent|top)\s*\.\s*location/i, reason: "parent-location" }
  ];
  function stripFence(raw) {
    var text = String(raw == null ? "" : raw).trim();
    var fence = /```(?:html|HTML)?\s*([\s\S]*?)```/.exec(text);
    if (fence) text = fence[1].trim();
    var start = text.search(/<!doctype html|<html[\s>]/i);
    if (start > 0) text = text.slice(start);
    return text.trim();
  }
  function injectMeta(html) {
    var meta = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '"><meta name="viewport" content="width=device-width, initial-scale=1">';
    var headOpen = /<head[^>]*>/i.exec(html);
    if (headOpen) {
      var at = headOpen.index + headOpen[0].length;
      return html.slice(0, at) + meta + html.slice(at);
    }
    var htmlOpen = /<html[^>]*>/i.exec(html);
    if (htmlOpen) {
      var pos = htmlOpen.index + htmlOpen[0].length;
      return html.slice(0, pos) + "<head>" + meta + "</head>" + html.slice(pos);
    }
    return "<!DOCTYPE html><html><head>" + meta + "</head><body>" + html + "</body></html>";
  }
  function sanitizeCard(raw) {
    var text = stripFence(raw);
    if (!text) return { ok: false, html: "", reason: "empty" };
    if (text.length > MAX_HTML_BYTES) return { ok: false, html: "", reason: "too-large" };
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(text)) {
        return { ok: false, html: "", reason: RULES[i].reason };
      }
    }
    if (!/<html[\s>]/i.test(text)) {
      text = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + text + "</body></html>";
    } else if (!/<meta[^>]+charset/i.test(text)) {
      text = text.replace(/<head[^>]*>/i, function(m) {
        return m + '<meta charset="utf-8">';
      });
    }
    return { ok: true, html: injectMeta(text), reason: "ok" };
  }
  function prepareTrustedCard(html) {
    var text = String(html || "");
    if (!text) return "";
    if (!/<html[\s>]/i.test(text)) {
      text = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + text + "</body></html>";
    }
    if (/Content-Security-Policy/i.test(text)) return text;
    return injectMeta(text);
  }

  // src/core/cardTemplates.js
  var BRIDGE = [
    "function post(action, payload){",
    '  try{ parent.postMessage({type:"ac-card",action:action,payload:payload||{}}, "*"); }catch(e){}',
    "}",
    "function sendHeight(){",
    '  post("height", { height: Math.max(320, document.documentElement.scrollHeight) });',
    "}",
    'window.addEventListener("load", sendHeight);',
    "setTimeout(sendHeight, 60);",
    "setTimeout(sendHeight, 400);",
    'window.addEventListener("resize", sendHeight);'
  ].join("\n");
  var BASE = [
    "*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}",
    "html,body{margin:0;width:100%;background:transparent}",
    'body{font-family:-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:var(--ac-ink,#2B2320);}',
    '.serif{font-family:"Iowan Old Style","Songti SC","Noto Serif SC",STSong,serif;}',
    "@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}"
  ].join("\n");
  function dataOf(data) {
    var d = data || {};
    return {
      char: escapeHtml(d.char || "TA"),
      title: escapeHtml(d.title || "我们的纪念日"),
      date: escapeHtml(d.date || ""),
      index: escapeHtml(String(d.index || 1)),
      line: escapeHtml(d.line || ""),
      note: escapeHtml(d.note || "")
    };
  }
  function shell(css, body, script) {
    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<style>" + BASE + "\n" + css + "</style>",
      "</head><body>",
      body,
      "<script>" + BRIDGE + "\n" + (script || "") + "<\/script>",
      "</body></html>"
    ].join("\n");
  }
  function envelopeCard(data) {
    var d = dataOf(data);
    var css = [
      ".wrap{padding:22px 20px 26px;display:flex;flex-direction:column;align-items:center;gap:16px;}",
      ".env{position:relative;width:100%;max-width:340px;aspect-ratio:1.55/1;border-radius:6px;",
      "  background:linear-gradient(165deg,#FBEFEC 0%,#F6E7E2 60%,#F2DFD9 100%);",
      "  border:1px solid #E2CDC6;box-shadow:0 10px 26px rgba(43,35,32,.10);cursor:pointer;",
      "  transition:transform .5s cubic-bezier(.2,.8,.2,1);}",
      ".env:active{transform:scale(.995)}",
      '.env::before{content:"";position:absolute;inset:0;border-radius:6px;',
      "  background:linear-gradient(135deg,rgba(255,255,255,.6),transparent 55%);pointer-events:none}",
      ".flap{position:absolute;left:0;right:0;top:0;height:56%;",
      "  background:linear-gradient(180deg,#F3E3DE,#EBD6CF);",
      "  clip-path:polygon(0 0,100% 0,50% 100%);",
      "  transform-origin:top center;transition:transform .62s cubic-bezier(.2,.8,.2,1);}",
      ".card{position:absolute;left:12%;right:12%;top:26%;height:62%;border-radius:4px;",
      "  background:#FFFDF9;border:1px solid #EADFD6;box-shadow:0 4px 12px rgba(43,35,32,.08);",
      "  transform:translateY(14%);opacity:.96;transition:transform .62s cubic-bezier(.2,.8,.2,1) .12s,opacity .4s;",
      "  padding:12px 14px;overflow:hidden;}",
      ".card .name{font-size:12px;letter-spacing:.08em;color:#B08A82}",
      ".card .line{margin-top:6px;font-size:15px;line-height:1.7;color:#4A3C36}",
      ".seal{position:absolute;left:50%;top:52%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;",
      "  background:radial-gradient(circle at 35% 30%,#D47A72,#B9504A);box-shadow:0 2px 6px rgba(120,40,35,.28);",
      "  display:flex;align-items:center;justify-content:center;color:#FBEFEC;font-size:15px;",
      '  font-family:"Songti SC",serif;transition:opacity .3s;}',
      ".head{text-align:center}",
      ".head .t{font-size:20px;letter-spacing:.01em}",
      ".head .d{margin-top:6px;font-size:12px;color:#7A6A62;letter-spacing:.06em}",
      ".hint{font-size:11px;letter-spacing:.14em;color:#9C8A81;text-transform:uppercase}",
      ".opened .flap{transform:rotateX(180deg)}",
      ".opened .card{transform:translateY(-6%);opacity:1}",
      ".opened .seal{opacity:0}",
      ".opened .hint{opacity:0;transition:opacity .2s}",
      ".sign{margin-top:2px;font-size:12px;color:#8A786F}"
    ].join("\n");
    var body = [
      '<div class="wrap">',
      '  <div class="head">',
      '    <div class="t serif">' + d.title + "</div>",
      '    <div class="d">' + d.char + " · 第 " + d.index + " 个纪念日 · " + d.date + "</div>",
      "  </div>",
      '  <div class="env" id="env">',
      '    <div class="card">',
      '      <div class="name">' + d.char + " 写给你</div>",
      '      <div class="line serif">' + (d.line || "这一封，我准备了很久。") + "</div>",
      '      <div class="sign">' + (d.note || "") + "</div>",
      "    </div>",
      '    <div class="flap"></div>',
      '    <div class="seal serif">喜</div>',
      "  </div>",
      '  <div class="hint">轻点信封拆开</div>',
      "</div>"
    ].join("\n");
    var script = [
      'var env=document.getElementById("env");',
      "var done=false;",
      'env.addEventListener("click",function(){',
      '  if(!done){done=true;env.classList.add("opened");post("done",{});}',
      '  else{env.classList.remove("opened");}',
      "  setTimeout(sendHeight, 120);",
      "  setTimeout(sendHeight, 700);",
      "});"
    ].join("\n");
    return shell(css, body, script);
  }
  function polaroidCard(data) {
    var d = dataOf(data);
    var css = [
      ".wrap{padding:22px 20px 28px;display:flex;flex-direction:column;align-items:center;gap:14px;}",
      ".photo{width:100%;max-width:310px;background:#FFFDF9;padding:14px 14px 0;",
      "  border:1px solid #EADFD6;box-shadow:0 12px 30px rgba(43,35,32,.12);transform:rotate(-1.2deg);}",
      ".frame{position:relative;width:100%;aspect-ratio:1/1.06;overflow:hidden;",
      "  background:linear-gradient(160deg,#F7D9C9 0%,#EFB9A6 42%,#D98D7E 70%,#8E5E58 100%);}",
      ".sun{position:absolute;width:96px;height:96px;border-radius:50%;left:58%;top:16%;",
      "  background:radial-gradient(circle at 50% 50%,rgba(255,248,236,.95),rgba(255,224,196,.35) 60%,transparent 72%);",
      "  filter:blur(.3px);}",
      ".horizon{position:absolute;left:0;right:0;bottom:0;height:38%;",
      "  background:linear-gradient(180deg,rgba(120,74,70,0),rgba(96,58,58,.55));}",
      ".grain{position:absolute;inset:0;opacity:.10;",
      "  background-image:radial-gradient(rgba(255,255,255,.9) .5px,transparent .6px);",
      "  background-size:3px 3px;mix-blend-mode:overlay;}",
      ".cap{padding:14px 2px 16px;text-align:center}",
      ".cap .t{font-size:15px;letter-spacing:.01em}",
      ".cap .d{margin-top:5px;font-size:11px;letter-spacing:.1em;color:#8A786F}",
      ".txt{width:100%;max-width:310px;text-align:center;font-size:14px;line-height:1.9;color:#5B4C45}",
      ".txt .q{display:block;margin-top:8px;font-size:12px;color:#9C8A81}"
    ].join("\n");
    var body = [
      '<div class="wrap">',
      '  <div class="photo">',
      '    <div class="frame"><div class="sun"></div><div class="horizon"></div><div class="grain"></div></div>',
      '    <div class="cap"><div class="t serif">' + d.title + "</div>",
      '      <div class="d">' + d.char + " · 第 " + d.index + " 个 · " + d.date + "</div></div>",
      "  </div>",
      '  <div class="txt serif">' + (d.line || "这一天，我想把光留在这里。"),
      '    <span class="q">' + (d.note || "") + "</span></div>",
      "</div>"
    ].join("\n");
    return shell(css, body, 'post("done",{});');
  }
  function starryCard(data) {
    var d = dataOf(data);
    var css = [
      ".wrap{position:relative;padding:34px 22px 30px;min-height:400px;overflow:hidden;",
      "  background:radial-gradient(120% 90% at 70% 8%,#2B2A44 0%,#1B1A2E 45%,#12111C 100%);",
      "  color:#F3EEE6;display:flex;flex-direction:column;justify-content:center;gap:16px;}",
      ".stars{position:absolute;inset:0;opacity:.75;",
      "  background-image:radial-gradient(1.6px 1.6px at 18% 22%,rgba(255,255,255,.9),transparent),",
      "  radial-gradient(1.2px 1.2px at 76% 16%,rgba(255,255,255,.75),transparent),",
      "  radial-gradient(1.4px 1.4px at 42% 62%,rgba(255,255,255,.8),transparent),",
      "  radial-gradient(1px 1px at 86% 54%,rgba(255,255,255,.6),transparent),",
      "  radial-gradient(1.2px 1.2px at 28% 84%,rgba(255,255,255,.7),transparent),",
      "  radial-gradient(1px 1px at 64% 88%,rgba(255,255,255,.55),transparent);",
      "  background-size:100% 100%;}",
      ".moon{position:absolute;right:18%;top:14%;width:56px;height:56px;border-radius:50%;",
      "  background:radial-gradient(circle at 36% 32%,#FFF6E2,#E7D4B4 62%,#C9B08A 100%);",
      "  box-shadow:0 0 40px rgba(255,236,200,.35);}",
      ".in{position:relative;z-index:1}",
      ".k{font-size:11px;letter-spacing:.18em;color:rgba(243,238,230,.62);text-transform:uppercase}",
      ".t{margin-top:10px;font-size:24px;line-height:1.34;letter-spacing:.01em}",
      ".body{margin-top:14px;font-size:14px;line-height:1.95;color:rgba(243,238,230,.86);max-width:30ch}",
      ".d{margin-top:18px;font-size:11px;letter-spacing:.1em;color:rgba(243,238,230,.55)}",
      ".sign{margin-top:6px;font-size:12px;color:rgba(243,238,230,.7)}",
      ".glow{position:absolute;left:50%;bottom:-40%;width:150%;height:70%;transform:translateX(-50%);",
      "  background:radial-gradient(ellipse at 50% 50%,rgba(201,96,90,.22),transparent 70%);}"
    ].join("\n");
    var body = [
      '<div class="wrap">',
      '  <div class="stars"></div><div class="moon"></div><div class="glow"></div>',
      '  <div class="in">',
      '    <div class="k">' + d.char + " · 第 " + d.index + " 个纪念日</div>",
      '    <div class="t serif">' + d.title + "</div>",
      '    <div class="body serif">' + (d.line || "有些日子，我把它放在了心里最亮的地方。") + "</div>",
      '    <div class="d">' + d.date + "</div>",
      '    <div class="sign serif">' + (d.note || "") + "</div>",
      "  </div>",
      "</div>"
    ].join("\n");
    return shell(css, body, 'post("done",{});');
  }
  var BUILDERS = {
    envelope: envelopeCard,
    polaroid: polaroidCard,
    starry: starryCard
  };
  function buildFallbackCard(styleId, data) {
    var fn = BUILDERS[styleId] || BUILDERS.envelope;
    return fn(data);
  }

  // src/core/memoryText.js
  function textOf(item) {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    return String(item.summaryText || item.summary || item.text || item.content || item.action || "").trim();
  }
  function memoryCoreText(longTerm) {
    if (!longTerm || typeof longTerm !== "object") return "";
    var core = longTerm.core;
    if (!core) return "";
    var text = typeof core === "string" ? core : textOf(core);
    return text.slice(0, 900);
  }
  function memoryFacts(longTerm) {
    if (!longTerm || !Array.isArray(longTerm.facts)) return [];
    return longTerm.facts.map(function(item) {
      var text = textOf(item);
      if (!text) return null;
      return {
        text: text.slice(0, 160),
        when: item && item.when ? String(item.when).slice(0, 40) : "",
        who: item && Array.isArray(item.who) ? item.who.join("、") : ""
      };
    }).filter(Boolean).slice(0, 30);
  }
  function memoryVectors(longTerm) {
    if (!longTerm || !Array.isArray(longTerm.vectors)) return [];
    return longTerm.vectors.map(function(item) {
      return textOf(item);
    }).filter(Boolean).slice(0, 12);
  }
  function memoryText(longTerm, limit) {
    var max = Number(limit) || 2400;
    var parts = [];
    var core = memoryCoreText(longTerm);
    if (core) parts.push("【核心】" + core);
    var facts = memoryFacts(longTerm);
    if (facts.length) {
      parts.push("【事实】\n" + facts.slice(0, 18).map(function(f) {
        var head = [f.when, f.who].filter(Boolean).join(" · ");
        return "· " + (head ? head + "：" : "") + f.text;
      }).join("\n"));
    }
    var vectors = memoryVectors(longTerm);
    if (vectors.length) {
      parts.push("【片段】\n" + vectors.map(function(t) {
        return "· " + t;
      }).join("\n"));
    }
    var text = parts.join("\n\n");
    return text.length > max ? text.slice(0, max) + "…" : text;
  }
  function shortTermText(list, limit) {
    if (!Array.isArray(list)) return "";
    var max = Number(limit) || 8;
    return list.slice(-max).map(function(m) {
      var who = m && (m.senderHandle || m.senderName) ? m.senderHandle || m.senderName : m && m.senderId === "me" ? "我" : "对方";
      var text = String(m && m.text || "").replace(/\s+/g, " ").slice(0, 90);
      return who + "：" + text;
    }).filter(function(line) {
      return line.length > 3;
    }).join("\n").slice(0, 1200);
  }
  function pickDetailCandidates(longTerm, limit) {
    var max = Number(limit) || 3;
    var facts = memoryFacts(longTerm);
    var withTime = facts.filter(function(f) {
      return !!f.when;
    });
    var rest = facts.filter(function(f) {
      return !f.when;
    });
    var pool = withTime.concat(rest, memoryVectors(longTerm).map(function(t) {
      return { text: t, when: "" };
    }));
    var out = [];
    var seen = {};
    for (var i = 0; i < pool.length && out.length < max; i++) {
      var text = String(pool[i].text || "").trim();
      if (!text || seen[text]) continue;
      seen[text] = true;
      out.push({ text: text.slice(0, 120), source: "memory" });
    }
    return out;
  }
  function fallbackTimeline(longTerm, limit) {
    var facts = memoryFacts(longTerm).filter(function(f) {
      return !!f.when;
    });
    var picked = facts.length ? facts : memoryFacts(longTerm);
    return picked.slice(0, Number(limit) || 4).map(function(f) {
      return {
        when: f.when || "有一段时间",
        text: f.text.slice(0, 120)
      };
    });
  }

  // src/services/surprise.js
  var STYLE_LABEL = { envelope: "信封", polaroid: "拍立得", starry: "星空" };
  function displayName2(char, fallback) {
    if (!char) return fallback || "TA";
    return char.handle || char.name || fallback || "TA";
  }
  function giftByType(typeId) {
    var map = {
      met: { name: "一样一直留着的小东西", desc: "一直放在我抽屉最上面，今天把它拿出来给你看。" },
      confession: { name: "一封没寄出去的信", desc: "写在你还没答应的那天，一直没敢给你。" },
      "first-date": { name: "那天点的同一样东西", desc: "我试着做了一次，味道不太一样，但方向是对的。" },
      birthday: { name: "一份藏着的小礼物", desc: "不太贵，是我看到的时候立刻想到你的那种。" },
      custom: { name: "一份准备很久的东西", desc: "不为别的，只是想把这一天留个记号。" }
    };
    return map[typeId] || map.custom;
  }
  function fallbackLetter(plan, char, type, longTerm, lastNote) {
    var name = displayName2(char);
    var timeline = fallbackTimeline(longTerm, 2);
    var detail = pickDetailCandidates(longTerm, 1);
    var blocks = [];
    if (lastNote) {
      blocks.push({
        title: "去年你写的",
        body: "去年你留给今年一句话：" + lastNote + "。我记到了今天。"
      });
    }
    blocks.push({
      title: "今天",
      body: "今天是我们的第 " + planIndex(plan, Date.now()) + " 个" + truncate(plan.title, 12) + "。我没有准备很盛大的东西，只想把这一天好好过完。"
    });
    if (timeline.length) {
      blocks.push({ title: "我记得", body: timeline[0].text });
    } else if (detail.length) {
      blocks.push({ title: "我记得", body: detail[0].text });
    } else {
      blocks.push({ title: type.label, body: type.tone + "。这句话我放在心里很久了，今天说给你听。" });
    }
    blocks.push({
      title: "往后",
      body: name + "还想和你过很多个这样的日子。慢一点也没关系。"
    });
    return blocks;
  }
  function pickLetter(raw, plan, char, type, longTerm, lastNote) {
    var list = asArray(raw).map(function(item) {
      var title = asText(item && item.title, 20);
      var body = asText(item && (item.body || item.text), 700);
      if (!body) return null;
      return { title, body };
    }).filter(Boolean).slice(0, 5);
    return list.length ? list : fallbackLetter(plan, char, type, longTerm, lastNote);
  }
  function pickGift(raw, typeId) {
    var gift = raw && typeof raw === "object" ? raw : {};
    var name = asText(gift.name, 40);
    var desc = asText(gift.desc, 300);
    if (!name && !desc) return giftByType(typeId);
    var fb = giftByType(typeId);
    return { name: name || fb.name, desc: desc || fb.desc };
  }
  function pickTimeline(raw, longTerm) {
    var list = asArray(raw).map(function(item) {
      var text = asText(item && (item.text || item.content), 200);
      if (!text) return null;
      return { when: asText(item && item.when, 24) || "有一段时间", text };
    }).filter(Boolean).slice(0, 8);
    return list.length ? list : fallbackTimeline(longTerm, 4);
  }
  function pickDetails(raw, longTerm) {
    var list = asArray(raw).map(function(item) {
      var text = asText(typeof item === "string" ? item : item && (item.text || item.content), 160);
      if (!text) return null;
      return { text, source: "ai" };
    }).filter(Boolean).slice(0, 4);
    return list.length ? list : pickDetailCandidates(longTerm, 3);
  }
  function metaFor(plan, char, now) {
    var occurrence = occurrenceKey(plan, now);
    var type = typeOf(plan.type);
    return {
      char: displayName2(char),
      title: plan.title,
      date: cnDate(occurrence),
      index: planIndex(plan, now),
      type
    };
  }
  function buildLocalSurprise(plan, char, longTerm, settings, now) {
    var type = typeOf(plan.type);
    var lastNote = plan.nextYearNote && plan.nextYearNote.text ? plan.nextYearNote.text : "";
    var letter = fallbackLetter(plan, char, type, longTerm, lastNote);
    var gift = giftByType(plan.type);
    var timeline = fallbackTimeline(longTerm, 4);
    var details = pickDetailCandidates(longTerm, 3);
    var meta = metaFor(plan, char, now);
    var cardStyleId = settings && settings.cardStyle || "envelope";
    var html = buildFallbackCard(cardStyleId, {
      char: meta.char,
      title: meta.title,
      date: meta.date,
      index: meta.index,
      line: letter[0] && letter[0].body || "",
      note: "—— " + meta.char
    });
    return {
      letter,
      gift,
      timeline,
      details,
      cardHtml: html,
      cardStyleId,
      generatedAt: typeof now === "number" ? now : Date.now(),
      audio: { url: "", voiceId: "", at: 0 }
    };
  }
  async function generateSurprise(input) {
    var plan = input.plan;
    var char = input.char;
    var ai = input.ai;
    var now = input.now;
    var settings = input.settings || {};
    var longTerm = input.longTerm;
    var type = typeOf(plan.type);
    var lastNote = plan.nextYearNote && plan.nextYearNote.text ? plan.nextYearNote.text : "";
    var local = buildLocalSurprise(plan, char, longTerm, settings, now);
    var degraded = [];
    var contentSource = "fallback";
    var cardSource = "fallback";
    var letter = local.letter;
    var gift = local.gift;
    var timeline = local.timeline;
    var details = local.details;
    if (ai) {
      var meta = metaFor(plan, char, now);
      var prompt = surpriseMessages({
        today: cnDate(todayKey(now)),
        char: meta.char,
        char_persona: String(char && (char.persona || char.bio) || "").slice(0, 900),
        user: input.userName || "你",
        user_persona: String(input.userPersona || "").slice(0, 400),
        title: plan.title,
        date: meta.date,
        index: String(meta.index),
        secrecy: plan.secrecy,
        tone: type.tone,
        last_year_note: lastNote || "（没有，这是第一次）",
        memory: String(input.memoryText || "（暂无长期记忆）").slice(0, 2200),
        recent: String(input.recentText || "（暂无最近对话）").slice(0, 900),
        stages: (plan.prepare.stages || []).filter(function(s) {
          return s.doneAt;
        }).map(function(s) {
          return "· " + s.detail;
        }).join("\n") || "（还没记录）"
      });
      var res = await ai.chatJson(prompt, { temperature: 0.95 });
      if (res.ok) {
        letter = pickLetter(res.data.letter, plan, char, type, longTerm, lastNote);
        gift = pickGift(res.data.gift, plan.type);
        timeline = pickTimeline(res.data.timeline, longTerm);
        details = pickDetails(res.data.details, longTerm);
        contentSource = "ai";
      } else {
        degraded.push("content:" + res.reason);
      }
    } else {
      degraded.push("content:no_ai");
    }
    var cardStyleId = settings.cardStyle || "envelope";
    var cardHtml = "";
    if (ai) {
      var cardPrompt = cardMessages({
        style: STYLE_LABEL[cardStyleId] || "信封",
        title: plan.title,
        date: metaFor(plan, char, now).date,
        index: String(planIndex(plan, now)),
        char: displayName2(char),
        user: input.userName || "你",
        excerpt: truncate(letter[0] && letter[0].body || "", 70),
        seal: "主色 " + sealOf(plan).ink + " 点缀，纸面 " + sealOf(plan).paper
      });
      var cardRes = await ai.chat(cardPrompt, { temperature: 0.7 });
      if (cardRes.ok) {
        var clean = sanitizeCard(cardRes.text);
        if (clean.ok) {
          cardHtml = clean.html;
          cardSource = "ai";
        } else {
          degraded.push("card:" + clean.reason);
        }
      } else {
        degraded.push("card:" + cardRes.reason);
      }
    }
    if (!cardHtml) {
      cardHtml = buildFallbackCard(cardStyleId, {
        char: displayName2(char),
        title: plan.title,
        date: metaFor(plan, char, now).date,
        index: planIndex(plan, now),
        line: truncate(letter[0] && letter[0].body || "", 90),
        note: "—— " + displayName2(char)
      });
    }
    return {
      surprise: {
        letter,
        gift,
        timeline,
        details,
        cardHtml,
        cardStyleId,
        generatedAt: typeof now === "number" ? now : Date.now(),
        audio: { url: "", voiceId: "", at: 0 }
      },
      contentSource,
      cardSource,
      degraded
    };
  }

  // src/services/voice.js
  function voiceIdFor(character, provider) {
    if (!character) return "";
    if (provider === "elevenlabs") {
      return character.elevenLabsVoiceId || character.voiceIds && character.voiceIds.elevenlabs || "";
    }
    if (provider === "minimax") {
      return character.minimaxVoiceId || character.voiceIds && character.voiceIds.minimax || "";
    }
    return "";
  }
  var REASONS = {
    no_provider: "还没有配置语音供应商",
    no_voice: "这个角色没有绑定当前供应商的语音",
    no_api: "宿主没有提供语音接口",
    empty: "语音生成失败，稍后再试",
    error: "语音生成失败，稍后再试"
  };
  function voiceReasonText(reason) {
    return REASONS[reason] || "语音生成失败";
  }
  async function speak(input) {
    var host = input.host;
    var character = input.character;
    var text = String(input.text || "").replace(/\s+/g, " ").trim();
    if (!text) return { ok: false, reason: "empty" };
    var provider = await host.voice.provider();
    if (!provider) return { ok: false, reason: "no_provider" };
    var voiceId = voiceIdFor(character, provider);
    if (!voiceId) return { ok: false, reason: "no_voice" };
    var tts = character && character.tts || {};
    var payload = {
      text: text.slice(0, 900),
      voiceId,
      language: tts.language || character.ttsLanguage || "Chinese",
      senderName: character && (character.handle || character.name) || "Plugin"
    };
    if (typeof tts.speed === "number") payload.speed = tts.speed;
    if (typeof tts.volume === "number") payload.vol = tts.volume;
    if (typeof tts.pitch === "number") payload.pitch = tts.pitch;
    var el = tts.elevenLabs || {};
    if (typeof el.stability === "number") payload.elevenLabsStability = el.stability;
    if (typeof el.similarity === "number") payload.elevenLabsSimilarity = el.similarity;
    if (typeof el.style === "number") payload.elevenLabsStyle = el.style;
    if (typeof el.speakerBoost === "boolean") payload.elevenLabsSpeakerBoost = el.speakerBoost;
    var res = await host.voice.tts(payload);
    if (!res.ok) return { ok: false, reason: res.reason };
    return { ok: true, url: res.url, voiceId };
  }
  function letterToSpeech(letter, charName) {
    var parts = (letter || []).map(function(block) {
      return block && block.body ? String(block.body) : "";
    }).filter(Boolean);
    if (!parts.length) return "";
    return parts.join("\n").slice(0, 900);
  }

  // src/core/secrecy.js
  var SECRECY = [
    {
      id: "secret",
      label: "全程保密",
      desc: "他偷偷准备，当天才给你看"
    },
    {
      id: "hint",
      label: "给点暗示",
      desc: "能看到进度和他的心情，看不到内容"
    },
    {
      id: "open",
      label: "让我看着",
      desc: "能看到他每天做了什么，最后一步仍然封着"
    }
  ];
  function isSealed(plan) {
    return !(plan && plan.reveal && plan.reveal.unlockedAt);
  }
  function visibleStages(plan, now) {
    var mode = plan && plan.secrecy || "hint";
    var stages = (plan && plan.prepare ? plan.prepare.stages : []).slice().sort(function(a, b) {
      return b.offsetDays - a.offsetDays;
    });
    var left = daysLeft(plan, now);
    return stages.map(function(stage) {
      var done = !!stage.doneAt || isFinite(left) && left <= stage.offsetDays;
      var unlockedByTime = isFinite(left) && left <= stage.offsetDays;
      if (mode === "secret") {
        return {
          key: "s" + stage.offsetDays,
          offsetDays: stage.offsetDays,
          done,
          masked: true,
          // 还没到时间的一律占位；已完成的也只给一句模糊状态
          text: done ? "在忙" : "",
          teaser: ""
        };
      }
      if (mode === "hint") {
        return {
          key: "s" + stage.offsetDays,
          offsetDays: stage.offsetDays,
          done,
          masked: !unlockedByTime,
          text: "",
          teaser: unlockedByTime ? stage.teaser : ""
        };
      }
      return {
        key: "s" + stage.offsetDays,
        offsetDays: stage.offsetDays,
        done,
        masked: false,
        text: unlockedByTime ? stage.detail : "",
        teaser: unlockedByTime ? stage.teaser : ""
      };
    });
  }
  function statusLine(plan, now) {
    var left = daysLeft(plan, now);
    var mode = plan && plan.secrecy || "hint";
    var near = nearLine(left);
    if (left === 0) return "今天 · 惊喜在等你";
    if (near && mode !== "secret") return near;
    if (near) return "他在准备";
    if (mode === "secret") return "他一直在准备";
    if (mode === "hint") {
      var progress = prepareProgress(plan, now);
      if (!progress.total) return "他在准备";
      return "已经准备了 " + progress.done + " 步";
    }
    return "你可以看到他的每一步";
  }
  function sealGate(plan) {
    var mode = plan && plan.secrecy || "hint";
    return {
      sealed: isSealed(plan),
      needConfirm: mode === "open",
      confirmTitle: "现在拆开？",
      confirmMessage: "现在拆开，当天就没有惊喜了。确定要看吗？"
    };
  }
  function progressDots(plan, now) {
    var progress = prepareProgress(plan, now);
    var total = Math.min(8, progress.total || 0);
    var done = progress.total ? Math.round(progress.ratio * total) : 0;
    var dots2 = [];
    for (var i = 0; i < total; i++) {
      dots2.push({ on: i < done });
    }
    return { dots: dots2, done: progress.done, total: progress.total };
  }

  // src/app/container.js
  var MESSAGE_TYPE = "ac-anniversary";
  function userNameOf(persona) {
    if (!persona) return "你";
    return persona.name || persona.handle || persona.displayName || "你";
  }
  function personaText(persona) {
    if (!persona) return "";
    return String(persona.persona || persona.description || persona.bio || "").slice(0, 800);
  }
  async function createApp(opts) {
    var host = createHost(opts.roche);
    var store = createStore(host);
    var settings = mergeSettings(null);
    var plans = [];
    var meta = normalizeMeta(null);
    var state = {
      route: "home",
      planId: "",
      plans,
      settings,
      meta,
      busy: "",
      rev: 0,
      revealOpened: false,
      draft: null
    };
    var listeners = /* @__PURE__ */ new Set();
    var history = [];
    var charCache = {};
    var charListCache = null;
    var dayTimer = null;
    var destroyed = false;
    function publish() {
      if (destroyed) return;
      listeners.forEach(function(fn) {
        try {
          fn(state);
        } catch (e) {
          console.error("[anniversary-companion] 渲染失败", e);
        }
      });
    }
    function set(patch, opts2) {
      var silent = opts2 && opts2.silent;
      Object.keys(patch).forEach(function(key) {
        state[key] = patch[key];
      });
      if (!silent) publish();
    }
    function bump(patch) {
      state.rev += 1;
      set(patch || {});
    }
    function toast(message) {
      host.ui.toast(message);
    }
    var ai = createAi({
      host,
      getSettings: function() {
        return settings;
      },
      getMeta: function() {
        return meta;
      },
      saveMeta: function(next) {
        meta = normalizeMeta(next);
        state.meta = meta;
        store.saveMeta(meta);
      }
    });
    async function loadCharacterContext(plan) {
      var id = plan && plan.characterId ? plan.characterId : "";
      if (!id) return { character: null, persona: null, longTerm: null, memoryText: "", recentText: "", userName: "你", userPersona: "" };
      var cached = charCache[id];
      if (cached && Date.now() - cached.at < 5 * 60 * 1e3) return cached.value;
      var character = await host.character.get(id);
      if (!character) {
        var list = await host.character.list();
        character = list.filter(function(c) {
          return c.id === id;
        })[0] || null;
      }
      var conversationId = character && character.conversationId ? character.conversationId : "";
      var persona = conversationId ? await host.persona.forConversation(conversationId) : await host.persona.active();
      var longTerm = conversationId ? await host.memory.longTerm(conversationId, 100) : null;
      var shortTerm = conversationId ? await host.memory.shortTerm(conversationId, 14) : [];
      var value = {
        character,
        persona,
        longTerm,
        memoryText: memoryText(longTerm, 2200),
        recentText: shortTermText(shortTerm, 10),
        userName: userNameOf(persona),
        userPersona: personaText(persona)
      };
      charCache[id] = { at: Date.now(), value };
      return value;
    }
    async function listCharacters() {
      if (charListCache && Date.now() - charListCache.at < 60 * 1e3) return charListCache.value;
      var raw = await host.character.list();
      var value = raw.map(function(c) {
        return {
          id: c.id,
          name: c.name || c.handle || "未命名角色",
          handle: c.handle || "",
          avatar: c.avatar || "",
          conversationId: c.conversationId || ""
        };
      });
      charListCache = { at: Date.now(), value };
      return value;
    }
    async function persistPlans(next, opts2) {
      plans = next;
      var silent = opts2 && opts2.silent;
      if (silent) {
        state.plans = plans;
      } else {
        state.plans = plans;
        state.rev += 1;
        publish();
      }
      await store.savePlans(plans);
    }
    var scriptPending = {};
    async function ensureScript(planId, force) {
      var plan = findPlan(plans, planId);
      if (!plan) return null;
      if (!force && plan.prepare.scriptedAt && plan.prepare.stages.length) return plan;
      if (scriptPending[planId]) return scriptPending[planId];
      set({ busy: "script" });
      scriptPending[planId] = (async function() {
        var context = await loadCharacterContext(plan);
        var result = null;
        try {
          result = await generateScript({
            ai: settings.ai.enabled && host.caps.ai ? ai : null,
            plan,
            char: context.character,
            userName: context.userName,
            memoryText: context.memoryText,
            now: Date.now()
          });
        } catch (e) {
          result = null;
        }
        if (!result) {
          delete scriptPending[planId];
          set({ busy: "" });
          return null;
        }
        var latest = findPlan(plans, planId) || plan;
        var next = applyScript(latest, result.stages, Date.now());
        var ticked = tickPlans(upsertPlan(plans, next), Date.now());
        delete scriptPending[planId];
        set({ busy: "" });
        await persistPlans(ticked.plans);
        return findPlan(plans, planId);
      })();
      return scriptPending[planId];
    }
    async function doGenerateSurprise(plan) {
      set({ busy: "surprise" });
      var context = await loadCharacterContext(plan);
      var result;
      try {
        result = await generateSurprise({
          ai: settings.ai.enabled && host.caps.ai ? ai : null,
          plan,
          char: context.character,
          userName: context.userName,
          userPersona: context.userPersona,
          memoryText: context.memoryText,
          recentText: context.recentText,
          longTerm: context.longTerm,
          settings,
          now: Date.now()
        });
      } catch (e) {
        set({ busy: "" });
        return plan;
      }
      var next = Object.assign({}, plan, {
        surprise: result.surprise,
        reveal: Object.assign({}, plan.reveal, { unlockedAt: plan.reveal.unlockedAt || Date.now() }),
        updatedAt: Date.now()
      });
      set({ busy: "" });
      await persistPlans(upsertPlan(plans, next));
      return findPlan(plans, plan.id);
    }
    function go(route, payload) {
      var next = payload || {};
      var targetId = next.planId || "";
      var same = state.route === route && state.planId === targetId;
      if (!same) {
        if (next.replace) {
          var last = history[history.length - 1];
          if (last && last.route === "detail" && last.planId === targetId) history.pop();
        } else {
          history.push({ route: state.route, planId: state.planId });
        }
      }
      state.route = route;
      state.planId = targetId;
      if (route !== "reveal") state.revealOpened = false;
      if (route === "edit" && next.draft) state.draft = next.draft;
      publish();
    }
    function back() {
      var prev = history.pop();
      if (!prev) {
        state.route = "home";
        state.planId = "";
        state.revealOpened = false;
        publish();
        return;
      }
      state.route = prev.route;
      state.planId = prev.planId;
      state.revealOpened = false;
      publish();
    }
    var actions = {
      getState: function() {
        return state;
      },
      close: function() {
        host.ui.closeApp();
      },
      toast,
      go,
      back,
      refresh: function() {
        publish();
      },
      markRevealOpened: function() {
        state.revealOpened = true;
        publish();
      },
      listCharacters,
      aiUsage: function() {
        return { used: ai.used(), limit: settings.ai.dailyLimit, left: ai.left() };
      },
      openPlan: function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return;
        go("detail", { planId: id });
        if (!plan.prepare.scriptedAt || !plan.prepare.stages.length) {
          ensureScript(id).catch(function() {
          });
        }
      },
      newPlan: function(prefill) {
        var draft = Object.assign({
          id: "",
          type: "custom",
          title: typeOf("custom").title,
          date: todayKey(),
          recurrence: "yearly",
          secrecy: settings.defaultSecrecy,
          characterId: "",
          characterName: "",
          characterAvatar: ""
        }, prefill || {});
        go("edit", { draft });
      },
      editPlan: function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return;
        go("edit", {
          planId: id,
          draft: {
            id: plan.id,
            type: plan.type,
            title: plan.title,
            date: plan.date,
            recurrence: plan.recurrence,
            secrecy: plan.secrecy,
            characterId: plan.characterId,
            characterName: plan.characterName,
            characterAvatar: plan.characterAvatar
          }
        });
      },
      savePlan: async function(draft) {
        if (!draft || !isValidDateKey(draft.date)) return { ok: false, error: "日期不对" };
        var now = Date.now();
        var existing = draft.id ? findPlan(plans, draft.id) : null;
        var plan = normalizePlan(Object.assign({}, existing || {}, draft, {
          id: existing ? existing.id : newPlanId(),
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
          prepare: existing ? existing.prepare : { originDate: draft.date, lastTickDay: "", scriptedAt: 0, stages: [] },
          surprise: existing ? existing.surprise : null,
          reveal: existing ? existing.reveal : { unlockedAt: 0, sealed: true },
          chatCard: existing ? existing.chatCard : { messageId: "", sentDay: "" }
        }));
        if (!plan) return { ok: false, error: "保存失败" };
        if (existing && existing.date !== plan.date) {
          plan.chatCard = { messageId: "", sentDay: "" };
        }
        var ticked = tickPlans(upsertPlan(plans, plan), now);
        await persistPlans(ticked.plans);
        if (!plan.prepare.scriptedAt || !plan.prepare.stages.length) {
          ensureScript(plan.id).catch(function() {
          });
        }
        return { ok: true, plan };
      },
      deletePlan: async function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return false;
        var ok = await host.ui.confirm({
          title: "删除「" + plan.title + "」？",
          message: "准备记录和已经拆开的惊喜会一起删除，角色和主记忆不受影响。"
        });
        if (!ok) return false;
        await persistPlans(removePlan(plans, id));
        toast("已删除");
        if (state.planId === id) {
          history = [];
          state.route = "home";
          state.planId = "";
          state.revealOpened = false;
          publish();
        }
        return true;
      },
      suggestDates: async function(draft) {
        if (!settings.ai.enabled) return { ok: false, reason: "ai_off" };
        if (!host.caps.ai) return { ok: false, reason: "no_api" };
        if (!draft || !draft.characterId) return { ok: false, reason: "no_character" };
        var context = await loadCharacterContext({ characterId: draft.characterId });
        if (!context.memoryText && !context.recentText) return { ok: false, reason: "no_memory" };
        var messages = suggestMessages({
          today: dateText(todayKey()),
          char: context.character && (context.character.handle || context.character.name) || "TA",
          char_persona: String(context.character && (context.character.persona || context.character.bio) || "").slice(0, 800),
          user: context.userName,
          user_persona: context.userPersona,
          memory: context.memoryText,
          recent: context.recentText
        });
        var res = await ai.chatJson(messages, { temperature: 0.5 });
        if (!res.ok) return { ok: false, reason: res.reason };
        var candidates = (Array.isArray(res.data.candidates) ? res.data.candidates : []).map(function(item) {
          if (!item || typeof item !== "object") return null;
          var date = String(item.date || "").trim();
          if (!isValidDateKey(date)) return null;
          var confidence = Math.min(5, Math.max(1, Math.round(Number(item.confidence) || 3)));
          return {
            title: String(item.title || "纪念日").slice(0, 12),
            date,
            evidence: String(item.evidence || "").slice(0, 80),
            confidence
          };
        }).filter(Boolean).slice(0, 4);
        return { ok: true, candidates };
      },
      unlockPlan: async function(id, opts2) {
        var plan = findPlan(plans, id);
        if (!plan) return { ok: false, reason: "missing" };
        var alreadyUnlocked = !!(plan.reveal && plan.reveal.unlockedAt);
        if (!isRevealDay(plan, Date.now())) {
          toast("还没到日子");
          return { ok: false, reason: "not_today" };
        }
        if (!alreadyUnlocked) {
          var gate = sealGate(plan);
          if (gate.needConfirm) {
            var ok = await host.ui.confirm({ title: gate.confirmTitle, message: gate.confirmMessage });
            if (!ok) return { ok: false, reason: "declined" };
          }
        }
        if (!plan.surprise.generatedAt || opts2 && opts2.regenerate) {
          plan = await doGenerateSurprise(plan);
        }
        if (!plan.reveal.unlockedAt) {
          plan = Object.assign({}, plan, {
            reveal: Object.assign({}, plan.reveal, { unlockedAt: Date.now() })
          });
          await persistPlans(upsertPlan(plans, plan));
        }
        state.revealOpened = alreadyUnlocked;
        go("reveal", { planId: id });
        return { ok: true };
      },
      regenerateSurprise: async function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return { ok: false };
        var ok = await host.ui.confirm({
          title: "重新生成？",
          message: "现在这封信、礼物和贺卡会被新的内容覆盖，生成会消耗 AI 次数。"
        });
        if (!ok) return { ok: false, reason: "declined" };
        var next = await doGenerateSurprise(plan);
        state.revealOpened = true;
        publish();
        return { ok: true, plan: next };
      },
      playLetter: async function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return { ok: false, message: "找不到这个纪念日" };
        if (!host.caps.voice) return { ok: false, message: "宿主没有提供语音接口" };
        var context = await loadCharacterContext(plan);
        var text = letterToSpeech(plan.surprise.letter, plan.characterName);
        if (!text) return { ok: false, message: "还没有可以读的信" };
        var res = await speak({ host, character: context.character, text });
        if (!res.ok) return { ok: false, message: voiceReasonText(res.reason) };
        var next = Object.assign({}, plan, {
          surprise: Object.assign({}, plan.surprise, {
            audio: { url: res.url, voiceId: res.voiceId || "", at: Date.now() }
          })
        });
        await persistPlans(upsertPlan(plans, next), { silent: true });
        return { ok: true, url: res.url };
      },
      saveNextYearNote: function(id, textValue) {
        var plan = findPlan(plans, id);
        if (!plan) return false;
        var value = String(textValue || "").trim().slice(0, 60);
        var next = Object.assign({}, plan, {
          nextYearNote: { text: value, at: Date.now() }
        });
        persistPlans(upsertPlan(plans, next), { silent: true });
        return true;
      },
      sendChatCard: async function(id) {
        var plan = findPlan(plans, id);
        if (!plan) return { ok: false };
        if (!host.caps.chatCard) {
          toast("当前宿主版本还不支持发卡片");
          return { ok: false, reason: "no_api" };
        }
        if (!plan.characterId) {
          toast("这个纪念日没有绑定角色，发不了卡");
          return { ok: false, reason: "no_character" };
        }
        var context = await loadCharacterContext(plan);
        var character = context.character;
        if (!character || !character.conversationId) {
          toast("找不到和 TA 的会话");
          return { ok: false, reason: "no_conversation" };
        }
        var index = planIndex(plan, Date.now());
        var res = await host.chat.createCard({
          conversationId: character.conversationId,
          messageType: MESSAGE_TYPE,
          isMe: false,
          senderId: character.id,
          cardData: {
            planId: plan.id,
            title: plan.title,
            charName: character.handle || character.name || "",
            avatar: character.avatar || "",
            dateText: dateText(occurrenceKey(plan, Date.now())),
            index
          },
          modelText: (character.handle || character.name || "TA") + "在我们的「" + plan.title + "」这天，留了一份惊喜。"
        });
        if (!res.ok) {
          toast("发卡片失败，宿主版本可能不支持");
          return { ok: false, reason: res.reason };
        }
        var next = Object.assign({}, plan, {
          chatCard: {
            messageId: res.message && res.message.id || "",
            sentDay: todayKey()
          }
        });
        await persistPlans(upsertPlan(plans, next), { silent: true });
        toast("已经发到聊天里了");
        return { ok: true };
      },
      saveSettings: function(patch) {
        settings = patchSettings(settings, patch);
        state.settings = settings;
        state.rev += 1;
        store.saveSettings(settings);
        if (opts.onThemeChange) opts.onThemeChange(settings.theme);
        publish();
      },
      exportData: async function() {
        var data = await store.exportAll();
        var textValue = JSON.stringify(data, null, 2);
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textValue);
            toast("已复制到剪贴板");
            return true;
          }
        } catch (e) {
        }
        if (typeof console !== "undefined") console.log(textValue);
        toast("浏览器不支持复制，已打印到控制台");
        return false;
      },
      clearData: async function() {
        var ok = await host.ui.confirm({
          title: "清空插件数据？",
          message: "所有纪念日、准备记录和惊喜都会被删除。角色和主记忆不受影响。"
        });
        if (!ok) return false;
        await store.clearAll();
        plans = [];
        meta = normalizeMeta(null);
        charCache = {};
        await store.saveMeta(meta);
        state.plans = plans;
        state.meta = meta;
        state.planId = "";
        state.revealOpened = false;
        go("home");
        toast("已清空");
        return true;
      }
    };
    async function maybeSendDayCards() {
      if (!host.caps.chatCard) return;
      var now = Date.now();
      var today = todayKey(now);
      var list = plans.filter(function(plan) {
        if (!plan.characterId || plan.archived) return false;
        if (!isRevealDay(plan, now)) return false;
        if (!plan.prepare.scriptedAt) return false;
        if (plan.chatCard && plan.chatCard.sentDay === today) return false;
        return true;
      }).slice(0, 2);
      for (var i = 0; i < list.length; i++) {
        try {
          await actions.sendChatCard(list[i].id);
        } catch (e) {
        }
      }
    }
    async function init() {
      settings = await store.loadSettings();
      plans = await store.loadPlans();
      meta = normalizeMeta(await store.loadMeta());
      var ticked = tickPlans(plans, Date.now());
      if (ticked.changed) {
        plans = ticked.plans;
        await store.savePlans(plans);
      }
      state.settings = settings;
      state.plans = plans;
      state.meta = meta;
      state.rev += 1;
      var pendingOpen = "";
      try {
        if (typeof window !== "undefined" && window.__acPendingOpen) {
          pendingOpen = String(window.__acPendingOpen);
          window.__acPendingOpen = "";
        }
      } catch (e) {
      }
      if (!pendingOpen && meta.pendingOpen) pendingOpen = meta.pendingOpen;
      if (pendingOpen) {
        var target = findPlan(plans, pendingOpen);
        meta = Object.assign({}, meta, { pendingOpen: "" });
        await store.saveMeta(meta);
        state.meta = meta;
        if (target) {
          state.route = "detail";
          state.planId = target.id;
        }
      }
      meta = Object.assign({}, meta, { lastOpenAt: Date.now() });
      await store.saveMeta(meta);
      state.meta = meta;
      publish();
      maybeSendDayCards().catch(function() {
      });
      ensureNearestScript();
    }
    function ensureNearestScript() {
      var now = Date.now();
      var active = plans.filter(function(p) {
        return !p.archived;
      }).sort(function(a, b) {
        return daysLeft(a, now) - daysLeft(b, now);
      })[0];
      if (!active) return;
      if (active.prepare.scriptedAt && active.prepare.stages.length) return;
      ensureScript(active.id).catch(function() {
      });
    }
    function checkDay() {
      if (destroyed) return;
      var ticked = tickPlans(plans, Date.now());
      if (!ticked.changed) return;
      persistPlans(ticked.plans).then(function() {
        return maybeSendDayCards();
      }).catch(function() {
      });
    }
    await init();
    dayTimer = setInterval(checkDay, 6e4);
    return {
      ctx: { host, actions, state },
      subscribe: function(fn) {
        listeners.add(fn);
        return function() {
          listeners.delete(fn);
        };
      },
      destroy: function() {
        destroyed = true;
        listeners.clear();
        if (dayTimer) clearInterval(dayTimer);
        dayTimer = null;
      }
    };
  }

  // src/ui/dom.js
  function append(el, children) {
    if (children === null || children === void 0 || children === false) return el;
    if (Array.isArray(children)) {
      children.forEach(function(child) {
        append(el, child);
      });
      return el;
    }
    if (children instanceof Node) {
      el.appendChild(children);
      return el;
    }
    el.appendChild(document.createTextNode(String(children)));
    return el;
  }
  function h(tag2, props, children) {
    var el = document.createElement(tag2);
    var options = props || {};
    Object.keys(options).forEach(function(key) {
      var value = options[key];
      if (value === null || value === void 0 || value === false) return;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key === "dataset") Object.keys(value).forEach(function(k) {
        el.dataset[k] = value[k];
      });
      else if (key === "style") el.setAttribute("style", value);
      else if (key === "html") el.innerHTML = value;
      else if (key.indexOf("on") === 0 && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        el.setAttribute(key, "");
      } else {
        el.setAttribute(key, value);
      }
    });
    append(el, children);
    return el;
  }
  function clear(el) {
    if (!el) return el;
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  // src/ui/theme.css
  var theme_default = '/* 设计 Token：颜色 / 字号 / 行高 / 字距 / 间距 / 形状 / 动效，全部作用域在 .ac-root */\n\n.ac-root {\n  /* 纸张与墨色 */\n  --ac-paper: #FAF7F2;\n  --ac-paper-2: #FFFFFF;\n  --ac-paper-3: #F3ECE4;\n  --ac-ink: #2B2320;\n  --ac-ink-2: #6B5F58;\n  --ac-ink-3: #9C8A81;\n  --ac-line: #E6DCD2;\n  --ac-line-soft: #F0E8DF;\n\n  /* 胭脂 / 蜜桃 / 金 */\n  --ac-rose: #C9605A;\n  --ac-rose-soft: #E8A08B;\n  --ac-rose-wash: #FBEFEC;\n  --ac-gold: #C9A227;\n  --ac-gold-wash: #FBF5E4;\n  --ac-ok: #3F7D5A;\n  --ac-warn: #C24B3F;\n\n  /* 字号阶梯 */\n  --ac-display: clamp(64px, 24vw, 120px);\n  --ac-h1: clamp(24px, 6.6vw, 30px);\n  --ac-h2: 17px;\n  --ac-body: 15px;\n  --ac-small: 14px;\n  --ac-cap: 12px;\n  --ac-micro: 11px;\n\n  /* 行高与字距 */\n  --ac-leading-display: 1;\n  --ac-leading-h1: 1.15;\n  --ac-leading-h2: 1.35;\n  --ac-leading-body: 1.7;\n  --ac-leading-letter: 1.9;\n  --ac-tracking-display: -0.03em;\n  --ac-tracking-body: 0;\n  --ac-tracking-cap: 0.08em;\n  --ac-tracking-wide: 0.16em;\n\n  /* 间距：只用 4 的倍数 */\n  --ac-s1: 4px;\n  --ac-s2: 8px;\n  --ac-s3: 12px;\n  --ac-s4: 16px;\n  --ac-s5: 20px;\n  --ac-s6: 28px;\n  --ac-s7: 40px;\n  --ac-page-x: 20px;\n\n  /* 形状与阴影 */\n  --ac-radius: 10px;\n  --ac-radius-sm: 6px;\n  --ac-line-1: 1px solid var(--ac-line);\n  --ac-shadow-1: 0 1px 2px rgba(43, 35, 32, 0.04);\n  --ac-shadow-2: 0 8px 24px rgba(43, 35, 32, 0.07);\n\n  /* 动效 */\n  --ac-ease: cubic-bezier(0.2, 0.8, 0.2, 1);\n  --ac-dur: 200ms;\n  --ac-dur-slow: 520ms;\n\n  /* 字体栈：只用系统字体，不引外链 */\n  --ac-serif: "Iowan Old Style", "Playfair Display", "Songti SC", "Noto Serif SC", STSong, "Times New Roman", serif;\n  --ac-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif;\n}\n\n/* 深色：深底白字有光学晕光，正文用 400 */\n.ac-root[data-theme="dark"] {\n  --ac-paper: #14100E;\n  --ac-paper-2: #1C1714;\n  --ac-paper-3: #241D19;\n  --ac-ink: #F5EFE8;\n  --ac-ink-2: #BCAEA4;\n  --ac-ink-3: #8C7D74;\n  --ac-line: #2E2621;\n  --ac-line-soft: #241D19;\n  --ac-rose: #E08A83;\n  --ac-rose-soft: #C97C6D;\n  --ac-rose-wash: #2A1B19;\n  --ac-gold: #D8B85A;\n  --ac-gold-wash: #2A2418;\n  --ac-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.3);\n  --ac-shadow-2: 0 8px 24px rgba(0, 0, 0, 0.35);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .ac-root {\n    --ac-dur: 1ms;\n    --ac-dur-slow: 1ms;\n  }\n}\n';

  // src/ui/base.css
  var base_default = `/* 全页无外壳布局 + 基础组件。所有选择器以 .ac-root 开头，不污染宿主。 */

.ac-root {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--ac-paper);
  color: var(--ac-ink);
  font-family: var(--ac-sans);
  font-size: var(--ac-body);
  font-weight: 400;
  line-height: var(--ac-leading-body);
  letter-spacing: var(--ac-tracking-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* 纸纹：内联 SVG 噪点，不引外部纹理 */
.ac-root::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 140px 140px;
}

.ac-root[data-theme="dark"]::before {
  opacity: 0.07;
  mix-blend-mode: screen;
}

.ac-root > * {
  position: relative;
  z-index: 1;
}

/* ---------- 页面骨架 ---------- */

.ac-view {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.ac-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--ac-s3);
  min-height: 48px;
  padding: var(--ac-s3) var(--ac-page-x) var(--ac-s2);
}

.ac-header--bordered {
  border-bottom: var(--ac-line-1);
}

.ac-header__title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--ac-h2);
  font-weight: 500;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-header__actions {
  display: flex;
  align-items: center;
  gap: var(--ac-s2);
  flex: 0 0 auto;
}

.ac-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 -6px 0 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ac-ink-2);
  cursor: pointer;
  transition: background var(--ac-dur) var(--ac-ease), color var(--ac-dur) var(--ac-ease);
}

.ac-icon-btn svg {
  width: 20px;
  height: 20px;
  display: block;
}

.ac-icon-btn:active {
  background: var(--ac-paper-3);
  color: var(--ac-ink);
}

.ac-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0 var(--ac-page-x) var(--ac-s6);
}

.ac-body--flush {
  padding-left: 0;
  padding-right: 0;
}

.ac-footer {
  flex: 0 0 auto;
  padding: var(--ac-s3) var(--ac-page-x) var(--ac-s4);
  border-top: var(--ac-line-1);
  background: var(--ac-paper);
}

/* ---------- 文字 ---------- */

.ac-serif {
  font-family: var(--ac-serif);
}

.ac-label {
  font-size: var(--ac-micro);
  letter-spacing: var(--ac-tracking-wide);
  text-transform: uppercase;
  color: var(--ac-ink-3);
}

.ac-h1 {
  font-family: var(--ac-serif);
  font-size: var(--ac-h1);
  line-height: var(--ac-leading-h1);
  letter-spacing: -0.01em;
  font-weight: 600;
  text-wrap: balance;
  margin: 0;
}

.ac-h2 {
  font-family: var(--ac-serif);
  font-size: var(--ac-h2);
  line-height: var(--ac-leading-h2);
  font-weight: 600;
  margin: 0;
}

.ac-text {
  margin: 0;
  font-size: var(--ac-body);
  line-height: var(--ac-leading-body);
  text-wrap: pretty;
}

.ac-muted {
  color: var(--ac-ink-2);
}

.ac-faint {
  color: var(--ac-ink-3);
}

.ac-cap {
  font-size: var(--ac-cap);
  line-height: 1.45;
  color: var(--ac-ink-2);
  letter-spacing: 0.02em;
}

.ac-divider {
  height: 1px;
  background: var(--ac-line);
  border: 0;
  margin: var(--ac-s4) 0;
}

/* ---------- 头像 ---------- */

.ac-avatar {
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--ac-paper-3);
  border: 1px solid var(--ac-line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ac-ink-3);
  font-size: 13px;
  font-family: var(--ac-serif);
  user-select: none;
}

.ac-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ac-avatar--lg {
  width: 44px;
  height: 44px;
  font-size: 16px;
}

/* ---------- 标签 / 字牌 ---------- */

.ac-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--ac-rose-wash);
  color: var(--ac-rose);
  font-size: var(--ac-micro);
  letter-spacing: var(--ac-tracking-cap);
  line-height: 1.4;
  white-space: nowrap;
}

.ac-tag--gold {
  background: var(--ac-gold-wash);
  color: var(--ac-gold);
}

.ac-tag--quiet {
  background: transparent;
  color: var(--ac-ink-3);
  border: 1px solid var(--ac-line);
}

/* ---------- 按钮 ---------- */

.ac-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--ac-radius);
  background: var(--ac-paper-2);
  color: var(--ac-ink);
  font-family: inherit;
  font-size: var(--ac-body);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform var(--ac-dur) var(--ac-ease), background var(--ac-dur) var(--ac-ease), opacity var(--ac-dur) var(--ac-ease);
}

.ac-btn:active {
  transform: scale(0.985);
}

.ac-btn--primary {
  background: var(--ac-rose);
  color: #FFFFFF;
  box-shadow: 0 2px 10px rgba(201, 96, 90, 0.22);
}

.ac-root[data-theme="dark"] .ac-btn--primary {
  color: #1A1210;
}

.ac-btn--ghost {
  background: transparent;
  border-color: var(--ac-line);
  color: var(--ac-ink-2);
}

.ac-btn--quiet {
  background: transparent;
  color: var(--ac-rose);
  min-height: 40px;
  font-weight: 500;
}

.ac-btn[disabled] {
  opacity: 0.45;
  pointer-events: none;
}

.ac-btn--text {
  width: auto;
  min-height: 36px;
  padding: 0 2px;
  background: transparent;
  color: var(--ac-ink-2);
  font-size: var(--ac-small);
}

/* ---------- 输入 ---------- */

.ac-field {
  display: block;
  padding: var(--ac-s3) 0;
  border-bottom: 1px solid var(--ac-line);
}

.ac-field__label {
  display: block;
  margin-bottom: var(--ac-s2);
  font-size: var(--ac-micro);
  letter-spacing: var(--ac-tracking-cap);
  color: var(--ac-ink-3);
}

.ac-input {
  width: 100%;
  min-height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ac-ink);
  font-family: inherit;
  font-size: var(--ac-h2);
  font-weight: 500;
  letter-spacing: 0.01em;
  appearance: none;
  -webkit-appearance: none;
}

.ac-input:focus {
  outline: none;
}

.ac-input--date {
  font-family: var(--ac-serif);
  font-size: 19px;
  letter-spacing: 0.02em;
  color: var(--ac-ink);
}

.ac-input--note {
  font-size: var(--ac-body);
  font-weight: 400;
  line-height: 1.6;
}

/* 开关行 */

.ac-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ac-s4);
  min-height: 52px;
  padding: var(--ac-s2) 0;
  border-bottom: 1px solid var(--ac-line);
}

.ac-switch-row__main {
  min-width: 0;
}

.ac-switch-row__title {
  font-size: var(--ac-body);
}

.ac-switch-row__desc {
  margin-top: 2px;
  font-size: var(--ac-cap);
  color: var(--ac-ink-3);
}

.ac-switch {
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--ac-line);
  background: var(--ac-paper-3);
  cursor: pointer;
  transition: background var(--ac-dur) var(--ac-ease), border-color var(--ac-dur) var(--ac-ease);
}

.ac-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--ac-paper-2);
  box-shadow: 0 1px 2px rgba(43, 35, 32, 0.18);
  transition: transform var(--ac-dur) var(--ac-ease);
}

.ac-switch[aria-checked="true"] {
  background: var(--ac-rose);
  border-color: var(--ac-rose);
}

.ac-switch[aria-checked="true"]::after {
  transform: translateX(18px);
}

/* ---------- 列表行 ---------- */

.ac-row {
  display: flex;
  align-items: center;
  gap: var(--ac-s3);
  width: 100%;
  min-height: 64px;
  padding: var(--ac-s3) 0;
  border: 0;
  border-bottom: 1px solid var(--ac-line-soft);
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--ac-dur) var(--ac-ease);
}

.ac-row:active {
  background: var(--ac-paper-3);
}

.ac-row__main {
  flex: 1 1 auto;
  min-width: 0;
}

.ac-row__title {
  font-size: var(--ac-body);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-row__meta {
  margin-top: 2px;
  font-size: var(--ac-cap);
  color: var(--ac-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-row__side {
  flex: 0 0 auto;
  text-align: right;
  font-size: var(--ac-cap);
  color: var(--ac-ink-2);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

/* ---------- 进度点阵 ---------- */

.ac-dots {
  display: flex;
  align-items: center;
  gap: 7px;
}

.ac-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ac-line);
  transition: background 260ms var(--ac-ease), transform 260ms var(--ac-ease);
}

.ac-dot--on {
  background: var(--ac-rose);
  transform: scale(1.12);
}

.ac-dot--hollow {
  background: transparent;
  border: 1px solid var(--ac-line);
}

/* ---------- 空状态 ---------- */

.ac-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ac-s4);
  padding: var(--ac-s7) var(--ac-s5);
  text-align: center;
}

.ac-empty__dash {
  width: 72px;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--ac-line) 0 5px, transparent 5px 10px);
}

.ac-empty__line {
  font-family: var(--ac-serif);
  font-size: var(--ac-h2);
  line-height: 1.6;
  color: var(--ac-ink-2);
  max-width: 22ch;
}

/* ---------- 滚动条：细，不抢视觉 ---------- */

.ac-root .ac-body::-webkit-scrollbar {
  width: 3px;
}

.ac-root .ac-body::-webkit-scrollbar-thumb {
  background: var(--ac-line);
  border-radius: 3px;
}

.ac-root *:focus-visible {
  outline: 2px solid var(--ac-rose-soft);
  outline-offset: 2px;
}
`;

  // src/ui/views.css
  var views_default = '/* 逐屏样式：首页倒计时 / 准备时间轴 / 信封 / 信件 / 贺卡 / 语音 / 设置 */\n\n/* ---------- 首页：倒计时主区 ---------- */\n\n.ac-hero {\n  padding: var(--ac-s5) 0 var(--ac-s4);\n  margin: 0 calc(0px - var(--ac-page-x));\n  padding-left: var(--ac-page-x);\n  padding-right: var(--ac-page-x);\n  background: linear-gradient(180deg, var(--ac-paper-3) 0%, transparent 100%);\n}\n\n.ac-hero__year {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--ac-s3);\n}\n\n.ac-hero__who {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s3);\n  margin-top: var(--ac-s4);\n}\n\n.ac-hero__name {\n  font-size: var(--ac-body);\n  font-weight: 500;\n  letter-spacing: 0.01em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-count {\n  display: flex;\n  align-items: flex-end;\n  gap: 8px;\n  margin-top: var(--ac-s3);\n  color: var(--ac-ink);\n}\n\n.ac-count__num {\n  font-family: var(--ac-serif);\n  font-size: var(--ac-display);\n  line-height: var(--ac-leading-display);\n  letter-spacing: var(--ac-tracking-display);\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n  font-feature-settings: "tnum" 1;\n  transition: opacity 260ms var(--ac-ease), transform 260ms var(--ac-ease);\n}\n\n.ac-count__num--flip {\n  opacity: 0;\n  transform: translateY(-12px);\n}\n\n.ac-count__unit {\n  padding-bottom: 14px;\n  font-size: var(--ac-small);\n  color: var(--ac-ink-2);\n  letter-spacing: var(--ac-tracking-cap);\n}\n\n.ac-count__unit--today {\n  font-family: var(--ac-serif);\n  font-size: 22px;\n  padding-bottom: 16px;\n  color: var(--ac-rose);\n  letter-spacing: 0.02em;\n}\n\n.ac-hero__meta {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s2);\n  flex-wrap: wrap;\n  margin-top: var(--ac-s3);\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-2);\n}\n\n.ac-progress {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s3);\n  margin-top: var(--ac-s5);\n  padding-top: var(--ac-s4);\n  border-top: 1px solid var(--ac-line);\n}\n\n.ac-progress__line {\n  flex: 1 1 auto;\n  min-width: 0;\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-2);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* ---------- 列表 ---------- */\n\n.ac-list {\n  margin-top: var(--ac-s3);\n}\n\n.ac-list__head {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: var(--ac-s3);\n  padding: var(--ac-s5) 0 var(--ac-s2);\n}\n\n.ac-plan-row .ac-row__side {\n  font-variant-numeric: tabular-nums;\n}\n\n.ac-plan-row__days {\n  font-family: var(--ac-serif);\n  font-size: 17px;\n  color: var(--ac-ink);\n  letter-spacing: -0.01em;\n}\n\n.ac-plan-row__days--today {\n  color: var(--ac-rose);\n}\n\n.ac-plan-row__state {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--ac-line);\n}\n\n.ac-plan-row__state--on {\n  background: var(--ac-rose);\n}\n\n.ac-plan-row--sealed .ac-row__title::after {\n  content: "封";\n  margin-left: 6px;\n  font-size: 10px;\n  color: var(--ac-ink-3);\n  border: 1px solid var(--ac-line);\n  border-radius: 3px;\n  padding: 0 3px;\n  vertical-align: 1px;\n}\n\n/* ---------- 新建 / 编辑 ---------- */\n\n.ac-pills {\n  display: flex;\n  gap: var(--ac-s2);\n  overflow-x: auto;\n  padding: var(--ac-s2) 0 var(--ac-s3);\n  margin: 0 calc(0px - var(--ac-page-x));\n  padding-left: var(--ac-page-x);\n  padding-right: var(--ac-page-x);\n  scrollbar-width: none;\n}\n\n.ac-pills::-webkit-scrollbar {\n  display: none;\n}\n\n.ac-pill {\n  flex: 0 0 auto;\n  min-height: 34px;\n  padding: 0 14px;\n  border-radius: 999px;\n  border: 1px solid var(--ac-line);\n  background: transparent;\n  color: var(--ac-ink-2);\n  font-family: inherit;\n  font-size: var(--ac-small);\n  cursor: pointer;\n  transition: border-color var(--ac-dur) var(--ac-ease), color var(--ac-dur) var(--ac-ease), background var(--ac-dur) var(--ac-ease);\n}\n\n.ac-pill[aria-pressed="true"] {\n  border-color: var(--ac-rose);\n  color: var(--ac-rose);\n  background: var(--ac-rose-wash);\n}\n\n.ac-chars {\n  display: flex;\n  gap: var(--ac-s3);\n  overflow-x: auto;\n  padding: var(--ac-s2) 0 var(--ac-s3);\n  margin: 0 calc(0px - var(--ac-page-x));\n  padding-left: var(--ac-page-x);\n  padding-right: var(--ac-page-x);\n  scrollbar-width: none;\n}\n\n.ac-chars::-webkit-scrollbar {\n  display: none;\n}\n\n.ac-char {\n  flex: 0 0 auto;\n  width: 64px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 2px;\n  border: 0;\n  background: transparent;\n  color: var(--ac-ink-2);\n  font-family: inherit;\n  cursor: pointer;\n}\n\n.ac-char .ac-avatar {\n  width: 48px;\n  height: 48px;\n  border-width: 2px;\n  border-color: transparent;\n  transition: border-color var(--ac-dur) var(--ac-ease), transform var(--ac-dur) var(--ac-ease);\n}\n\n.ac-char[aria-pressed="true"] .ac-avatar {\n  border-color: var(--ac-rose);\n  transform: scale(1.03);\n}\n\n.ac-char__name {\n  max-width: 100%;\n  font-size: var(--ac-micro);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-char[aria-pressed="true"] .ac-char__name {\n  color: var(--ac-rose);\n}\n\n.ac-secrecy {\n  display: flex;\n  flex-direction: column;\n}\n\n.ac-secrecy__opt {\n  position: relative;\n  display: flex;\n  align-items: flex-start;\n  gap: var(--ac-s3);\n  width: 100%;\n  padding: var(--ac-s3) 0;\n  border: 0;\n  border-bottom: 1px solid var(--ac-line-soft);\n  background: transparent;\n  color: inherit;\n  font-family: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n.ac-secrecy__bullet {\n  flex: 0 0 auto;\n  width: 8px;\n  height: 8px;\n  margin-top: 8px;\n  border-radius: 50%;\n  border: 1px solid var(--ac-line);\n  background: transparent;\n  transition: background var(--ac-dur) var(--ac-ease), border-color var(--ac-dur) var(--ac-ease), transform var(--ac-dur) var(--ac-ease);\n}\n\n.ac-secrecy__opt[aria-pressed="true"] .ac-secrecy__bullet {\n  background: var(--ac-rose);\n  border-color: var(--ac-rose);\n  transform: scale(1.1);\n}\n\n.ac-secrecy__title {\n  font-size: var(--ac-body);\n  font-weight: 500;\n}\n\n.ac-secrecy__desc {\n  margin-top: 2px;\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-3);\n}\n\n.ac-candidates {\n  display: flex;\n  flex-direction: column;\n  gap: var(--ac-s2);\n  margin-top: var(--ac-s3);\n}\n\n.ac-candidate {\n  display: flex;\n  align-items: flex-start;\n  gap: var(--ac-s3);\n  width: 100%;\n  padding: var(--ac-s3) var(--ac-s3) var(--ac-s3) var(--ac-s4);\n  border: var(--ac-line-1);\n  border-radius: var(--ac-radius);\n  background: var(--ac-paper-2);\n  box-shadow: var(--ac-shadow-1);\n  color: inherit;\n  font-family: inherit;\n  text-align: left;\n  cursor: pointer;\n  transition: border-color var(--ac-dur) var(--ac-ease);\n}\n\n.ac-candidate:active {\n  border-color: var(--ac-rose-soft);\n}\n\n.ac-candidate__date {\n  flex: 0 0 auto;\n  font-family: var(--ac-serif);\n  font-size: 15px;\n  letter-spacing: 0.01em;\n  font-variant-numeric: tabular-nums;\n}\n\n.ac-candidate__main {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n.ac-candidate__title {\n  font-size: var(--ac-small);\n  font-weight: 500;\n}\n\n.ac-candidate__ev {\n  margin-top: 2px;\n  font-size: var(--ac-micro);\n  line-height: 1.5;\n  color: var(--ac-ink-3);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.ac-conf {\n  display: flex;\n  gap: 3px;\n  flex: 0 0 auto;\n  padding-top: 4px;\n}\n\n.ac-conf i {\n  width: 4px;\n  height: 4px;\n  border-radius: 50%;\n  background: var(--ac-line);\n}\n\n.ac-conf i.on {\n  background: var(--ac-rose);\n}\n\n/* ---------- 详情 ---------- */\n\n.ac-band {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: var(--ac-s4);\n  padding: var(--ac-s4) 0 var(--ac-s5);\n  border-bottom: 1px solid var(--ac-line);\n}\n\n.ac-band__num {\n  font-family: var(--ac-serif);\n  font-size: clamp(34px, 12vw, 48px);\n  line-height: 1.05;\n  letter-spacing: -0.02em;\n  font-variant-numeric: tabular-nums;\n  font-feature-settings: "tnum" 1;\n}\n\n.ac-band__unit {\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-2);\n  padding-bottom: 6px;\n  letter-spacing: var(--ac-tracking-cap);\n}\n\n.ac-band__side {\n  text-align: right;\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-2);\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  align-items: flex-end;\n}\n\n.ac-timeline {\n  position: relative;\n  margin-top: var(--ac-s4);\n  padding-left: 22px;\n}\n\n.ac-timeline::before {\n  content: "";\n  position: absolute;\n  left: 3px;\n  top: 6px;\n  bottom: 6px;\n  width: 1px;\n  background: var(--ac-line);\n}\n\n.ac-timeline__item {\n  position: relative;\n  padding: 0 0 var(--ac-s4);\n}\n\n.ac-timeline__item:last-child {\n  padding-bottom: 0;\n}\n\n.ac-timeline__dot {\n  position: absolute;\n  left: -22px;\n  top: 6px;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--ac-paper);\n  border: 1px solid var(--ac-line);\n  transition: background 260ms var(--ac-ease), border-color 260ms var(--ac-ease), transform 260ms var(--ac-ease);\n}\n\n.ac-timeline__item--on .ac-timeline__dot {\n  background: var(--ac-rose);\n  border-color: var(--ac-rose);\n  transform: scale(1.15);\n}\n\n.ac-timeline__when {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-cap);\n  color: var(--ac-ink-3);\n}\n\n.ac-timeline__text {\n  margin-top: 4px;\n  font-size: var(--ac-small);\n  line-height: 1.72;\n  color: var(--ac-ink);\n}\n\n.ac-timeline__item--masked .ac-timeline__text {\n  color: var(--ac-ink-3);\n  font-family: var(--ac-serif);\n  letter-spacing: 0.12em;\n}\n\n.ac-sealbar {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s3);\n  margin: var(--ac-s4) 0 0;\n  padding: var(--ac-s3) var(--ac-s4);\n  border: 1px dashed var(--ac-line);\n  border-radius: var(--ac-radius);\n  background: transparent;\n}\n\n.ac-sealbar__text {\n  flex: 1 1 auto;\n  min-width: 0;\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-2);\n  line-height: 1.55;\n}\n\n/* ---------- 解锁：信封 ---------- */\n\n.ac-envelope-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: var(--ac-s4);\n  padding: var(--ac-s6) 0 var(--ac-s5);\n}\n\n.ac-envelope {\n  position: relative;\n  width: 100%;\n  max-width: 320px;\n  aspect-ratio: 1.55 / 1;\n  border-radius: 6px;\n  border: 1px solid var(--ac-line);\n  background: linear-gradient(165deg, var(--ac-rose-wash) 0%, var(--ac-paper-3) 100%);\n  box-shadow: var(--ac-shadow-2);\n  cursor: pointer;\n  overflow: hidden;\n  transition: transform var(--ac-dur) var(--ac-ease);\n}\n\n.ac-envelope:active {\n  transform: scale(0.99);\n}\n\n.ac-envelope__flap {\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 0;\n  height: 56%;\n  background: linear-gradient(180deg, var(--ac-paper-3), var(--ac-rose-wash));\n  clip-path: polygon(0 0, 100% 0, 50% 100%);\n  transform-origin: top center;\n  transition: transform var(--ac-dur-slow) var(--ac-ease);\n}\n\n.ac-envelope__paper {\n  position: absolute;\n  left: 10%;\n  right: 10%;\n  top: 24%;\n  padding: 12px 14px;\n  border-radius: 4px;\n  background: var(--ac-paper-2);\n  border: 1px solid var(--ac-line);\n  box-shadow: var(--ac-shadow-1);\n  transform: translateY(16%);\n  transition: transform var(--ac-dur-slow) var(--ac-ease) 80ms;\n}\n\n.ac-envelope__name {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-cap);\n  color: var(--ac-ink-3);\n}\n\n.ac-envelope__line {\n  margin-top: 6px;\n  font-family: var(--ac-serif);\n  font-size: 15px;\n  line-height: 1.6;\n  color: var(--ac-ink);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.ac-envelope__seal {\n  position: absolute;\n  left: 50%;\n  top: 54%;\n  width: 40px;\n  height: 40px;\n  margin: -20px 0 0 -20px;\n  border-radius: 50%;\n  background: var(--ac-rose);\n  color: var(--ac-paper);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: var(--ac-serif);\n  font-size: 15px;\n  transition: opacity var(--ac-dur) var(--ac-ease);\n}\n\n.ac-envelope--open .ac-envelope__flap {\n  transform: rotateX(180deg);\n}\n\n.ac-envelope--open .ac-envelope__paper {\n  transform: translateY(-8%);\n}\n\n.ac-envelope--open .ac-envelope__seal {\n  opacity: 0;\n}\n\n.ac-envelope__hint {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-wide);\n  text-transform: uppercase;\n  color: var(--ac-ink-3);\n}\n\n/* ---------- 解锁：内容 ---------- */\n\n.ac-letter {\n  display: flex;\n  flex-direction: column;\n  gap: var(--ac-s4);\n  padding-top: var(--ac-s4);\n}\n\n.ac-letter__block {\n  padding: var(--ac-s4);\n  border: var(--ac-line-1);\n  border-radius: var(--ac-radius);\n  background: var(--ac-paper-2);\n  box-shadow: var(--ac-shadow-1);\n  opacity: 0;\n  transform: translateY(6px);\n  animation: ac-rise 420ms var(--ac-ease) forwards;\n}\n\n.ac-letter__title {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-cap);\n  color: var(--ac-rose);\n  margin-bottom: 6px;\n}\n\n.ac-letter__body {\n  margin: 0;\n  font-family: var(--ac-serif);\n  font-size: var(--ac-body);\n  line-height: var(--ac-leading-letter);\n  color: var(--ac-ink);\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n@keyframes ac-rise {\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n.ac-gift {\n  margin-top: var(--ac-s5);\n  padding: var(--ac-s4);\n  border-left: 2px solid var(--ac-rose);\n  background: var(--ac-rose-wash);\n  border-radius: 0 var(--ac-radius) var(--ac-radius) 0;\n}\n\n.ac-gift__name {\n  font-family: var(--ac-serif);\n  font-size: var(--ac-h2);\n  letter-spacing: 0.01em;\n}\n\n.ac-gift__desc {\n  margin-top: 6px;\n  font-size: var(--ac-small);\n  line-height: 1.75;\n  color: var(--ac-ink-2);\n}\n\n.ac-details {\n  display: flex;\n  flex-direction: column;\n  gap: var(--ac-s3);\n  margin-top: var(--ac-s3);\n}\n\n.ac-detail {\n  display: flex;\n  gap: var(--ac-s3);\n  font-size: var(--ac-small);\n  line-height: 1.7;\n  color: var(--ac-ink);\n}\n\n.ac-detail__mark {\n  flex: 0 0 auto;\n  width: 5px;\n  height: 5px;\n  margin-top: 9px;\n  border-radius: 50%;\n  background: var(--ac-gold);\n}\n\n.ac-memo {\n  margin-top: var(--ac-s4);\n}\n\n.ac-memo__item {\n  padding: var(--ac-s3) 0;\n  border-bottom: 1px solid var(--ac-line-soft);\n}\n\n.ac-memo__when {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-cap);\n  color: var(--ac-ink-3);\n}\n\n.ac-memo__text {\n  margin-top: 4px;\n  font-size: var(--ac-small);\n  line-height: 1.72;\n}\n\n/* ---------- 贺卡容器 ---------- */\n\n.ac-cardframe {\n  margin-top: var(--ac-s5);\n  border-radius: var(--ac-radius);\n  overflow: hidden;\n  background: transparent;\n}\n\n.ac-cardframe iframe {\n  display: block;\n  width: 100%;\n  height: 420px;\n  border: 0;\n  background: transparent;\n  transition: height 260ms var(--ac-ease);\n}\n\n.ac-cardnote {\n  margin-top: var(--ac-s2);\n  font-size: var(--ac-micro);\n  color: var(--ac-ink-3);\n  text-align: center;\n}\n\n/* ---------- 语音条 ---------- */\n\n.ac-audio {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s3);\n  margin-top: var(--ac-s5);\n  padding: var(--ac-s2) var(--ac-s3);\n  border: var(--ac-line-1);\n  border-radius: 999px;\n  background: var(--ac-paper-2);\n}\n\n.ac-audio__play {\n  flex: 0 0 auto;\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  border: 0;\n  background: var(--ac-rose);\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  padding: 0;\n}\n\n.ac-audio__play svg {\n  width: 14px;\n  height: 14px;\n}\n\n.ac-audio__main {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n.ac-audio__title {\n  font-size: var(--ac-cap);\n  color: var(--ac-ink);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-audio__hint {\n  margin-top: 1px;\n  font-size: var(--ac-micro);\n  color: var(--ac-ink-3);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-audio__wave {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  flex: 0 0 auto;\n  height: 18px;\n}\n\n.ac-audio__wave i {\n  width: 2px;\n  border-radius: 2px;\n  background: var(--ac-rose-soft);\n  opacity: 0.45;\n}\n\n.ac-audio__wave i:nth-child(1) { height: 6px; }\n.ac-audio__wave i:nth-child(2) { height: 12px; }\n.ac-audio__wave i:nth-child(3) { height: 8px; }\n.ac-audio__wave i:nth-child(4) { height: 16px; }\n.ac-audio__wave i:nth-child(5) { height: 10px; }\n.ac-audio__wave i:nth-child(6) { height: 14px; }\n\n.ac-audio--playing .ac-audio__wave i {\n  animation: ac-wave 900ms var(--ac-ease) infinite alternate;\n}\n\n.ac-audio--playing .ac-audio__wave i:nth-child(2n) {\n  animation-delay: 120ms;\n}\n\n@keyframes ac-wave {\n  from { opacity: 0.35; transform: scaleY(0.6); }\n  to { opacity: 0.9; transform: scaleY(1); }\n}\n\n/* ---------- 给明年 ---------- */\n\n.ac-noteyear {\n  margin-top: var(--ac-s6);\n  padding-top: var(--ac-s4);\n  border-top: 1px solid var(--ac-line);\n}\n\n.ac-noteyear__input {\n  width: 100%;\n  min-height: 34px;\n  margin-top: var(--ac-s2);\n  padding: 0 0 6px;\n  border: 0;\n  border-bottom: 1px solid var(--ac-line);\n  background: transparent;\n  color: var(--ac-ink);\n  font-family: var(--ac-serif);\n  font-size: var(--ac-body);\n  line-height: 1.6;\n}\n\n.ac-noteyear__input:focus {\n  outline: none;\n  border-bottom-color: var(--ac-rose-soft);\n}\n\n.ac-noteyear__saved {\n  margin-top: var(--ac-s2);\n  font-size: var(--ac-micro);\n  color: var(--ac-ok);\n}\n\n/* ---------- 设置 ---------- */\n\n.ac-group {\n  padding: var(--ac-s5) 0 var(--ac-s2);\n}\n\n.ac-group + .ac-group {\n  border-top: 1px solid var(--ac-line);\n  margin-top: var(--ac-s4);\n}\n\n.ac-group__title {\n  font-size: var(--ac-micro);\n  letter-spacing: var(--ac-tracking-wide);\n  text-transform: uppercase;\n  color: var(--ac-ink-3);\n  margin-bottom: var(--ac-s2);\n}\n\n.ac-styles {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: var(--ac-s2);\n  margin-top: var(--ac-s3);\n}\n\n.ac-style {\n  display: flex;\n  flex-direction: column;\n  gap: var(--ac-s2);\n  padding: var(--ac-s2);\n  border: 1px solid var(--ac-line);\n  border-radius: var(--ac-radius);\n  background: var(--ac-paper-2);\n  color: var(--ac-ink-2);\n  font-family: inherit;\n  font-size: var(--ac-micro);\n  cursor: pointer;\n  transition: border-color var(--ac-dur) var(--ac-ease), color var(--ac-dur) var(--ac-ease);\n}\n\n.ac-style[aria-pressed="true"] {\n  border-color: var(--ac-rose);\n  color: var(--ac-rose);\n}\n\n.ac-style__thumb {\n  position: relative;\n  height: 52px;\n  border-radius: 4px;\n  overflow: hidden;\n  border: 1px solid var(--ac-line-soft);\n}\n\n.ac-style__thumb--envelope {\n  background: linear-gradient(165deg, #FBEFEC, #F3E3DE);\n}\n\n.ac-style__thumb--envelope::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(180deg, #F3E3DE, #EBD6CF);\n  clip-path: polygon(0 0, 100% 0, 50% 62%);\n}\n\n.ac-style__thumb--polaroid {\n  background: #FFFDF9;\n  padding: 5px 5px 10px;\n}\n\n.ac-style__thumb--polaroid::after {\n  content: "";\n  position: absolute;\n  left: 5px;\n  right: 5px;\n  top: 5px;\n  bottom: 12px;\n  background: linear-gradient(160deg, #F7D9C9, #D98D7E);\n}\n\n.ac-style__thumb--starry {\n  background: radial-gradient(120% 90% at 70% 10%, #2B2A44, #12111C);\n}\n\n.ac-style__thumb--starry::after {\n  content: "";\n  position: absolute;\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  right: 16%;\n  top: 22%;\n  background: radial-gradient(circle at 36% 32%, #FFF6E2, #C9B08A);\n  box-shadow: 0 0 10px rgba(255, 236, 200, 0.5);\n}\n\n.ac-usage {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  margin-top: var(--ac-s3);\n  font-size: var(--ac-cap);\n  color: var(--ac-ink-3);\n  font-variant-numeric: tabular-nums;\n}\n\n.ac-usage strong {\n  font-family: var(--ac-serif);\n  font-size: 18px;\n  font-weight: 600;\n  color: var(--ac-ink);\n}\n\n.ac-stepper {\n  display: flex;\n  align-items: center;\n  gap: var(--ac-s2);\n}\n\n.ac-stepper button {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  border: 1px solid var(--ac-line);\n  background: transparent;\n  color: var(--ac-ink-2);\n  font-size: 16px;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.ac-stepper span {\n  min-width: 34px;\n  text-align: center;\n  font-variant-numeric: tabular-nums;\n  font-size: var(--ac-small);\n}\n\n/* ---------- 提示条 ---------- */\n\n.ac-note {\n  margin-top: var(--ac-s3);\n  padding: var(--ac-s2) var(--ac-s3);\n  border-radius: var(--ac-radius-sm);\n  background: var(--ac-paper-3);\n  font-size: var(--ac-cap);\n  line-height: 1.6;\n  color: var(--ac-ink-2);\n}\n\n.ac-note--warn {\n  background: var(--ac-rose-wash);\n  color: var(--ac-rose);\n}\n\n.ac-inline-actions {\n  display: flex;\n  gap: var(--ac-s2);\n  margin-top: var(--ac-s3);\n}\n\n.ac-inline-actions .ac-btn {\n  flex: 1 1 0;\n}\n\n/* ---------- 聊天卡片（不依赖 .ac-root 的变量，独立可读） ---------- */\n\n.ac-card {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  min-width: 180px;\n  max-width: 260px;\n  padding: 10px 12px;\n  border: 1px solid #E6DCD2;\n  border-radius: 12px;\n  background: #FFFDF9;\n  color: #2B2320;\n  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;\n  font-size: 14px;\n  line-height: 1.4;\n  text-align: left;\n  cursor: pointer;\n  -webkit-tap-highlight-color: transparent;\n  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);\n}\n\n.ac-card:active {\n  transform: scale(0.985);\n}\n\n.ac-card__avatar {\n  flex: 0 0 auto;\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  overflow: hidden;\n  background: #F3ECE4;\n  color: #9C8A81;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: "Songti SC", serif;\n  font-size: 13px;\n}\n\n.ac-card__avatar img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  display: block;\n}\n\n.ac-card__main {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n.ac-card__title {\n  font-size: 14px;\n  font-weight: 500;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-card__sub {\n  margin-top: 2px;\n  font-size: 11px;\n  color: #9C8A81;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ac-card__act {\n  flex: 0 0 auto;\n  padding: 4px 10px;\n  border-radius: 999px;\n  background: #FBEFEC;\n  color: #C9605A;\n  font-size: 11px;\n  letter-spacing: 0.04em;\n}\n\n@media (prefers-color-scheme: dark) {\n  .ac-card {\n    border-color: #332A25;\n    background: #1F1A17;\n    color: #F5EFE8;\n  }\n\n  .ac-card__avatar {\n    background: #2A2320;\n    color: #8C7D74;\n  }\n\n  .ac-card__sub {\n    color: #8C7D74;\n  }\n\n  .ac-card__act {\n    background: #2A1B19;\n    color: #E08A83;\n  }\n}\n';

  // src/ui/style.js
  var STYLE_ID = "anniversary-companion-style";
  var CSS = [theme_default, base_default, views_default].join("\n");
  function ensureStyle() {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function removeStyleIfUnused() {
    if (typeof document === "undefined") return;
    if (document.querySelector(".ac-root, .ac-card")) return;
    var style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }
  function watchTheme(root, mode) {
    if (typeof window === "undefined") return function() {
    };
    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function apply() {
      if (!root) return;
      var dark = mode === "dark" || mode !== "light" && !!mq && mq.matches;
      root.dataset.theme = dark ? "dark" : "light";
    }
    apply();
    if (!mq) return apply;
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
    return function(nextMode) {
      mode = nextMode;
      apply();
    };
  }

  // src/ui/icons.js
  var STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    back: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M14.5 5 8 12l6.5 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M6 6l12 12M18 6 6 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24" ' + STROKE + '><circle cx="12" cy="12" r="3"/><path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13l12-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M19 12a7 7 0 1 1-2.4-5.3"/><path d="M19 4.5V9h-4.5"/></svg>',
    envelope: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M4 6.5h16v11H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M5 6h14v14H5z"/><path d="M5 10h14M9 4v3M15 4v3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12"/></svg>',
    share: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M12 4v10"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 13v6h14v-6"/></svg>',
    spark: '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M12 4.5 13.6 10l5.4 1.7-5.4 1.7L12 19l-1.6-5.6L5 11.7 10.4 10z"/></svg>'
  };
  function icon(name) {
    return ICONS[name] || ICONS.spark;
  }
  var PLUS_ICON_SVG = '<svg viewBox="0 0 24 24" ' + STROKE + '><path d="M4 6.5h16v11H4z"/><path d="m4 7 8 6 8-6"/><path d="M15.5 16.5c.9-.9 2.4-.4 2.4.9s-1.5 2-2.4 2.6c-.9-.6-2.4-1.3-2.4-2.6s1.5-1.8 2.4-.9z" fill="currentColor" stroke="none"/></svg>';

  // src/ui/components.js
  function avatar(url, name, opts) {
    var options = opts || {};
    var box = h("div", { class: "ac-avatar" + (options.large ? " ac-avatar--lg" : "") });
    var label = String(name || "").trim();
    if (url) {
      var img = h("img", { alt: "", src: url, loading: "lazy" });
      img.addEventListener("error", function() {
        if (img.parentNode) img.parentNode.removeChild(img);
        box.textContent = label ? label.slice(0, 1) : "·";
      });
      box.appendChild(img);
    } else {
      box.textContent = label ? label.slice(0, 1) : "·";
    }
    return box;
  }
  function iconButton(name, label, onClick) {
    return h("button", {
      class: "ac-icon-btn",
      type: "button",
      "aria-label": label,
      html: icon(name),
      onclick: onClick
    });
  }
  function pageHeader(options) {
    var opts = options || {};
    var actions = [];
    (opts.actions || []).forEach(function(item) {
      if (!item) return;
      if (item.text) {
        actions.push(h("button", {
          class: "ac-btn ac-btn--text",
          type: "button",
          text: item.text,
          disabled: !!item.disabled,
          onclick: item.onClick
        }));
        return;
      }
      actions.push(iconButton(item.icon, item.label, item.onClick));
    });
    return h("header", { class: "ac-header" + (opts.bordered ? " ac-header--bordered" : "") }, [
      opts.onBack ? iconButton("back", "返回", opts.onBack) : null,
      h("div", { class: "ac-header__title" }, opts.title || ""),
      actions.length ? h("div", { class: "ac-header__actions" }, actions) : null,
      opts.onClose ? iconButton("close", "关闭", opts.onClose) : null
    ]);
  }
  function tag(textValue, tone) {
    return h("span", { class: "ac-tag" + (tone === "gold" ? " ac-tag--gold" : tone === "quiet" ? " ac-tag--quiet" : "") }, textValue);
  }
  function dots(state) {
    var list = state && state.dots || [];
    var box = h("div", { class: "ac-dots" });
    list.forEach(function(dot) {
      box.appendChild(h("i", { class: "ac-dot" + (dot.on ? " ac-dot--on" : "") }));
    });
    return box;
  }
  function switchRow(options) {
    var opts = options || {};
    var toggle = h("button", {
      class: "ac-switch",
      type: "button",
      role: "switch",
      "aria-checked": opts.checked ? "true" : "false",
      "aria-label": opts.title || ""
    });
    toggle.addEventListener("click", function() {
      var next = toggle.getAttribute("aria-checked") !== "true";
      toggle.setAttribute("aria-checked", next ? "true" : "false");
      if (typeof opts.onChange === "function") opts.onChange(next);
    });
    return h("div", { class: "ac-switch-row" }, [
      h("div", { class: "ac-switch-row__main" }, [
        h("div", { class: "ac-switch-row__title" }, opts.title || ""),
        opts.desc ? h("div", { class: "ac-switch-row__desc" }, opts.desc) : null
      ]),
      toggle
    ]);
  }
  function stepper(options) {
    var opts = options || {};
    var value = Number(opts.value) || 0;
    var label = h("span", null, String(value));
    function update(delta) {
      var next = Math.min(opts.max || 200, Math.max(opts.min || 1, value + delta));
      if (next === value) return;
      value = next;
      label.textContent = String(value);
      if (typeof opts.onChange === "function") opts.onChange(value);
    }
    return h("div", { class: "ac-stepper" }, [
      h("button", { type: "button", "aria-label": "减少", text: "−", onclick: function() {
        update(-(opts.step || 1));
      } }),
      label,
      h("button", { type: "button", "aria-label": "增加", text: "+", onclick: function() {
        update(opts.step || 1);
      } })
    ]);
  }
  function emptyState(options) {
    var opts = options || {};
    return h("div", { class: "ac-empty" }, [
      h("div", { class: "ac-empty__dash" }),
      h("div", { class: "ac-empty__line" }, opts.line || ""),
      opts.hint ? h("div", { class: "ac-cap" }, opts.hint) : null,
      opts.actionLabel ? h("button", {
        class: "ac-btn ac-btn--ghost",
        type: "button",
        style: "max-width:260px",
        text: opts.actionLabel,
        onclick: opts.onAction
      }) : null
    ]);
  }
  function group(title, children) {
    return h("section", { class: "ac-group" }, [
      title ? h("div", { class: "ac-group__title" }, title) : null,
      children
    ]);
  }
  function note(textValue, warn) {
    return h("div", { class: "ac-note" + (warn ? " ac-note--warn" : "") }, textValue);
  }

  // src/ui/views/home.js
  function createHomeView(ctx) {
    var el = h("div", { class: "ac-view" });
    var body = h("div", { class: "ac-body" });
    el.appendChild(pageHeader({
      title: "纪念日",
      onClose: function() {
        ctx.actions.close();
      },
      actions: [{ icon: "gear", label: "设置", onClick: function() {
        ctx.actions.go("settings");
      } }]
    }));
    el.appendChild(body);
    el.appendChild(h("div", { class: "ac-footer" }, [
      h("button", {
        class: "ac-btn ac-btn--ghost",
        type: "button",
        text: "＋ 新建纪念日",
        onclick: function() {
          ctx.actions.newPlan();
        }
      })
    ]));
    function renderHero(plan, now) {
      var left = daysLeft(plan, now);
      var index = planIndex(plan, now);
      var occurrence = occurrenceKey(plan, now);
      var progress = progressDots(plan, now);
      var today = left === 0;
      return h("section", { class: "ac-hero" }, [
        h("div", { class: "ac-hero__year" }, [
          h("span", { class: "ac-label" }, today ? "就是今天" : new Date(now).getFullYear() + " 年"),
          tag("第 " + index + " 个", index > 1 ? "gold" : "")
        ]),
        h("div", { class: "ac-hero__who" }, [
          avatar(plan.characterAvatar, plan.characterName, { large: true }),
          h("div", { style: "min-width:0" }, [
            h("div", { class: "ac-hero__name" }, plan.characterName || "未指定角色"),
            h("div", { class: "ac-cap" }, plan.title)
          ])
        ]),
        h("div", { class: "ac-count" }, [
          h("span", { class: "ac-count__num" }, String(Math.max(0, left))),
          h("span", { class: "ac-count__unit" }, "天")
        ]),
        h("div", { class: "ac-hero__meta" }, [
          h("span", null, cnDateShort(occurrence) + " · 周" + cnWeekday(occurrence)),
          h("span", { class: "ac-faint" }, "·"),
          h("span", null, statusLine(plan, now))
        ]),
        h("div", { class: "ac-progress" }, [
          dots(progress),
          h(
            "span",
            { class: "ac-progress__line" },
            plan.secrecy === "secret" ? "他一直在准备" : progress.total ? progress.done + " / " + progress.total + " 步" : "还没有开始准备"
          )
        ])
      ]);
    }
    function renderRow(plan, now) {
      var left = daysLeft(plan, now);
      var index = planIndex(plan, now);
      var sealed = !(plan.reveal && plan.reveal.unlockedAt);
      return h("button", {
        class: "ac-row ac-plan-row" + (sealed ? " ac-plan-row--sealed" : ""),
        type: "button",
        onclick: function() {
          ctx.actions.openPlan(plan.id);
        }
      }, [
        avatar(plan.characterAvatar, plan.characterName),
        h("div", { class: "ac-row__main" }, [
          h("div", { class: "ac-row__title" }, plan.title),
          h(
            "div",
            { class: "ac-row__meta" },
            [plan.characterName || "未指定角色", cnDateShort(occurrenceKey(plan, now)), "第 " + index + " 个"].join(" · ")
          )
        ]),
        h("div", { class: "ac-row__side" }, [
          h(
            "span",
            { class: "ac-plan-row__days" + (left === 0 ? " ac-plan-row__days--today" : "") },
            left === 0 ? "今天" : left > 0 ? left + " 天" : "已过"
          ),
          h("i", { class: "ac-plan-row__state" + (left === 0 ? " ac-plan-row__state--on" : "") })
        ])
      ]);
    }
    function update(state) {
      var now = Date.now();
      clear(body);
      var plans = activePlans(state.plans, now);
      if (!plans.length) {
        body.appendChild(emptyState({
          line: "还没有哪一个日子，被单独留出来。",
          hint: "让他从你们的记忆里想一个",
          actionLabel: "让 TA 想一个日子",
          onAction: function() {
            ctx.actions.newPlan({ suggest: true });
          }
        }));
        return;
      }
      body.appendChild(renderHero(plans[0], now));
      if (plans.length > 1) {
        var rest = h("div", { class: "ac-list" });
        rest.appendChild(h("div", { class: "ac-list__head" }, [
          h("span", { class: "ac-label" }, "全部日子"),
          h("span", { class: "ac-cap ac-faint" }, plans.length + " 个")
        ]));
        plans.forEach(function(plan) {
          rest.appendChild(renderRow(plan, now));
        });
        body.appendChild(rest);
      } else {
        var opened = findPlan(state.plans, plans[0].id);
        if (opened && opened.reveal.unlockedAt) {
          body.appendChild(h("div", { class: "ac-list" }, [
            h("button", {
              class: "ac-btn ac-btn--quiet",
              type: "button",
              text: "再看一次上次拆开的惊喜",
              onclick: function() {
                ctx.actions.go("reveal", { planId: opened.id });
              }
            })
          ]));
        }
      }
    }
    return { el, update, destroy: function() {
    } };
  }

  // src/ui/views/edit.js
  function defaultDraft(state) {
    return {
      id: "",
      type: "custom",
      title: "",
      date: todayKey(),
      recurrence: "yearly",
      secrecy: state.settings && state.settings.defaultSecrecy || "hint",
      characterId: "",
      characterName: "",
      characterAvatar: ""
    };
  }
  function createEditView(ctx, state) {
    var draft = Object.assign(defaultDraft(state), state.draft || {});
    if (!isValidDateKey(draft.date)) draft.date = todayKey();
    if (!draft.title) draft.title = typeOf(draft.type).title;
    var titleTouched = !!state.draft && !!state.draft.id;
    var saving = false;
    var suggesting = false;
    var el = h("div", { class: "ac-view" });
    var body = h("div", { class: "ac-body" });
    el.appendChild(pageHeader({
      title: draft.id ? "编辑纪念日" : "新建纪念日",
      onBack: function() {
        ctx.actions.back();
      },
      actions: [{ text: "保存", onClick: save }]
    }));
    el.appendChild(body);
    var pills = h("div", { class: "ac-pills" });
    TYPES.forEach(function(type) {
      var pill = h("button", {
        class: "ac-pill",
        type: "button",
        "aria-pressed": draft.type === type.id ? "true" : "false",
        text: type.label
      });
      pill.addEventListener("click", function() {
        draft.type = type.id;
        Array.prototype.forEach.call(pills.children, function(node) {
          node.setAttribute("aria-pressed", node === pill ? "true" : "false");
        });
        if (!titleTouched) {
          draft.title = type.title;
          titleInput.value = type.title;
        }
      });
      pills.appendChild(pill);
    });
    var charsBox = h("div", { class: "ac-chars" });
    var dateInput = h("input", {
      class: "ac-input ac-input--date",
      type: "date",
      value: draft.date,
      "aria-label": "纪念日日期"
    });
    dateInput.addEventListener("change", function() {
      if (isValidDateKey(dateInput.value)) draft.date = dateInput.value;
    });
    var titleInput = h("input", {
      class: "ac-input",
      type: "text",
      maxlength: "24",
      value: draft.title,
      placeholder: "给这一天起个名字",
      "aria-label": "纪念日名称"
    });
    titleInput.addEventListener("input", function() {
      draft.title = titleInput.value;
      titleTouched = true;
    });
    var secrecyBox = h("div", { class: "ac-secrecy" });
    SECRECY.forEach(function(item) {
      var opt = h("button", {
        class: "ac-secrecy__opt",
        type: "button",
        "aria-pressed": draft.secrecy === item.id ? "true" : "false"
      }, [
        h("i", { class: "ac-secrecy__bullet" }),
        h("div", null, [
          h("div", { class: "ac-secrecy__title" }, item.label),
          h("div", { class: "ac-secrecy__desc" }, item.desc)
        ])
      ]);
      opt.addEventListener("click", function() {
        draft.secrecy = item.id;
        Array.prototype.forEach.call(secrecyBox.children, function(node) {
          node.setAttribute("aria-pressed", node === opt ? "true" : "false");
        });
      });
      secrecyBox.appendChild(opt);
    });
    var suggestBtn = h("button", {
      class: "ac-btn ac-btn--ghost",
      type: "button",
      text: "让 TA 从记忆里想一个日子"
    });
    var candidatesBox = h("div", { class: "ac-candidates" });
    suggestBtn.addEventListener("click", function() {
      if (suggesting) return;
      if (!draft.characterId) {
        ctx.actions.toast("先选一个角色，才能读 TA 的记忆");
        return;
      }
      suggesting = true;
      suggestBtn.textContent = "正在回想…";
      suggestBtn.disabled = true;
      clear(candidatesBox);
      ctx.actions.suggestDates(draft).then(function(res) {
        suggesting = false;
        suggestBtn.textContent = "让 TA 从记忆里想一个日子";
        suggestBtn.disabled = false;
        if (!res.ok) {
          candidatesBox.appendChild(note(
            res.reason === "quota" ? "今天的 AI 次数用完了，明天再试。" : res.reason === "ai_off" ? "设置里关掉了 AI，先打开它。" : res.reason === "no_api" ? "宿主没有提供 AI 接口。" : res.reason === "no_memory" ? "这个角色还没有可以读的记忆，先手动填日期吧。" : "没能想出具体的日子，先手动填一个吧。",
            true
          ));
          return;
        }
        if (!res.candidates.length) {
          candidatesBox.appendChild(note("记忆里没有找到明确的日子，先手动填一个吧。"));
          return;
        }
        res.candidates.forEach(function(candidate) {
          var conf = h("div", { class: "ac-conf" });
          for (var i = 0; i < 5; i++) conf.appendChild(h("i", { class: i < candidate.confidence ? "on" : "" }));
          var row = h("button", { class: "ac-candidate", type: "button" }, [
            h("div", { class: "ac-candidate__date" }, cnDateShort(candidate.date)),
            h("div", { class: "ac-candidate__main" }, [
              h("div", { class: "ac-candidate__title" }, candidate.title || "纪念日"),
              h("div", { class: "ac-candidate__ev" }, candidate.evidence || "")
            ]),
            conf
          ]);
          row.addEventListener("click", function() {
            if (isValidDateKey(candidate.date)) {
              draft.date = candidate.date;
              dateInput.value = candidate.date;
            }
            if (candidate.title) {
              draft.title = candidate.title;
              titleInput.value = candidate.title;
              titleTouched = true;
            }
            clear(candidatesBox);
            candidatesBox.appendChild(note("已填入，日期和名字都可以再改。"));
          });
          candidatesBox.appendChild(row);
        });
      });
    });
    body.appendChild(pills);
    body.appendChild(h("div", { class: "ac-label", style: "margin-top:12px" }, "是谁的日子"));
    body.appendChild(charsBox);
    body.appendChild(h("label", { class: "ac-field" }, [
      h("span", { class: "ac-field__label" }, "日期"),
      dateInput
    ]));
    body.appendChild(h("label", { class: "ac-field" }, [
      h("span", { class: "ac-field__label" }, "名字"),
      titleInput
    ]));
    body.appendChild(switchRow({
      title: "每年都过一次",
      desc: "到期后自动滚到明年的同一天",
      checked: draft.recurrence === "yearly",
      onChange: function(on) {
        draft.recurrence = on ? "yearly" : "once";
      }
    }));
    body.appendChild(h("div", { class: "ac-label", style: "margin-top:20px" }, "这一天怎么过"));
    body.appendChild(secrecyBox);
    body.appendChild(h("div", { class: "ac-label", style: "margin-top:20px" }, "不想自己定日子"));
    body.appendChild(h("div", { style: "margin-top:8px" }, [suggestBtn]));
    body.appendChild(candidatesBox);
    ctx.actions.listCharacters().then(function(list) {
      clear(charsBox);
      if (!list.length) {
        charsBox.appendChild(note("宿主里还没有角色，可以先自己填日期。"));
        return;
      }
      if (!draft.characterId && list.length === 1) {
        applyCharacter(list[0]);
      }
      list.forEach(function(item) {
        var node = h("button", {
          class: "ac-char",
          type: "button",
          "aria-pressed": draft.characterId === item.id ? "true" : "false"
        }, [
          avatar(item.avatar, item.name, { large: true }),
          h("div", { class: "ac-char__name" }, item.handle || item.name || "未命名")
        ]);
        node.addEventListener("click", function() {
          applyCharacter(item);
          Array.prototype.forEach.call(charsBox.children, function(child) {
            if (child.classList && child.classList.contains("ac-char")) {
              child.setAttribute("aria-pressed", child === node ? "true" : "false");
            }
          });
        });
        charsBox.appendChild(node);
      });
    });
    function applyCharacter(item) {
      draft.characterId = item.id;
      draft.characterName = item.name || item.handle || "";
      draft.characterAvatar = item.avatar || "";
    }
    function save() {
      if (saving) return;
      if (!isValidDateKey(draft.date)) {
        ctx.actions.toast("先选一个日期");
        return;
      }
      var title = String(draft.title || "").trim();
      if (!title) {
        ctx.actions.toast("给这一天起个名字");
        return;
      }
      draft.title = title.slice(0, 24);
      saving = true;
      ctx.actions.savePlan(draft).then(function(res) {
        saving = false;
        if (!res || !res.ok) {
          ctx.actions.toast(res && res.error || "保存失败，再试一次");
          return;
        }
        ctx.actions.toast(draft.id ? "已更新" : "已经记下了");
        ctx.actions.go("detail", { planId: res.plan.id, replace: true });
      });
    }
    return {
      el,
      update: function() {
      },
      destroy: function() {
      }
    };
  }

  // src/ui/views/detail.js
  function stageLabel(offsetDays) {
    if (offsetDays === 0) return "当天";
    return "还有 " + offsetDays + " 天时";
  }
  function createDetailView(ctx, state) {
    var plan = null;
    for (var i = 0; i < state.plans.length; i++) {
      if (state.plans[i].id === state.planId) {
        plan = state.plans[i];
        break;
      }
    }
    var el = h("div", { class: "ac-view" });
    if (!plan) {
      el.appendChild(pageHeader({ title: "纪念日", onBack: function() {
        ctx.actions.back();
      } }));
      el.appendChild(h("div", { class: "ac-body" }, [note("这个纪念日已经不在了。", true)]));
      return { el, update: function() {
      }, destroy: function() {
      } };
    }
    var now = Date.now();
    var left = daysLeft(plan, now);
    var today = isRevealDay(plan, now);
    var unlocked = !!(plan.reveal && plan.reveal.unlockedAt);
    var occurrence = occurrenceKey(plan, now);
    var index = planIndex(plan, now);
    var mode = SECRECY.filter(function(s) {
      return s.id === plan.secrecy;
    })[0] || SECRECY[1];
    var progress = progressDots(plan, now);
    el.appendChild(pageHeader({
      title: plan.title,
      onBack: function() {
        ctx.actions.back();
      },
      actions: [
        { text: "编辑", onClick: function() {
          ctx.actions.editPlan(plan.id);
        } },
        { icon: "trash", label: "删除", onClick: function() {
          ctx.actions.deletePlan(plan.id);
        } }
      ]
    }));
    var body = h("div", { class: "ac-body" });
    body.appendChild(h("section", { class: "ac-band" }, [
      h("div", { style: "display:flex;align-items:flex-end;gap:6px" }, [
        h("span", { class: "ac-band__num" }, String(Math.max(0, left))),
        h("span", { class: "ac-band__unit" }, "天")
      ]),
      h("div", { class: "ac-band__side" }, [
        tag(today ? "就是今天" : "第 " + index + " 个", index > 1 ? "gold" : ""),
        h("span", null, cnDate(occurrence) + " 周" + cnWeekday(occurrence))
      ])
    ]));
    body.appendChild(h("div", { class: "ac-progress", style: "border-top:0;margin-top:12px;padding-top:0" }, [
      dots(progress),
      h("span", { class: "ac-progress__line" }, statusLine(plan, now))
    ]));
    var stages = visibleStages(plan, now);
    body.appendChild(h("div", { class: "ac-label", style: "margin-top:24px" }, mode.label));
    if (plan.secrecy === "secret") {
      body.appendChild(note("他不想提前说。这里只会显示他在准备。"));
      var masked = h("div", { class: "ac-timeline" });
      var placeholders = Math.max(3, Math.min(5, stages.length));
      for (var k = 0; k < placeholders; k++) {
        masked.appendChild(h("div", { class: "ac-timeline__item ac-timeline__item--masked" + (stages[k] && stages[k].done ? " ac-timeline__item--on" : "") }, [
          h("i", { class: "ac-timeline__dot" }),
          h("div", { class: "ac-timeline__when" }, stages[k] ? stageLabel(stages[k].offsetDays) : ""),
          h("div", { class: "ac-timeline__text" }, "· · ·")
        ]));
      }
      body.appendChild(masked);
    } else if (plan.secrecy === "hint") {
      body.appendChild(note("能看到他推进到哪一步，内容要等到当天。"));
      var hintList = h("div", { class: "ac-timeline" });
      if (!stages.length) {
        hintList.appendChild(h("div", { class: "ac-timeline__item" }, [
          h("i", { class: "ac-timeline__dot" }),
          h("div", { class: "ac-timeline__text ac-faint" }, "还没有开始准备")
        ]));
      }
      stages.forEach(function(stage) {
        var maskedItem = !stage.teaser;
        hintList.appendChild(h("div", { class: "ac-timeline__item" + (stage.done ? " ac-timeline__item--on" : "") + (maskedItem ? " ac-timeline__item--masked" : "") }, [
          h("i", { class: "ac-timeline__dot" }),
          h("div", { class: "ac-timeline__when" }, stageLabel(stage.offsetDays)),
          h("div", { class: "ac-timeline__text" }, maskedItem ? "· · ·" : stage.teaser)
        ]));
      });
      body.appendChild(hintList);
    } else {
      body.appendChild(note("这些是他每天做的事。最后一步还封着。"));
      var openList = h("div", { class: "ac-timeline" });
      if (!stages.length) {
        openList.appendChild(h("div", { class: "ac-timeline__item" }, [
          h("i", { class: "ac-timeline__dot" }),
          h("div", { class: "ac-timeline__text ac-faint" }, "还没有开始准备")
        ]));
      }
      stages.forEach(function(stage) {
        var maskedItem = !stage.text;
        openList.appendChild(h("div", { class: "ac-timeline__item" + (stage.done ? " ac-timeline__item--on" : "") + (maskedItem ? " ac-timeline__item--masked" : "") }, [
          h("i", { class: "ac-timeline__dot" }),
          h("div", { class: "ac-timeline__when" }, stageLabel(stage.offsetDays)),
          h("div", { class: "ac-timeline__text" }, maskedItem ? "· · ·" : stage.text)
        ]));
      });
      body.appendChild(openList);
      body.appendChild(h("div", { class: "ac-sealbar" }, [
        h(
          "span",
          { class: "ac-sealbar__text" },
          today ? "他把东西都摆好了，等你拆。" : "他准备的东西封着，等到那天才打开。"
        ),
        tag("封", "quiet")
      ]));
    }
    el.appendChild(body);
    var footer = h("div", { class: "ac-footer" });
    if (today) {
      footer.appendChild(h("button", {
        class: "ac-btn ac-btn--primary",
        type: "button",
        text: unlocked ? "再看一次那天的惊喜" : "拆开惊喜",
        onclick: function() {
          ctx.actions.unlockPlan(plan.id);
        }
      }));
    } else if (unlocked) {
      footer.appendChild(h("button", {
        class: "ac-btn ac-btn--ghost",
        type: "button",
        text: "再看一次上次的惊喜",
        onclick: function() {
          ctx.actions.go("reveal", { planId: plan.id });
        }
      }));
    } else {
      footer.appendChild(h("button", {
        class: "ac-btn ac-btn--ghost",
        type: "button",
        disabled: true,
        text: left > 0 ? "还有 " + left + " 天" : "还没到日子"
      }));
    }
    el.appendChild(footer);
    return { el, update: function() {
    }, destroy: function() {
    } };
  }

  // src/ui/cardFrame.js
  var MIN_H = 320;
  var MAX_H = 900;
  function createCardFrame(html, options) {
    var opts = options || {};
    var frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute("title", "纪念日贺卡");
    frame.setAttribute("loading", "lazy");
    frame.srcdoc = prepareTrustedCard(html);
    var wrap = h("div", { class: "ac-cardframe" }, [frame]);
    var disposed = false;
    function onMessage(event) {
      if (disposed || !frame.contentWindow || event.source !== frame.contentWindow) return;
      var data = event.data;
      if (!data || data.type !== "ac-card") return;
      var payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      if (data.action === "height") {
        var height = Number(payload.height);
        if (!isFinite(height) || height <= 0) return;
        frame.style.height = Math.min(MAX_H, Math.max(MIN_H, Math.round(height))) + "px";
        return;
      }
      if (data.action === "done" || data.action === "open") {
        if (typeof opts.onOpen === "function") opts.onOpen();
      }
    }
    window.addEventListener("message", onMessage);
    return {
      el: wrap,
      destroy: function() {
        disposed = true;
        window.removeEventListener("message", onMessage);
        frame.srcdoc = "";
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
  }

  // src/ui/views/reveal.js
  function createRevealView(ctx, state) {
    var plan = null;
    for (var i = 0; i < state.plans.length; i++) {
      if (state.plans[i].id === state.planId) {
        plan = state.plans[i];
        break;
      }
    }
    var el = h("div", { class: "ac-view" });
    var cleanups = [];
    var audio = null;
    if (!plan) {
      el.appendChild(pageHeader({ title: "惊喜", onBack: function() {
        ctx.actions.back();
      } }));
      el.appendChild(h("div", { class: "ac-body" }, [note("这个纪念日已经不在了。", true)]));
      return { el, update: function() {
      }, destroy: function() {
      } };
    }
    var surprise = plan.surprise || {};
    var letter = surprise.letter || [];
    var index = planIndex(plan, Date.now());
    var occurrence = occurrenceKey(plan, Date.now());
    el.appendChild(pageHeader({
      title: "第 " + index + " 个纪念日",
      onBack: function() {
        ctx.actions.back();
      },
      actions: [{ icon: "refresh", label: "重新生成", onClick: function() {
        ctx.actions.regenerateSurprise(plan.id);
      } }]
    }));
    var body = h("div", { class: "ac-body" });
    el.appendChild(body);
    if (!surprise.generatedAt) {
      body.appendChild(note("惊喜还没生成。", true));
      body.appendChild(h("button", {
        class: "ac-btn ac-btn--primary",
        type: "button",
        text: "现在准备",
        style: "margin-top:16px",
        onclick: function() {
          ctx.actions.regenerateSurprise(plan.id);
        }
      }));
      return { el, update: function() {
      }, destroy };
    }
    if (!state.revealOpened) {
      renderEnvelope();
    } else {
      renderContent();
    }
    function renderEnvelope() {
      var preview = letter[0] && letter[0].body || "我把这一封准备了很久。";
      var envelope = h("div", { class: "ac-envelope" }, [
        h("div", { class: "ac-envelope__paper" }, [
          h("div", { class: "ac-envelope__name" }, (plan.characterName || "TA") + " 写给你"),
          h("div", { class: "ac-envelope__line" }, preview.slice(0, 48))
        ]),
        h("div", { class: "ac-envelope__flap" }),
        h("div", { class: "ac-envelope__seal" }, "喜")
      ]);
      envelope.addEventListener("click", function() {
        if (envelope.classList.contains("ac-envelope--open")) return;
        envelope.classList.add("ac-envelope--open");
        setTimeout(function() {
          var now = ctx.actions.getState();
          if (now.route === "reveal" && now.planId === plan.id) ctx.actions.markRevealOpened();
        }, 460);
      });
      body.appendChild(h("div", { class: "ac-envelope-wrap" }, [
        h("div", { class: "ac-label" }, cnDate(occurrence) + " · 第 " + index + " 个"),
        envelope,
        h("div", { class: "ac-envelope__hint" }, "轻点信封拆开")
      ]));
    }
    function renderContent() {
      body.appendChild(h(
        "div",
        { class: "ac-label", style: "padding-top:8px" },
        (plan.characterName || "TA") + " 留给你的"
      ));
      var letterBox = h("div", { class: "ac-letter" });
      letter.forEach(function(block, i2) {
        var card = h("article", { class: "ac-letter__block", style: "animation-delay:" + i2 * 90 + "ms" }, [
          block.title ? h("div", { class: "ac-letter__title" }, block.title) : null,
          h("p", { class: "ac-letter__body" }, block.body)
        ]);
        letterBox.appendChild(card);
      });
      body.appendChild(letterBox);
      if (surprise.gift && (surprise.gift.name || surprise.gift.desc)) {
        body.appendChild(h("div", { class: "ac-gift" }, [
          h("div", { class: "ac-label", style: "margin-bottom:6px" }, "他还准备了"),
          h("div", { class: "ac-gift__name" }, surprise.gift.name || "一份东西"),
          surprise.gift.desc ? h("div", { class: "ac-gift__desc" }, surprise.gift.desc) : null
        ]));
      }
      if (surprise.details && surprise.details.length) {
        body.appendChild(h("div", { class: "ac-group__title", style: "margin-top:24px" }, "他还记得这些"));
        var detailBox = h("div", { class: "ac-details" });
        surprise.details.forEach(function(item) {
          detailBox.appendChild(h("div", { class: "ac-detail" }, [
            h("i", { class: "ac-detail__mark" }),
            h("span", null, item.text)
          ]));
        });
        body.appendChild(detailBox);
      }
      if (surprise.timeline && surprise.timeline.length) {
        body.appendChild(h("div", { class: "ac-group__title", style: "margin-top:24px" }, "我们这一年"));
        var memo = h("div", { class: "ac-memo" });
        surprise.timeline.forEach(function(item) {
          memo.appendChild(h("div", { class: "ac-memo__item" }, [
            h("div", { class: "ac-memo__when" }, item.when || ""),
            h("div", { class: "ac-memo__text" }, item.text)
          ]));
        });
        body.appendChild(memo);
      }
      if (surprise.cardHtml) {
        body.appendChild(h("div", { class: "ac-group__title", style: "margin-top:24px" }, "一张卡"));
        var frame = createCardFrame(surprise.cardHtml, { onOpen: function() {
        } });
        body.appendChild(frame.el);
        cleanups.push(frame.destroy);
        body.appendChild(h("div", { class: "ac-cardnote" }, "卡片里的内容可以点一点"));
      }
      body.appendChild(renderAudio());
      body.appendChild(renderNextYear());
      var footer = h("div", { class: "ac-footer" }, [
        h("button", {
          class: "ac-btn ac-btn--ghost",
          type: "button",
          text: "把这张惊喜卡发到聊天",
          onclick: function() {
            ctx.actions.sendChatCard(plan.id);
          }
        })
      ]);
      el.appendChild(footer);
    }
    function renderAudio() {
      var saved = surprise.audio && surprise.audio.url ? surprise.audio.url : "";
      var busy = state.busy === "voice";
      var playBtn = h("button", {
        class: "ac-audio__play",
        type: "button",
        "aria-label": saved ? "播放" : "生成语音",
        html: saved ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13l12-6.5z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 9v6h3l4 3V6L8 9z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/></svg>'
      });
      var title = h("div", { class: "ac-audio__title" }, saved ? "他读给你听" : busy ? "正在生成语音…" : "让他把信念给你听");
      var hint = h("div", { class: "ac-audio__hint" }, saved ? "点左边播放" : "用角色绑定的语音");
      var wave = h("div", { class: "ac-audio__wave" }, [h("i"), h("i"), h("i"), h("i"), h("i"), h("i")]);
      var bar = h("div", { class: "ac-audio" }, [playBtn, h("div", { class: "ac-audio__main" }, [title, hint]), wave]);
      function setPlaying(on) {
        bar.classList.toggle("ac-audio--playing", !!on);
        playBtn.setAttribute("aria-label", on ? "暂停" : "播放");
        playBtn.innerHTML = on ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13l12-6.5z"/></svg>';
      }
      function start(url) {
        if (audio) {
          audio.pause();
          audio = null;
        }
        audio = new Audio(url);
        audio.addEventListener("ended", function() {
          setPlaying(false);
        });
        audio.addEventListener("error", function() {
          setPlaying(false);
        });
        var p = audio.play();
        if (p && typeof p.catch === "function") {
          p.catch(function() {
            setPlaying(false);
            ctx.actions.toast("播放失败，可能是音频链接过期了，重新生成一次");
          });
        }
        setPlaying(true);
      }
      playBtn.addEventListener("click", function() {
        if (audio && !audio.paused) {
          audio.pause();
          setPlaying(false);
          return;
        }
        if (saved) {
          start(saved);
          return;
        }
        bar.classList.add("ac-audio--playing");
        title.textContent = "正在生成语音…";
        ctx.actions.playLetter(plan.id).then(function(res) {
          bar.classList.remove("ac-audio--playing");
          if (!res || !res.ok) {
            setPlaying(false);
            title.textContent = "让他把信念给你听";
            hint.textContent = res && res.message ? res.message : "这次没生成成功";
            return;
          }
          hint.textContent = "点左边播放";
          title.textContent = "他读给你听";
          start(res.url);
        });
      });
      return bar;
    }
    function renderNextYear() {
      var savedText = plan.nextYearNote && plan.nextYearNote.text || "";
      var input = h("input", {
        class: "ac-noteyear__input",
        type: "text",
        maxlength: "60",
        value: savedText,
        placeholder: "写一句给明年的你们",
        "aria-label": "给明年的一句话"
      });
      var status = h("div", { class: "ac-noteyear__saved" }, savedText ? "已经记下了，明年会出现在第一段。" : "");
      var saveBtn = h("button", {
        class: "ac-btn ac-btn--text",
        type: "button",
        text: "记下",
        onclick: function() {
          var value = String(input.value || "").trim();
          if (!value) {
            ctx.actions.toast("先写一句");
            return;
          }
          ctx.actions.saveNextYearNote(plan.id, value);
          status.textContent = "已经记下了，明年会出现在第一段。";
        }
      });
      return h("div", { class: "ac-noteyear" }, [
        h("div", { class: "ac-label" }, "给明年的我们"),
        input,
        h("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:12px" }, [status, saveBtn])
      ]);
    }
    function destroy() {
      cleanups.forEach(function(fn) {
        try {
          fn();
        } catch (e) {
        }
      });
      if (audio) {
        try {
          audio.pause();
        } catch (e) {
        }
        audio = null;
      }
    }
    return { el, update: function() {
    }, destroy };
  }

  // src/ui/views/settings.js
  function createSettingsView(ctx, state) {
    var el = h("div", { class: "ac-view" });
    var body = h("div", { class: "ac-body" });
    var usage = ctx.actions.aiUsage();
    el.appendChild(pageHeader({
      title: "设置",
      onBack: function() {
        ctx.actions.back();
      }
    }));
    el.appendChild(body);
    var aiGroup = group("AI", [
      switchRow({
        title: "允许角色使用 AI",
        desc: "推测日期、写准备过程、写信与贺卡都要用它",
        checked: !!state.settings.ai.enabled,
        onChange: function(on) {
          ctx.actions.saveSettings({ ai: { enabled: on } });
        }
      }),
      h("div", { class: "ac-switch-row" }, [
        h("div", { class: "ac-switch-row__main" }, [
          h("div", { class: "ac-switch-row__title" }, "每天最多几次"),
          h("div", { class: "ac-switch-row__desc" }, "包含推测、准备脚本、信与贺卡")
        ]),
        stepper({
          value: state.settings.ai.dailyLimit,
          min: 1,
          max: 200,
          step: 5,
          onChange: function(value) {
            ctx.actions.saveSettings({ ai: { dailyLimit: value } });
          }
        })
      ]),
      h("div", { class: "ac-usage" }, [
        h("strong", null, String(usage.used)),
        h("span", null, "/ " + usage.limit + " 次 · 今天还剩 " + usage.left + " 次")
      ])
    ]);
    body.appendChild(aiGroup);
    var stylesBox = h("div", { class: "ac-styles" });
    CARD_STYLES.forEach(function(style) {
      var btn = h("button", {
        class: "ac-style",
        type: "button",
        "aria-pressed": state.settings.cardStyle === style.id ? "true" : "false"
      }, [
        h("div", { class: "ac-style__thumb ac-style__thumb--" + style.id }),
        h("span", null, style.label)
      ]);
      btn.addEventListener("click", function() {
        ctx.actions.saveSettings({ cardStyle: style.id });
        Array.prototype.forEach.call(stylesBox.children, function(node) {
          node.setAttribute("aria-pressed", node === btn ? "true" : "false");
        });
      });
      stylesBox.appendChild(btn);
    });
    body.appendChild(group("贺卡风格", [
      h("div", { class: "ac-cap" }, "AI 做贺卡时参考的版式，也用于 AI 不可用时的兜底。"),
      stylesBox
    ]));
    body.appendChild(group("数据", [
      h("div", { class: "ac-cap" }, "所有内容都存在插件自己的私有存储里。卸载插件会一并清空，不会动角色和主记忆。"),
      h("div", { class: "ac-inline-actions" }, [
        h("button", {
          class: "ac-btn ac-btn--ghost",
          type: "button",
          text: "导出 JSON",
          onclick: function() {
            ctx.actions.exportData();
          }
        }),
        h("button", {
          class: "ac-btn ac-btn--ghost",
          type: "button",
          text: "清空数据",
          onclick: function() {
            ctx.actions.clearData();
          }
        })
      ])
    ]));
    body.appendChild(group("关于", [
      note("纪念日 v" + (true ? "0.1.0" : "0.1.0") + "。本插件只读取角色与记忆，不写入主记忆；AI 生成的贺卡在沙箱里运行，无法访问宿主数据。")
    ]));
    return { el, update: function() {
    }, destroy: function() {
    } };
  }

  // src/app/shell.js
  function mountShell(container, app2) {
    ensureStyle();
    var root = h("div", { class: "ac-root" });
    container.appendChild(root);
    var current = null;
    var updateTheme = watchTheme(root, app2.ctx.state.settings.theme);
    function build(state) {
      var viewCtx = { host: app2.ctx.host, actions: app2.ctx.actions, state };
      if (state.route === "edit") return createEditView(viewCtx, state);
      if (state.route === "detail") return createDetailView(viewCtx, state);
      if (state.route === "reveal") return createRevealView(viewCtx, state);
      if (state.route === "settings") return createSettingsView(viewCtx, state);
      return createHomeView(viewCtx);
    }
    function render2(state) {
      if (typeof updateTheme === "function") updateTheme(state.settings.theme);
      if (state.route === "edit" && current && current.route === "edit" && current.planId === state.planId) {
        return;
      }
      if (current && current.view && current.view.destroy) {
        try {
          current.view.destroy();
        } catch (e) {
        }
      }
      clear(root);
      var view = build(state);
      current = { view, route: state.route, planId: state.planId };
      root.appendChild(view.el);
      if (view.update) view.update(state);
    }
    var unsubscribe = app2.subscribe(render2);
    render2(app2.ctx.state);
    return {
      destroy: function() {
        unsubscribe();
        if (current && current.view && current.view.destroy) {
          try {
            current.view.destroy();
          } catch (e) {
          }
        }
        current = null;
        root.remove();
      }
    };
  }

  // src/chat/card.js
  var MESSAGE_TYPE2 = "ac-anniversary";
  var APP_ID = "anniversary-companion-home";
  var PENDING_KEY = "__acPendingOpen";
  function dateLabel(cardData) {
    var data = cardData || {};
    if (data.dateText) return String(data.dateText);
    return "";
  }
  function openPlan(planId, roche) {
    try {
      if (typeof window !== "undefined") window[PENDING_KEY] = planId || "";
    } catch (e) {
    }
    try {
      if (roche && roche.storage && planId) {
        roche.storage.get("ac:meta").then(function(meta) {
          var next = Object.assign({}, meta && typeof meta === "object" ? meta : {}, { pendingOpen: planId });
          return roche.storage.set("ac:meta", next);
        }).catch(function() {
        });
      }
    } catch (e) {
    }
    try {
      if (roche && roche.ui && typeof roche.ui.openApp === "function") {
        roche.ui.openApp(APP_ID);
        return;
      }
    } catch (e) {
    }
    try {
      if (roche && roche.ui && typeof roche.ui.toast === "function") {
        roche.ui.toast("在当前 Roche 版本里打不开纪念日 App");
      }
    } catch (e) {
    }
  }
  function render(container, message, roche) {
    ensureStyle();
    var data = message && message.cardData ? message.cardData : {};
    var av = h("div", { class: "ac-card__avatar" });
    if (data.avatar) {
      var img = h("img", { alt: "", src: data.avatar });
      img.addEventListener("error", function() {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      av.appendChild(img);
    } else {
      av.textContent = String(data.charName || "纪").slice(0, 1);
    }
    var title = h("div", { class: "ac-card__title" }, data.title || "纪念日");
    var sub = h("div", { class: "ac-card__sub" }, [
      data.charName ? data.charName + " · " : "",
      "第 " + (Number(data.index) || 1) + " 个",
      dateLabel(data) ? " · " + dateLabel(data) : ""
    ].join(""));
    var act = h("span", { class: "ac-card__act" }, "拆开");
    var card = h("div", { class: "ac-card", role: "button", tabindex: "0" }, [
      av,
      h("div", { class: "ac-card__main" }, [title, sub]),
      act
    ]);
    card.addEventListener("click", function() {
      openPlan(data.planId || "", roche);
    });
    card.addEventListener("keydown", function(event) {
      if (event && (event.key === "Enter" || event.key === " ")) {
        if (event.preventDefault) event.preventDefault();
        openPlan(data.planId || "", roche);
      }
    });
    clear(container);
    container.appendChild(card);
  }
  function mountCard(container, message, roche) {
    render(container, message, roche);
  }
  function updateCard(container, message, roche) {
    render(container, message, roche);
  }
  function unmountCard() {
  }
  function onCardAction(message, action, payload, roche) {
    if (action !== "open" && action !== "unlock") return;
    var planId = message && message.cardData && message.cardData.planId || "";
    openPlan(planId, roche);
  }
  async function openPlusAction(ctx, roche) {
    ensureStyle();
    var plans = [];
    try {
      if (roche && roche.storage && roche.storage.get) {
        plans = normalizePlans(await roche.storage.get("ac:plans"));
      }
    } catch (e) {
      plans = [];
    }
    var nearest = activePlans(plans, Date.now())[0];
    openPlan(nearest ? nearest.id : "", roche);
  }

  // src/main.js
  var app = null;
  var shell2 = null;
  async function mount(container, roche) {
    ensureStyle();
    container.classList.add("ac-host");
    app = await createApp({ container, roche, version: "0.1.0" });
    shell2 = mountShell(container, app);
  }
  async function unmount(container) {
    if (shell2) {
      shell2.destroy();
      shell2 = null;
    }
    if (app) {
      app.destroy();
      app = null;
    }
    container.replaceChildren();
    container.classList.remove("ac-host");
    removeStyleIfUnused();
  }
  window.RochePlugin.register({
    id: "anniversary-companion",
    name: "纪念日",
    version: "0.1.0",
    description: "让角色从记忆里找回你们的日子，一天天悄悄准备，当天拆开惊喜。",
    apps: [
      {
        id: "anniversary-companion-home",
        name: "纪念日",
        icon: "extension",
        iconImage: "",
        mount,
        unmount
      }
    ],
    // 只做宿主 UI 层：当天发卡片 + 「+」面板入口。
    // 不写 promptOnly / contextProvider / preflight / tools，不注入主聊天上下文。
    chat: {
      scope: { conversationTypes: ["direct", "group"] },
      messageTypes: [
        {
          id: MESSAGE_TYPE2,
          name: "纪念日惊喜",
          scope: { conversationTypes: ["direct", "group"] },
          mount: mountCard,
          update: updateCard,
          unmount: unmountCard,
          onAction: onCardAction
        }
      ],
      plusActions: [
        {
          id: "ac-open",
          label: "纪念日",
          iconSvg: PLUS_ICON_SVG,
          scope: { conversationTypes: ["direct", "group"] },
          open: openPlusAction
        }
      ]
    }
  });
})();
