// ==UserScript==
// @name         微软Bing 必应积分自动脚本
// @version      2026.11.24.2
// @description  必应 Bing 每日热榜自动搜索刷分脚本：悬浮窗控制台，NewsNow 热榜关键词（含最热聚合），后台标签搜索不抢焦点，积分变化智能检测、连续无分自动停、防死循环。纯搜索版，不含 Rewards 任务与定时启动，需手动开始。
// @author       8969
// @match        *://*.bing.com/*
// @match        *://bing.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bing.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gp
// @antifeature referral-link This script includes a refer link.
// @grant        unsafeWindow
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      newsnow.busiyi.world
// ==/UserScript==

// 测试模式开关
// 1: 开启测试模式。点击“开始”时，强制重置今日所有状态（用于调试）。
// 0: 正常模式。智能判断是否已完成，完成后不再重复运行。
const TEST_MODE = 0; // <--- 调试完毕后请记得手动改回0

// ==========================================
// 样式定义区 (UI)
// ==========================================
GM_addStyle(`
    #rebang-widget {
        position: fixed;
        width: 320px;
        background-color: rgba(255, 255, 255, 0.98);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border-radius: 12px;
        z-index: 99999;
        font-family: 'Segoe UI', Arial, sans-serif;
        border: 1px solid #e0e0e0;
        transition: height 0.3s;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color-scheme: light; /* 默认亮色 */
    }

    /* === 滚动条美化 === */
    #rebang-body::-webkit-scrollbar { width: 6px; }
    #rebang-body::-webkit-scrollbar-track { background: transparent; }
    #rebang-body::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 3px; }
    #rebang-body::-webkit-scrollbar-thumb:hover { background-color: #aaa; }

    /* === 适配系统级深色模式 === */
    @media (prefers-color-scheme: dark) {
        #rebang-widget { background-color: #2b2b2b; border-color: #444; color: #eee; color-scheme: dark; }
        #rebang-header { background-color: #3a3a3a !important; border-bottom-color: #444 !important; }
        .keyword-link { color: #bbb !important; }
        .keyword-link:hover { color: #fff !important; }
        #rebang-widget select, #rebang-widget input { background-color: #444; color: #fff; border: 1px solid #555; }
        #rebang-widget select option { background-color: #444; color: #fff; }
        #rebang-body::-webkit-scrollbar-thumb { background-color: #555; }
        #rebang-body::-webkit-scrollbar-thumb:hover { background-color: #777; }
    }

    /* === 适配 Bing 网页版强制深色模式 (类名 .b_dark) === */
    .b_dark #rebang-widget {
        background-color: #2b2b2b;
        border-color: #444;
        color: #eee;
        color-scheme: dark;
    }
    .b_dark #rebang-header {
        background-color: #3a3a3a !important;
        border-bottom-color: #444 !important;
    }
    .b_dark #rebang-widget .keyword-link { color: #bbb !important; }
    .b_dark #rebang-widget .keyword-link:hover { color: #fff !important; }
    .b_dark #rebang-widget select,
    .b_dark #rebang-widget input {
        background-color: #444;
        color: #fff;
        border: 1px solid #555;
    }
    .b_dark #rebang-widget select option { background-color: #444; color: #fff; }
    .b_dark #rebang-body::-webkit-scrollbar-thumb { background-color: #555; }
    .b_dark #rebang-body::-webkit-scrollbar-thumb:hover { background-color: #777; }

    /* === 通用组件样式 === */
    #rebang-header {
        padding: 10px 15px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #eee;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    }
    #rebang-title { font-weight: bold; font-size: 14px; color: #0078d4; }
    #rebang-controls { display: flex; gap: 8px; }
    .rebang-btn-icon { cursor: pointer; font-size: 16px; line-height: 1; opacity: 0.6; }
    .rebang-btn-icon:hover { opacity: 1; }
    #rebang-body { padding: 12px; max-height: 520px; overflow-y: auto; display: block; scrollbar-width: thin; }
    #rebang-body.minimized { display: none; }
    .control-row { display: flex; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; font-size: 12px; }
    .form-select { padding: 2px 5px; border-radius: 4px; border: 1px solid #ccc; max-width: 100px; font-size: 12px; outline: none; }
    button.rebang-btn { background: #0078d4; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button.rebang-btn:hover { background: #006abc; }
    button.rebang-btn.stop { background: #d9534f; }
    #ext-keywords-list { margin-top: 10px; display: flex; flex-wrap: wrap; }
    .keyword-link { display: block; width: 100%; padding: 3px 0; text-decoration: none; color: #333; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .keyword-link:hover { color: #0078d4; background: rgba(0,0,0,0.03); }
    .keyword-link-current { font-weight: bold; color: #d9534f !important; }
    #ex-user-msg { font-size: 12px; color: #d9534f; margin-top: 5px; display: block; min-height: 18px; }
    .checkbox-wrapper { display: flex; align-items: center; gap: 4px; }
    input[type=checkbox] { accent-color: #0078d4; }
`);

this.$ = this.jQuery = jQuery.noConflict(true);

// ==========================================
// 工具函数与状态管理
// ==========================================

function getVal(key, defaultValue) { return GM_getValue(key, defaultValue); }
function setVal(key, value) { GM_setValue(key, value); }

const prefix = "Rebang_";
const autoSearchLockKey = `${prefix}AutoSearchLock`;
const maxNoGainLimitKey = `${prefix}MaxNoGainLimit`;
const autoSearchLockExpiresKey = `${prefix}AutoSearchLockExpires`;
const consecutiveNoGainKey = `${prefix}ConsecutiveNoGainCount`;
const lastPointsKey = `${prefix}LastPoints`;
const limitSearchCountKey = `${prefix}LimitSearchCount`;

const globalLockKey = `${prefix}GlobalLastRunTime`;
const globalMasterTabKey = `${prefix}GlobalMasterTabId`;
const globalMasterStatusKey = `${prefix}GlobalMasterStatus`;

let currentTabId = sessionStorage.getItem("Rebang_TabId");
if (!currentTabId) {
    currentTabId = Date.now() + "_" + Math.floor(Math.random() * 10000);
    sessionStorage.setItem("Rebang_TabId", currentTabId);
}

function syncTabStatus() {
    if (isWorkerTab()) return false;
    let now = Date.now();
    let lastRun = Number(getVal(globalLockKey, 0));
    let masterId = getVal(globalMasterTabKey, "");
    let masterStatus = getVal(globalMasterStatusKey, "IDLE");

    let mySwitchState = getVal(autoSearchLockKey, "off");
    let isMasterDead = (now - lastRun > 15000);
    let isMaster = false;

    if (masterId === currentTabId) {
        isMaster = true;
        setVal(globalLockKey, now);
        if (mySwitchState === "on") {
            setVal(globalMasterStatusKey, "RUNNING");
        } else {
            setVal(globalMasterStatusKey, "IDLE");
        }
    } else {
        if (masterId === "" || isMasterDead || masterStatus === "IDLE") {
            setVal(globalMasterTabKey, currentTabId);
            setVal(globalLockKey, now);
            setVal(globalMasterStatusKey, "RUNNING");
            setVal(autoSearchLockKey, "on");

            $("#ext-autosearch-lock").text("停止").addClass("stop");
            isMaster = true;
        } else {
            isMaster = false;
        }
    }

    if ($("#rebang-widget").length > 0) {
        $("#rebang-widget").show();
        if (isMaster) {
            $("#rebang-title").text("🔥 必应积分助手 (主控执行)");
            $("#rebang-widget").css("opacity", "1");
        } else {
            let statusText = isMasterDead ? "主控无响应" : (masterStatus === "RUNNING" ? "主控忙碌中" : "主控空闲");
            $("#rebang-title").text(`💤 等待接力 (${statusText})`);
            $("#rebang-widget").css("opacity", "0.7");
        }
    }
    return isMaster;
}

// ==========================================
// 后台 Worker 架构
// 主控页(用户当前页): 只渲染悬浮窗 + 调度决策，自身永不跳转
// Worker 页(后台标签): 承载实际搜索/任务页导航，上报积分，执行任务点击
// 两者通过 GM 存储的命令通道协作
// ==========================================
const WORKER_MARK = "__rbw=1";
const workerNavCmdKey = `${prefix}WorkerNavCommand`;      // { url, token }
const workerHandledTokenKey = `${prefix}WorkerHandledToken`;
const workerHeartbeatKey = `${prefix}WorkerHeartbeat`;
let workerWindowRef = null;

// 判定当前标签是否为后台 worker：URL 标记优先，sessionStorage 作为同源续命
// 兼容 __rbw / __rwb 两种字节序（历史版本曾写出 __rwb，地址栏里看到的即此）
function isWorkerTab() {
    if (sessionStorage.getItem("Rebang_IsWorker") === "1") return true;
    if (/[?&]__(?:rbw|rwb)=1(?:&|$)/.test(location.search)) {
        sessionStorage.setItem("Rebang_IsWorker", "1");
        return true;
    }
    return false;
}

function markWorkerUrl(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + WORKER_MARK;
}

// 主控确保后台 worker 存在（以心跳为准；主控刷新后本地引用会丢失，不能只看引用）
// force=true：忽略心跳强制新开（用于点“开始”时，确保一定有一个活跃 worker）
function ensureWorker(force) {
    if (!force) {
        const hb = Number(getVal(workerHeartbeatKey, 0));
        const aliveByHeartbeat = (Date.now() - hb < 30000); // 心跳30秒内才算存活
        if (aliveByHeartbeat) return true;
        if (workerWindowRef && !workerWindowRef.closed) return true;
    }
    // 必须用 /search 页启动：首页不匹配 @match，脚本不会注入 → 死标签
    const bootUrl = markWorkerUrl("https://www.bing.com/search?q=bing");
    try {
        if (typeof GM_openInTab === "function") {
            workerWindowRef = GM_openInTab(bootUrl, { active: false, setParent: true });
        } else {
            workerWindowRef = window.open(bootUrl, "_blank");
        }
        setVal(workerHeartbeatKey, Date.now());
        return true;
    } catch (e) {
        return false;
    }
}

// 下发导航命令：worker 轮询后自行跳转（绝对不动主控页）
function requestWorkerNavigate(url) {
    const cmd = { url: markWorkerUrl(url), token: Date.now() + "_" + Math.random().toString(36).slice(2) };
    setVal(workerNavCmdKey, JSON.stringify(cmd));
    // worker 自己调用时只发命令、由自身轮询执行，切勿再开新标签
    if (isWorkerTab()) return;
    if (!ensureWorker()) {
        // 极端情况：后台打开被拦截，退回普通窗口以保证功能可用
        window.open(cmd.url, "_blank");
    }
}

// 规范化 URL 用于导航比较：去掉 worker 标记，统一 www/cn 子域，避免 Bing 重定向造成"永远不等"
function normalizeNavUrl(url) {
    try {
        let u = new URL(url);
        let host = u.hostname.toLowerCase().replace(/^(www|cn)\./, ""); // www.bing.com / cn.bing.com → bing.com
        let params = new URLSearchParams(u.search);
        params.delete("__rbw"); params.delete("__rwb");                // 去掉 worker 标记
        return host + u.pathname + "?" + params.toString();
    } catch (e) { return String(url); }
}

// worker 页主循环：心跳 + 积分上报 + 轮询搜索导航命令
function startWorkerMode() {
    // 注意：绝不能在此清空 handled token！
    // 页面导航后脚本会重新注入，若清空 token，旧命令会被反复执行 → 无限刷新。
    // handled token 存在 GM 里跨导航保持，天然保证每条命令只执行一次。
    setInterval(function () {
        setVal(workerHeartbeatKey, Date.now());
        const _pts = getBingPoints();
        if (_pts !== null) setVal(sharedPointsKey, _pts);

        // 主控心跳丢失（主控页被关闭）→ 不再执行任何导航命令，彻底避免无限刷新
        let masterLast = Number(getVal(globalLockKey, 0));
        let masterAlive = (Date.now() - masterLast < 20000);
        if (!masterAlive) return;

        const raw = getVal(workerNavCmdKey, "");
        if (raw) {
            try {
                const cmd = JSON.parse(raw);
                const handled = getVal(workerHandledTokenKey, "");
                if (cmd.token && cmd.token !== handled && cmd.url) {
                    setVal(workerHandledTokenKey, cmd.token);
                    // 用规范化比较：目标页与当前页相同就不导航（防止重定向差异导致重复跳转）
                    if (normalizeNavUrl(location.href) !== normalizeNavUrl(cmd.url)) {
                        location.href = cmd.url;
                        return;
                    }
                }
            } catch (e) {}
        }
    }, 1000);
}

// 主控页读积分：搜索发生在 worker，故优先取 worker 上报的共享积分，兜底本地页
function getEffectivePoints() {
    const _shared = getVal(sharedPointsKey, null);
    if (_shared !== null && !isNaN(Number(_shared))) return Number(_shared);
    return getBingPoints();
}

const sharedPointsKey   = `${prefix}SharedPoints`;

const selectedChannelKey = `${prefix}SelectedChannel`;
const currentKeywordIndexKey = `${prefix}CurrentKeywordIndex`;
const channelListKey = `${prefix}Channels`;
const widgetPosKey = `${prefix}WidgetPosition`;
const widgetStateKey = `${prefix}WidgetState`;

// ==========================================
// NewsNow 热榜数据源（替代已失效的 api.pearktrue.cn）
// 单榜单接口: https://newsnow.busiyi.world/api/s?id=<sourceId>
// 说明: /c/hottest 是"最热"聚合页，内含多个 source，没有单一 API，
//       因此这里拆成"单个榜单"和一个 round-robin 合并的"🔥最热聚合"。
// 跨域: $.ajax 受同源策略限制，必须用油猴特权的 GM_xmlhttpRequest。
// ==========================================
const NEWSNOW_API = "https://newsnow.busiyi.world/api/s";
const NEWSNOW_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// 榜单显示名 -> newsnow source id（取自 newsnow 官方 sources.json 中 type=hottest 的源）
const NEWSNOW_CHANNELS = {
  "🔥最热聚合": "__hottest__",
  "微博": "weibo",
  "知乎": "zhihu",
  "百度热搜": "baidu",
  "抖音": "douyin",
  "哔哩哔哩": "bilibili-hot-search",
  "今日头条": "toutiao",
  "财联社": "cls-hot",
  "澎湃新闻": "thepaper",
  "虎扑": "hupu",
  "酷安": "coolapk",
  "豆瓣电影": "douban",
  "虫部落": "chongbuluo-hot",
  "雪球": "xueqiu-hotstock",
  "华尔街见闻": "wallstreetcn-hot",
  "稀土掘金": "juejin",
  "少数派": "sspai",
  "腾讯新闻": "tencent-hot",
  "Freebuf": "freebuf"
};
const NEWSNOW_CHANNEL_NAMES = Object.keys(NEWSNOW_CHANNELS);
const DEFAULT_CHANNEL = "🔥最热聚合";
// "最热聚合"混排使用的来源（对应 /c/hottest 页主力的中文热榜）
const NEWSNOW_HOTTEST_SOURCES = [
  "weibo", "zhihu", "baidu", "douyin", "bilibili-hot-search",
  "toutiao", "cls-hot", "thepaper", "hupu", "coolapk"
];

function getNewsnowSourceId(channelName) { return NEWSNOW_CHANNELS[channelName] || "weibo"; }

// 用 GM_xmlhttpRequest 跨域拉取单个 newsnow 榜单；成功回调 items 数组
function fetchNewsnow(sourceId, onSuccess, onError) {
  const url = `${NEWSNOW_API}?id=${encodeURIComponent(sourceId)}`;
  try {
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      timeout: 10000,
      headers: { "Accept": "application/json, text/plain, */*", "User-Agent": NEWSNOW_UA },
      onload: function (res) {
        if (res.status < 200 || res.status >= 300) { onError("HTTP " + res.status); return; }
        try {
          const data = JSON.parse(res.responseText);
          if (Array.isArray(data.items) && data.items.length > 0) onSuccess(data.items);
          else onError("榜单为空");
        } catch (e) { onError("解析失败"); }
      },
      onerror: function (e) { onError("网络错误 " + (e && e.error ? e.error : "")); },
      ontimeout: function () { onError("请求超时"); }
    });
  } catch (e) { onError("请求异常"); }
}

// 拉取一个榜单的全部关键词；channelName 可为单个榜单或"🔥最热聚合"
function fetchChannelItems(channelName, onSuccess, onError) {
  const sourceId = getNewsnowSourceId(channelName);
  if (sourceId !== "__hottest__") { fetchNewsnow(sourceId, onSuccess, onError); return; }

  // 聚合: 并行拉取多个源，round-robin 混排并按 title 去重，模拟 /c/hottest 的并列展示
  const sources = NEWSNOW_HOTTEST_SOURCES;
  const buckets = sources.map(function () { return []; });
  let remaining = sources.length;
  let gotAny = false;
  let delivered = false;

  function deliver() {
    if (delivered) return;
    delivered = true;
    if (!gotAny) { onError("聚合来源全部失败"); return; }
    const merged = [];
    const seen = Object.create(null);
    let maxLen = 0;
    buckets.forEach(function (b) { if (b.length > maxLen) maxLen = b.length; });
    for (let i = 0; i < maxLen; i++) {
      for (let j = 0; j < buckets.length; j++) {
        const it = buckets[j][i];
        if (!it) continue;
        const key = String(it.title || "").trim();
        if (!key || seen[key]) continue;
        seen[key] = 1;
        merged.push(it);
      }
    }
    onSuccess(merged);
  }

  const timer = setTimeout(deliver, 12000); // 兜底: 部分源失败也能出结果
  sources.forEach(function (sid, idx) {
    fetchNewsnow(sid, function (items) {
      if (delivered) return;
      gotAny = true;
      buckets[idx] = items;
      if (--remaining === 0) { clearTimeout(timer); deliver(); }
    }, function () {
      if (delivered) return;
      if (--remaining === 0) { clearTimeout(timer); deliver(); }
    });
  });
}

function getLocalDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getAutoSearchCountKey() { return `${prefix}AutoSearchCount_${getLocalDateStr()}`; }

function initAntiSleepProtection() {
    if ('wakeLock' in navigator) {
        try {
            navigator.wakeLock.request('screen').then(lock => {
                lock.addEventListener('release', () => {
                    initAntiSleepProtection();
                });
            }).catch(e => console.log("[Rebang] 唤醒锁获取受阻:", e));
        } catch (e) {}
    }
}

// 辅助解析函数：安全解析积分文本
function parsePointsText(text) {
    if (!text) return null;
    let clean = text.replace(/,/g, '');
    let match = clean.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

// 【搜索页面】专用逻辑
function getSearchPagePoints() {
    let $pointsEl = $(".points-container");
    if ($pointsEl.length > 0) return parsePointsText($pointsEl.first().text());

    let $sidebarPoints = $(".b_id_c .id_text");
    if ($sidebarPoints.length > 0) return parsePointsText($sidebarPoints.first().text());

    let $oldId = $("#id_rc");
    if ($oldId.length > 0) {
        let txt = $oldId.text().trim();
        if (txt && /\d/.test(txt)) return parsePointsText(txt);
    }
    return null;
}

function getBingPoints() {
    return getSearchPagePoints();
}

function stopAutoSearch(msg) {
    setVal(autoSearchLockKey, "off");
    $("#ext-autosearch-lock").text("开始").removeClass("stop");
    // 关闭后台 worker 并清心跳，避免标签累积；下次“开始”会强制开全新 worker
    try { if (workerWindowRef && !workerWindowRef.closed) workerWindowRef.close(); } catch (e) {}
    workerWindowRef = null;
    setVal(workerHeartbeatKey, 0);
    if(msg) showUserMessage(msg);
}

function checkAndRandomizeDailyChannel(channelList) {
    if (!channelList || channelList.length === 0) return;
    const todayStr = getLocalDateStr();
    const lastSelectDate = localStorage.getItem(`${prefix}LastAutoSelectDate`);

    if (lastSelectDate !== todayStr) {
        const randomIndex = Math.floor(Math.random() * channelList.length);
        const newChannel = channelList[randomIndex];
        localStorage.setItem(selectedChannelKey, newChannel);
        localStorage.setItem(currentKeywordIndexKey, 0);
        localStorage.setItem(`${prefix}LastAutoSelectDate`, todayStr);
        sessionStorage.removeItem(`${prefix}${newChannel}`);
        $("#ext-channels").val(newChannel);
        showUserMessage(`新的一天，已随机切换至: ${newChannel}`);
        initKeywords();
    }
}

// 切换到下一个榜单 (当前榜单搜完时)
function switchToNextChannel() {
    let channelList = JSON.parse(sessionStorage.getItem(channelListKey));
    let currentChannel = getCurrentChannel();

    if (channelList && channelList.length > 0) {
        let currentIndex = channelList.indexOf(currentChannel);
        let nextChannel;

        // 如果不是最后一个，顺延到下一个
        if (currentIndex !== -1 && currentIndex < channelList.length - 1) {
            nextChannel = channelList[currentIndex + 1];
            showUserMessage(`本榜单已搜完，切换至: ${nextChannel}...`);
        } else {
            // 【核心修改】所有榜单都搜完了，不再停止，而是随机选一个重新开始
            let randomIndex = Math.floor(Math.random() * channelList.length);
            nextChannel = channelList[randomIndex];
            showUserMessage(`全榜单轮询完毕，随机重置为: ${nextChannel}...`);
        }

        // 1. 更新内部状态
        localStorage.setItem(selectedChannelKey, nextChannel);
        localStorage.setItem(currentKeywordIndexKey, 0); // 进度归零，从第一个词重新开始
        sessionStorage.removeItem(`${prefix}${nextChannel}`); // 清除新榜单的旧缓存，强制拉取API最新数据

        // 2. 同步更新 UI 上的下拉框选项
        $("#ext-channels").val(nextChannel);

        // 3. 重新拉取词库并继续
        initKeywords();

        return;
    }

    // 只有在获取不到榜单列表（如网络彻底断开）这种极端情况下才停止
    stopAutoSearch("榜单列表为空或网络异常，无法切换。");
}

function truncateText(str, maxlength) { return str.length > maxlength ? str.slice(0, maxlength - 1) + "…" : str; }
function getCurrentChannelKeywordsCacheKey() { return `${prefix}${getCurrentChannel()}`; }
function getCurrentChannel() {
  let ch = localStorage.getItem(selectedChannelKey);
  return (ch && NEWSNOW_CHANNELS[ch] !== undefined) ? ch : DEFAULT_CHANNEL;
}
function showUserMessage(msg) { $("#ex-user-msg").text(msg); }

function doSearch(keyword) {
    const url = "https://www.bing.com/search?q=" + encodeURIComponent(keyword) + "&form=QBRE&sp=-1&lq=0";
    // 后台 worker 导航，不再弹出/聚焦新窗口，也不改变当前页
    requestWorkerNavigate(url);
}

// ==========================================
// Bing 搜索页
// ==========================================
function doAutoSearch() {
  let isMaster = syncTabStatus();
  let lastGlobalRun = Number(getVal(globalLockKey, 0));
  let nowTime = Date.now();
  const relayRetryKey = `${prefix}RelayRetryCount`;

  if (!isMaster) {
      console.log(`[Rebang] Slave tab standby. Waiting for Master.`);
      return;
  }

  let currentPoints = getEffectivePoints();
  if (currentPoints === null) {
      if (document.readyState === 'complete') { currentPoints = 0; }
      else { return; }
  }

  let jobLockExpires = getVal(autoSearchLockExpiresKey, "");
  let now = new Date();

  if (jobLockExpires) {
      let expireTime = new Date(jobLockExpires);
      if (expireTime > now) {
          let secondsLeft = Math.ceil((expireTime - now) / 1000);
          showUserMessage(`等待冷却 ${secondsLeft}s | 当前积分: ${currentPoints}`);
          return;
      }
  }

  let lastPoints = getVal(lastPointsKey, null);
  let currentSearchCount = Number(getVal(getAutoSearchCountKey(), 0));
  let isPointsIncreased = false;

  let maxNoGainLimit = Number(getVal(maxNoGainLimitKey, 10));
  let consecutiveNoGain = Number(getVal(consecutiveNoGainKey, 0));

  if (lastPoints !== null) {
      let lastP = Number(lastPoints);
      if (currentPoints > lastP) {
          currentSearchCount++;
          setVal(getAutoSearchCountKey(), currentSearchCount);
          isPointsIncreased = true;
          setVal(consecutiveNoGainKey, 0);
          setVal(relayRetryKey, 0);
      } else {
          consecutiveNoGain++;
          setVal(consecutiveNoGainKey, consecutiveNoGain);
          if (consecutiveNoGain >= maxNoGainLimit) {
              stopAutoSearch(`已连续 ${maxNoGainLimit} 次无积分，判定为今日达赫或IP限制，停止运行。`);
              return;
          }
      }
  }

  $("#ext-current-count").text(currentSearchCount);

  let limitSearchCount = Number(getVal(limitSearchCountKey, 50));
  if (currentSearchCount >= limitSearchCount) {
      setVal(lastPointsKey, null);
      setVal(globalMasterStatusKey, "IDLE");
      stopAutoSearch("今日积分任务已达标！");
      return;
  }

  setVal(globalLockKey, Date.now());
  setVal(globalMasterTabKey, currentTabId);

  let randomDelay = Math.floor(Math.random() * 6000) + 8000;
  let t = new Date();
  t.setSeconds(t.getSeconds() + randomDelay / 1000);
  setVal(autoSearchLockExpiresKey, t.toString());

  let currentKeywordIndex = Number(localStorage.getItem(currentKeywordIndexKey) ?? 0);
  var cacheKey = getCurrentChannelKeywordsCacheKey();
  var keywords = JSON.parse(sessionStorage.getItem(cacheKey));

  if (keywords && keywords.length > currentKeywordIndex) {
    setVal(lastPointsKey, currentPoints);

    currentKeywordIndex++;
    localStorage.setItem(currentKeywordIndexKey, currentKeywordIndex);

    let msg = isPointsIncreased ? `积分+${currentPoints - Number(lastPoints)}! ` : (lastPoints !== null ? `无分(${consecutiveNoGain}/${maxNoGainLimit}). ` : "");
    showUserMessage(`${msg}搜索: ${truncateText(keywords[currentKeywordIndex - 1].title, 15)}`);

    doSearch(keywords[currentKeywordIndex - 1].title);
  } else {
    if (!keywords) {
        initKeywords();
    } else {
        switchToNextChannel();
    }
  }
}

function initChannels(channels, selectedChannel) {
  $("#ext-channels").empty();
  if (!selectedChannel || NEWSNOW_CHANNELS[selectedChannel] === undefined) selectedChannel = DEFAULT_CHANNEL;
  channels?.forEach(function (element) {
    var opt = new Option(element, element);
    opt.selected = element == selectedChannel;
    $("#ext-channels").append(opt);
  });
  localStorage.setItem(selectedChannelKey, selectedChannel);
  initKeywords();
}

function initKeywords() {
  var cacheKey = getCurrentChannelKeywordsCacheKey();
  var keywords = sessionStorage.getItem(cacheKey);

  if (keywords) {
    try { renderKeywords(JSON.parse(keywords)); }
    catch (e) { sessionStorage.removeItem(cacheKey); fetchLatestKeywords(cacheKey); }
  } else {
    fetchLatestKeywords(cacheKey);
  }
}

// 从 NewsNow 拉取当前榜单并渲染；失败则 2 秒后自动切换下一榜单
function fetchLatestKeywords(cacheKey) {
  var channel = getCurrentChannel();
  showUserMessage(`正在加载榜单: ${channel}...`);
  fetchChannelItems(channel, function (items) {
    sessionStorage.setItem(cacheKey, JSON.stringify(items));
    renderKeywords(items);
    showUserMessage(`已加载「${channel}」${items.length} 条`);
  }, function (err) {
    showUserMessage(`获取「${channel}」失败(${err})，2秒后切换下一榜单...`);
    setTimeout(function() { switchToNextChannel(); }, 2000);
  });
}

function renderKeywords(keywords) {
  $("#ext-keywords-list").empty();
  let currentIndex = Number(localStorage.getItem(currentKeywordIndexKey) ?? 0);

  keywords.forEach(function (element, index) {
    let activeClass = (index + 1 === currentIndex) ? "keyword-link-current" : "";
    let linkHtml = "";
    if ($("#ext-keywords-linktype").val() == "搜索") {
        linkHtml = `<a target='_self' class='keyword-link keyword-link-search ${activeClass}' title='${element.title}' href='javascript:void();'>${index + 1}. ${truncateText(element.title, 20)}</a>`;
    } else {
        linkHtml = `<a target='_blank' class='keyword-link ${activeClass}' title='${element.title}' href='${element.url ?? element.mobileUrl}'>${index + 1}. ${truncateText(element.title, 20)}</a>`;
    }
    $("#ext-keywords-list").append(linkHtml);
  });
  $("#ext-keywords-list").append(`<a target='_blank' class='keyword-link' style='color:#0078d4;margin-top:5px;' href='https://rewards.bing.com/welcome?rh=4F42E699&ref=rafsrchae&form=ML2XE3&OCID=ML2XE3&PUBL=RewardsDO&CREA=ML2XE3'>👉 Rewards 赚积分 👈</a>`);
  $("#ext-keywords-list .keyword-link-search").click(function (e) { doSearch($(this).attr("title")); });
}

function restoreWidgetPosition() {
    const pos = JSON.parse(localStorage.getItem(widgetPosKey));
    if (pos) { $("#rebang-widget").css({ top: pos.top, left: pos.left, right: 'auto', bottom: 'auto' }); }
    else { $("#rebang-widget").css({ top: '100px', right: '20px' }); }

    const isMinimized = localStorage.getItem(widgetStateKey) === 'true';
    if (isMinimized) { $("#rebang-body").addClass("minimized"); $("#rebang-toggle-icon").text("+"); }
    else { $("#rebang-toggle-icon").text("−"); }
}

function makeDraggable(elementId, handleId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    const handle = document.getElementById(handleId);
    let isDragging = false, startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', function(e) {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect(); initialLeft = rect.left; initialTop = rect.top;
        el.style.right = 'auto'; document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        el.style.left = `${initialLeft + (e.clientX - startX)}px`;
        el.style.top = `${initialTop + (e.clientY - startY)}px`;
    });
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false; document.body.style.userSelect = '';
            const rect = el.getBoundingClientRect();
            localStorage.setItem(widgetPosKey, JSON.stringify({ top: rect.top + 'px', left: rect.left + 'px' }));
        }
    });
}

function initSearchControls() {
  if (window.top !== window.self) return;
  $("#rebang").remove(); $("#rebang-widget").remove();

  if ($("#rebang-widget").length == 0) {
    let savedMaxNoGain = getVal(maxNoGainLimitKey, "10");

    const widgetHtml = `
    <div id='rebang-widget'>
        <div id='rebang-header'>
            <span id='rebang-title'>🔥 必应积分助手</span>
            <div id='rebang-controls'><span id='rebang-toggle-icon' class='rebang-btn-icon' title='最小化/展开'>−</span></div>
        </div>
        <div id='rebang-body'>
            <div class='control-row'>
                <label>榜单:</label><select id='ext-channels' class='form-select'></select>
                <button id='ext-keywords-refresh' class='rebang-btn' type='button' title='刷新列表'>刷新</button>
            </div>
            <div class='control-row'>
                 <label>点击:</label>
                 <select id='ext-keywords-linktype' class='form-select'><option value='搜索' selected>搜索</option><option value='打开'>打开</option></select>
            </div>
            <div class='control-row'>
                <label>有效搜:</label>
                <span id='ext-current-count' style='font-weight:bold;margin:0 2px;color:#d9534f;'>0</span>/
                <input type='text' id='ext-autosearch-limit' style='width:35px;text-align:center;border:1px solid #ccc;border-radius:4px;' value='50'>
                <label>次</label>
                <button id='ext-autosearch-lock' class='rebang-btn' type='button' style='margin-left:auto;'>开始</button>
            </div>
            <div class='control-row'>
                 <label>失败停:</label>
                 <input type='number' id='ext-max-nogain' style='width:40px;text-align:center;border:1px solid #ccc;border-radius:4px;' value='${savedMaxNoGain}'>
                 <label>次无分后停止</label>
            </div>
            <label id='ex-user-msg'></label>
            <div id='ext-keywords-list'></div>
        </div>
    </div>`;

    $("body").append(widgetHtml);
    makeDraggable("rebang-widget", "rebang-header");
    restoreWidgetPosition();

    $("#rebang-toggle-icon").click(function() {
        const body = $("#rebang-body");
        if (body.hasClass("minimized")) { body.removeClass("minimized"); $(this).text("−"); localStorage.setItem(widgetStateKey, 'false'); }
        else { body.addClass("minimized"); $(this).text("+"); localStorage.setItem(widgetStateKey, 'true'); }
    });

    // 榜单列表内置于脚本（NewsNow 源映射），不再依赖第三方频道列表接口
    let channelList = sessionStorage.getItem(channelListKey);
    let listArr;
    if (channelList !== null) {
        try { listArr = JSON.parse(channelList); } catch (e) { listArr = null; }
    }
    if (!Array.isArray(listArr) || listArr.length === 0 || listArr.indexOf(DEFAULT_CHANNEL) === -1) {
        listArr = NEWSNOW_CHANNEL_NAMES.slice();
        sessionStorage.setItem(channelListKey, JSON.stringify(listArr));
    }
    initChannels(listArr, getCurrentChannel());
    checkAndRandomizeDailyChannel(listArr);
  }

  let currentSearchCount = Number(getVal(getAutoSearchCountKey(), 0));
  let limitSearchCount = Number(getVal(limitSearchCountKey, 50));

  $("#ext-current-count").text(currentSearchCount);
  $("#ext-autosearch-limit").val(limitSearchCount);

  if (currentSearchCount >= limitSearchCount) { setVal(autoSearchLockKey, "off"); }

  if (getVal(autoSearchLockKey, "off") == "on") { $("#ext-autosearch-lock").text("停止").addClass("stop"); }
  else { $("#ext-autosearch-lock").text("开始").removeClass("stop"); }

  $("#ext-channels").change(function (e) { localStorage.setItem(selectedChannelKey, $(this).val()); localStorage.setItem(currentKeywordIndexKey, 0); initKeywords(); });
  $("#ext-keywords-linktype").change(function (e) { initKeywords(); });
  $("#ext-autosearch-limit").change(function (e) { setVal(limitSearchCountKey, $(this).val()); });
  $("#ext-keywords-refresh").click(function (e) { sessionStorage.removeItem(getCurrentChannelKeywordsCacheKey()); initKeywords(); });

  $("#ext-max-nogain").change(function(e) { setVal(maxNoGainLimitKey, $(this).val()); });

  $("#ext-autosearch-lock").click(function (e) {
    if (getVal(autoSearchLockKey, "off") == "on") {
      stopAutoSearch("自动搜索已停止");
    } else {
        if (TEST_MODE === 1) {
            showUserMessage("测试模式: 强制重置状态...");
            setVal(getAutoSearchCountKey(), 0);
        }

        let limit = Number($("#ext-autosearch-limit").val());
        let current = Number(getVal(getAutoSearchCountKey(), 0));

        if (current >= limit) {
            showUserMessage("今日搜索任务已达标！");
            return;
        }

        setVal(autoSearchLockKey, "on");
        setVal(consecutiveNoGainKey, 0);

        // 点“开始”时强制创建全新的后台 worker，确保搜索命令有人执行
        setVal(workerHeartbeatKey, 0);
        setVal(workerHandledTokenKey, "");
        ensureWorker(true);

        setVal(globalMasterTabKey, currentTabId);
        setVal(globalLockKey, Date.now());

        $(this).text("停止").addClass("stop");
        showUserMessage("初始化中...");
        setVal(autoSearchLockExpiresKey, "");
        setVal(lastPointsKey, null);

        doAutoSearch();
    }
  });
}

// ==========================================
// 主入口
// ==========================================
(function () {
  "use strict";
  $(document).ready(function () {

    // ===== 后台 worker 标签：不渲染悬浮窗、不抢主控，只执行后台搜索导航 =====
    if (isWorkerTab()) {
        if (window.top === window.self) startWorkerMode();
        return;
    }

    initAntiSleepProtection();

    // ===== 主控标签（用户当前页）：只渲染悬浮窗 + 调度，自身永不跳转 =====
    // 搜索页主控循环
    if (window.top === window.self) {
        this.intervalId = this.intervalId || setInterval(function () {
            if ($("#rebang-widget").length == 0) { initSearchControls(); }

            syncTabStatus();

            // 跨天自动换榜（与定时启动无关，保留）
            let _cl = sessionStorage.getItem(channelListKey);
            if (_cl) {
                try { checkAndRandomizeDailyChannel(JSON.parse(_cl)); } catch (e) {}
            }

            if ($("#ext-autosearch-limit").val() && $("#ext-autosearch-limit").val().trim() != "" && getVal(autoSearchLockKey, "off") == "on") {
                doAutoSearch();
            }
        }, 1000);
    }
  });
})();
