// ==UserScript==
// @name         微软Bing 必应积分自动脚本
// @version      2026.03.02.1
// @description  必应 Bing 搜索添加今日热榜，悬浮窗模式，智能检测积分变化，自动换榜单，支持每日任务自动点击，延迟刷新确保任务完成，防死循环，重试逻辑改为基于积分变化。修复跨天不换榜问题。全面适配 2026 最新版 Rewards/Earn 页面。
// @author       8969
// @match        *://*.bing.com/search*
// @match        https://rewards.bing.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bing.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js#sha512-v2CJ7UaYy4JwqLDIrZUI/4hqeoQieOmAZNXBeQyjo21dadnwR+8ZaIJVT8EE2iyI61OV8e6M8PP2/4hpQINQ/g==
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gp
// @antifeature referral-link This script includes a refer link.
// @grant        unsafeWindow
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// 测试模式开关
// 1: 开启测试模式。点击“开始”时，强制重置今日所有状态（用于调试）。
// 0: 正常模式。智能判断是否已完成，完成后不再重复运行。
const TEST_MODE = 1; // <--- 调试完毕后请记得手动改回0
const SCRIPT_LOAD_DATE = getLocalDateStr(); // 记录脚本加载时的日期.

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

    /* === 自动设置行样式 (移除行内样式，改为Class控制) === */
    .auto-row {
        background: #f0f0f0;
        padding: 5px;
        border-radius: 4px;
        border: 1px solid transparent; /* 占位防止抖动 */
    }

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
        .auto-row { background-color: #3a3a3a; border-color: #444; }
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
    .time-select { width: 45px; text-align: center; }
    button.rebang-btn { background: #0078d4; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button.rebang-btn:hover { background: #006abc; }
    button.rebang-btn.stop { background: #d9534f; }
    button.rebang-btn.save { background: #107c10; margin-left: auto; }
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
const enableDailyTasksKey = `${prefix}EnableDailyTasks`; 
const maxNoGainLimitKey = `${prefix}MaxNoGainLimit`; 
const dailyTaskMaxRetriesKey = `${prefix}DailyTaskMaxRetries`; 
const autoSearchLockExpiresKey = `${prefix}AutoSearchLockExpires`; 
const consecutiveNoGainKey = `${prefix}ConsecutiveNoGainCount`; 
const lastPointsKey = `${prefix}LastPoints`; 
const autoStartHourKey = `${prefix}AutoStartHour`; 
const autoStartMinKey = `${prefix}AutoStartMin`; 
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

const rewardsFailCountKey = `${prefix}RewardsFailCount`; 
const rewardsLastPointsKey = `${prefix}RewardsLastPoints`; 
const jumpFailCountKey = `${prefix}JumpFailCount`; 
const jumpLastPointsKey = `${prefix}JumpLastPoints`; 
const rewardsClickTimeKey = `${prefix}RewardsClickTime`; 

const selectedChannelKey = `${prefix}SelectedChannel`; 
const currentKeywordIndexKey = `${prefix}CurrentKeywordIndex`; 
const channelListKey = `${prefix}Channels`; 
const widgetPosKey = `${prefix}WidgetPosition`; 
const widgetStateKey = `${prefix}WidgetState`; 

const getDailyTaskRedirectTimeKey = () => `${prefix}DailyTaskRedirectTime`;

function getLocalDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getAutoSearchCountKey() { return `${prefix}AutoSearchCount_${getLocalDateStr()}`; }
function getAutoStartTriggeredKey() { return `${prefix}AutoStartTriggered_${getLocalDateStr()}`; }
function getDailyTasksDoneKey() { return `${prefix}DailyTasksDone_${getLocalDateStr()}`; }

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

    let lastHeartbeat = Date.now();
    const checkInterval = 2000; 
    const freezeThreshold = 15000; 

    setInterval(() => {
        const now = Date.now();
        const timeDiff = now - lastHeartbeat;
        if (timeDiff > freezeThreshold) {
            window.location.reload();
        }
        if (document.hidden && getVal(autoSearchLockKey, "off") === "on") {
             const title = document.title;
             if (title.endsWith(".")) document.title = title.slice(0, -1);
             else document.title = title + ".";
        }
        lastHeartbeat = now;
    }, checkInterval);
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

// 【Rewards页面】专用逻辑 (适配 2026 新版 Earn 页面)
function getRewardsPagePoints() {
    // 优先级 0: 新版 Header (button[aria-label='查看个人资料'])
    let $newHeader = $("button[aria-label='查看个人资料'] p, button[aria-label='Profile'] p").first();
    if ($newHeader.length > 0) {
        let pts = parsePointsText($newHeader.text());
        if (pts !== null) return pts;
    }

    // 优先级 1: 旧版精确匹配 HTML 结构 (#balanceToolTipDiv)
    let $userTarget = $("#balanceToolTipDiv .pointsValue span");
    if ($userTarget.length > 0) return parsePointsText($userTarget.first().text());

    // 优先级 2: 旧版 Dashboard Header
    let $header = $("dashboard-header").find("span.title-m, span.headline-m, .mee-icon-text span");
    if ($header.length > 0) return parsePointsText($header.first().text());

    // 优先级 3: 动画计数器
    let $anim = $("mee-rewards-counter-animation span");
    if ($anim.length > 0) return parsePointsText($anim.first().text());

    // 优先级 4: 余额卡片兜底
    let $balance = $("div[data-testid='balance-card'] h1, div[class*='balance'] span");
    if ($balance.length > 0) return parsePointsText($balance.first().text());

    return null;
}

function getBingPoints() {
    if (window.location.hostname === "rewards.bing.com") {
        return getRewardsPagePoints();
    } else {
        return getSearchPagePoints();
    }
}

function stopAutoSearch(msg) {
    setVal(autoSearchLockKey, "off");
    $("#ext-autosearch-lock").text("开始").removeClass("stop");
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

function switchToNextChannel() {
    let channelList = JSON.parse(sessionStorage.getItem(channelListKey));
    let currentChannel = getCurrentChannel();
    if (channelList && channelList.length > 0) {
        let currentIndex = channelList.indexOf(currentChannel);
        if (currentIndex !== -1 && currentIndex < channelList.length - 1) {
            let nextChannel = channelList[currentIndex + 1];
            showUserMessage(`本榜单已搜完，切换至: ${nextChannel}...`);
            localStorage.setItem(selectedChannelKey, nextChannel);
            localStorage.setItem(currentKeywordIndexKey, 0);
            sessionStorage.removeItem(`${prefix}${nextChannel}`);
            $("#ext-channels").val(nextChannel);
            initKeywords();
            return;
        }
    }
    stopAutoSearch("所有榜单已完成或无法切换。");
}

function truncateText(str, maxlength) { return str.length > maxlength ? str.slice(0, maxlength - 1) + "…" : str; }
function getCurrentChannelKeywordsCacheKey() { return `${prefix}${getCurrentChannel()}`; }
function getCurrentChannel() { return localStorage.getItem(selectedChannelKey) ?? "微博"; }
function showUserMessage(msg) { $("#ex-user-msg").text(msg); }

function doSearch(keyword) {
    let $input = $("#sb_form_q");
    let $btn = $("#sb_form_go"); 
    if ($btn.length === 0) $btn = $("#sb_form_submit"); 
    if ($btn.length === 0) $btn = $(".search_icon, .b_searchboxSubmit"); 

    if ($input.length > 0 && $btn.length > 0) {
        $input.val(keyword);
        try {
            let evt = new Event('input', { bubbles: true });
            $input[0].dispatchEvent(evt);
            $input[0].value = keyword; 
        } catch(e) {}
        $btn[0].click();
    }
    else {
        window.location.href = "https://www.bing.com/search?q=" + encodeURIComponent(keyword) + "&form=QBRE&sp=-1&lq=0";
    }
}

function getTaskBlacklistKey() { return `${prefix}TaskBlacklist_${getLocalDateStr()}`; }
function getTaskBlacklist() { return JSON.parse(getVal(getTaskBlacklistKey(), "[]")); }

function addTaskToBlacklist(url) {
    let list = getTaskBlacklist();
    if (url && !list.includes(url)) {
        list.push(url);
        setVal(getTaskBlacklistKey(), JSON.stringify(list));
    }
}

// ==========================================
// 页面逻辑：Rewards 新版任务页 (Earn)
// ==========================================
function handleRewardsPage() {
    let isLocked = getVal(autoSearchLockKey, "off");
    let currentPoints = getBingPoints();

    if (currentPoints !== null) {
        $("#ext-rewards-points").text(currentPoints);
        setVal(lastPointsKey, currentPoints);
    }

    if (isLocked !== "on") { showUserMessage("脚本未开启"); return; }
    if (getVal(enableDailyTasksKey, false) !== true) { showUserMessage("未启用每日任务，返回..."); return; }

    let lastClickTime = Number(getVal(rewardsClickTimeKey, 0));
    let now = new Date().getTime();
    if (now - lastClickTime < 5000) {
        let left = Math.ceil((5000 - (now - lastClickTime)) / 1000);
        showUserMessage(`等待验证... ${left}s`);
        if (left <= 1) { setVal(rewardsClickTimeKey, 0); location.reload(); }
        return;
    }

    // 兼容新旧版任务组件选择器
    let taskSelectors =[
        "mee-card", 
        ".c-card-content", 
        "a[class*='CardRewards']", 
        "span[role='link'][href]",
        "a[role='link'][href]"
    ].join(", ");

    let $cards = $(taskSelectors);

    if ($cards.length === 0) { showUserMessage("未找到任务卡片或加载中..."); return; }

    let rewardsLastPoints = Number(getVal(rewardsLastPointsKey, -1));
    let failCount = Number(getVal(rewardsFailCountKey, 0));
    let maxRetries = Number(getVal(dailyTaskMaxRetriesKey, 3));
    let blacklist = getTaskBlacklist();

    let sessionClicked = JSON.parse(sessionStorage.getItem("Rebang_SessionClicked") || "[]");

    let targetLink = null;
    let targetName = "";
    let targetUrl = "";
    let hasPending = false;

    // 遍历任务卡片
    $cards.each(function(index) {
        if (targetLink) return;

        let $card = $(this);

        let url = $card.attr("href");
        let $childLink = null;
        if (!url) {
            $childLink = $card.find("a[href], span[role='link'][href]").first();
            if ($childLink.length > 0) {
                url = $childLink.attr("href");
            }
        }
        if (!url) return;

        // 补全相对路径
        let fullUrl = url;
        if (fullUrl.startsWith('/')) {
            fullUrl = window.location.origin + fullUrl;
        }

        let urlObj;
        try {
            urlObj = new URL(fullUrl);
        } catch(e) {
            return;
        }

        let pathname = urlObj.pathname.toLowerCase();
        let hostname = urlObj.hostname.toLowerCase();

        // 强力拦截：过滤导航菜单与无效的兑换/邀请链接
        if (pathname === '/earn' || 
            pathname === '/dashboard' || 
            pathname.startsWith('/redeem') || 
            pathname === '/about' || 
            pathname === '/refer' || 
            pathname === '/faq' ||
            pathname === '/welcome') {
            return;
        }

        if (pathname.includes('referandearn') || 
            hostname.includes('x.com') || 
            hostname.includes('twitter.com') || 
            (hostname.includes('microsoft.com') && pathname.includes('/edge')) ||
            hostname.includes('xbox.com') ) {
            return;
        }

        // [Check 1] 是否已完成
        let isCompleted = false;
        // 旧版打钩
        if ($card.find(".mee-icon-SkypeCircleCheck, .c-icon.check, i[class*='check']").length > 0) isCompleted = true;
        // 新版特定成功背景色
        if ($card.find(".bg-statusSuccessBg3").length > 0) isCompleted = true;
        if ($card.closest('.flex-row').find('.bg-statusSuccessBg3').length > 0) isCompleted = true;
        if (isCompleted) return;

        //[Check 2] 是否被锁定 (锁图标或不可用属性)
        if ($card.find(".locked-card").length > 0) return;
        if ($card.attr('aria-disabled') === 'true' || $card.attr('data-disabled') === 'true') return;
        if ($card.hasClass('cursor-not-allowed') || $card.hasClass('bg-neutralBgDisabled')) return;
        // 新版 SVG 锁图标识别
        if ($card.closest('.flex-row').find("path[d^='M5 3.5a3']").length > 0) return;

        let name = $card.text().replace(/\s+/g, ' ').trim().substring(0, 20) || ("任务" + index);

        // [Check 3] 协议过滤
        if (fullUrl.indexOf("http") !== 0) return;

        // [Check 4] 本次会话防重复
        if (sessionClicked.includes(fullUrl)) return;

        // [Check 5] 黑名单检查
        if (blacklist.includes(fullUrl)) {
            if (TEST_MODE === 1) {
                console.log(`[Rebang] 测试模式 - 强制重试黑名单任务: ${name}`);
            } else {
                return;
            }
        }

        hasPending = true;
        targetLink = $childLink ? $childLink : $card;
        targetName = name;
        targetUrl = fullUrl;
    });

    if (rewardsLastPoints !== -1 && currentPoints !== null) {
        if (currentPoints > rewardsLastPoints) {
            failCount = 0;
            setVal(rewardsFailCountKey, 0);
        }
    }

    if (hasPending && targetLink && failCount >= maxRetries) {
        showUserMessage(`任务[${truncateText(targetName,6)}]重试超限，拉黑...`);
        addTaskToBlacklist(targetUrl);
        setVal(rewardsFailCountKey, 0);
        setTimeout(() => { location.reload(); }, 1500);
        return;
    }

    // 全部完成
    if (!hasPending) {
        // 如果我们当前在多层级任务详情页内（如 /earn/quest/），完成后应当关闭页面，防止死循环
        if (window.location.pathname.includes('/earn/quest/')) {
            showUserMessage("当前详情页任务完毕！安全关闭子页面...");
            setTimeout(() => { window.close(); }, 1500);
            return;
        }

        setVal(getDailyTasksDoneKey(), true);
        sessionStorage.removeItem("Rebang_SessionClicked");
        setVal(lastPointsKey, null);

        showUserMessage("所有任务检测完毕！返回搜索...");
        setTimeout(() => {
             window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Done";
        }, 1500);
        return;
    }

    // 执行点击
    if (hasPending && targetLink) {
        if (rewardsLastPoints !== -1 && currentPoints !== null && currentPoints <= rewardsLastPoints) {
             failCount++;
             setVal(rewardsFailCountKey, failCount);
             if (failCount >= maxRetries) {
                 location.reload();
                 return;
             }
        } else if (currentPoints > rewardsLastPoints) {
            failCount = 0;
            setVal(rewardsFailCountKey, 0);
        }

        showUserMessage(`点击: ${truncateText(targetName, 12)}`);

        if (currentPoints !== null) setVal(rewardsLastPointsKey, currentPoints);
        setVal(rewardsClickTimeKey, now);

        sessionClicked.push(targetUrl);
        sessionStorage.setItem("Rebang_SessionClicked", JSON.stringify(sessionClicked));

        try {
            targetLink.attr('target', '_blank');
            targetLink[0].click();
            console.log(`[Rebang] Triggered click on: ${targetName}`);
        } catch (e) {
            console.error("[Rebang] 点击异常，尝试备用方案:", e);
            window.open(targetUrl, '_blank');
        }
    }
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

  let enableDaily = $("#ext-enable-dailytasks").length > 0
      ? $("#ext-enable-dailytasks").is(":checked")
      : getVal(enableDailyTasksKey, false);

  let dailyDone = getVal(getDailyTasksDoneKey(), false);

  if (enableDaily && !dailyDone) {
      let lastRedirect = Number(getVal(getDailyTaskRedirectTimeKey(), 0));
      if (nowTime - lastRedirect < 60 * 1000) {
          let waitSec = Math.ceil((60000 - (nowTime - lastRedirect)) / 1000);
          showUserMessage(`等待任务页冷却... ${waitSec}s`);
          return;
      }

      setVal(globalLockKey, nowTime);
      setVal(globalMasterTabKey, currentTabId);

      let currentPoints = getBingPoints();
      let jumpLastPoints = Number(getVal(jumpLastPointsKey, -1));
      let jumpFailCount = Number(getVal(jumpFailCountKey, 0));

      let uiMaxRetries = $("#ext-daily-retries").length ? Number($("#ext-daily-retries").val()) : -1;
      let maxRetries = uiMaxRetries >= 0 ? uiMaxRetries : Number(getVal(dailyTaskMaxRetriesKey, 3));

      if (jumpLastPoints !== -1 && currentPoints !== null) {
          if (currentPoints > jumpLastPoints) {
              jumpFailCount = 0;
              setVal(jumpFailCountKey, 0);
          } else {
              jumpFailCount++;
              setVal(jumpFailCountKey, jumpFailCount);
          }
      }

      if (jumpFailCount > maxRetries) {
          showUserMessage(`无分跳转(${jumpFailCount}次)超限，跳过`);
          setVal(getDailyTasksDoneKey(), true);
          return;
      }

      showUserMessage(`前往任务页 (无分次数:${jumpFailCount})...`);

      if (currentPoints !== null) setVal(jumpLastPointsKey, currentPoints);
      setVal(getDailyTaskRedirectTimeKey(), nowTime);
      setVal(rewardsClickTimeKey, 0);
      setVal(rewardsLastPointsKey, -1);
      setVal(rewardsFailCountKey, 0);

      setTimeout(() => {
          // 核心更新点：统一从旧版跳转至全新的任务中心 (/earn) 
          window.location.href = "https://rewards.bing.com/earn";
      }, 1000);
      return;
  }

  let currentPoints = getBingPoints();
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
  channels?.forEach(function (element) {
    var opt = new Option(element, element);
    opt.selected = element == selectedChannel;
    $("#ext-channels").append(opt);
  });
  if (localStorage.getItem(selectedChannelKey) == null) {
    localStorage.setItem(selectedChannelKey, "微博");
  }
  initKeywords();
}

function initKeywords() {
  var cacheKey = getCurrentChannelKeywordsCacheKey();
  var keywords = sessionStorage.getItem(cacheKey);

  if (keywords) {
    renderKeywords(JSON.parse(keywords));
  } else {
    showUserMessage("正在加载榜单...");
    $.ajax({
      url: "https://api.pearktrue.cn/api/dailyhot/?title=" + getCurrentChannel(),
      method: "GET",
      timeout: 5000, 
    }).done(function (response) {
      if (response.code == 200 && response.data) {
        keywords = response.data;
        sessionStorage.setItem(cacheKey, JSON.stringify(keywords));
        renderKeywords(keywords);
        showUserMessage("");
      } else {
        showUserMessage(`获取失败，2秒后自动切换下一榜单...`);
        setTimeout(function() { switchToNextChannel(); }, 2000);
      }
    }).fail(function () {
      showUserMessage(`网络错误，2秒后自动切换下一榜单...`);
      setTimeout(function() { switchToNextChannel(); }, 2000);
    });
  }
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

function checkAutoStart() {
    if (getLocalDateStr() !== SCRIPT_LOAD_DATE) {
        location.reload();
        return;
    }

    let channelList = sessionStorage.getItem(channelListKey);
    if (channelList) {
        checkAndRandomizeDailyChannel(JSON.parse(channelList));
    }

    let startHourStr = getVal(autoStartHourKey, "-1");
    let startMinStr = getVal(autoStartMinKey, "-1");

    let startHour = parseInt(startHourStr, 10);
    let startMin = parseInt(startMinStr, 10);

    if (isNaN(startHour) || isNaN(startMin) || startHour === -1 || startMin === -1) return;

    let triggeredKey = getAutoStartTriggeredKey();
    if (getVal(triggeredKey, "false") === "true") return;

    let now = new Date();
    let isTimeReached = false;
    if (now.getHours() > startHour) {
        isTimeReached = true;
    } else if (now.getHours() === startHour && now.getMinutes() >= startMin) {
        isTimeReached = true;
    }

    if (isTimeReached) {
        let limit = Number($("#ext-autosearch-limit").val() ?? 50);
        let current = Number(getVal(getAutoSearchCountKey(), 0));

        if (getVal(autoSearchLockKey, "off") !== "on" && current < limit) {
             setVal(triggeredKey, "true");
             $("#ext-autosearch-lock").click();
        } else if (current >= limit) {
             setVal(triggeredKey, "true");
        }
    }
}

function getHourOptionsHtml(selected) {
    let html = "<option value='-1'>--</option>";
    for(let i=0; i<24; i++) {
        let val = i.toString();
        html += `<option value='${val}' ${val == selected ? 'selected' : ''}>${i}</option>`;
    }
    return html;
}

function getMinOptionsHtml(selected) {
    let html = "<option value='-1'>--</option>";
    for(let i=0; i<60; i++) {
        let val = i.toString();
        let label = i < 10 ? '0' + i : i;
        html += `<option value='${val}' ${val == selected ? 'selected' : ''}>${label}</option>`;
    }
    return html;
}

function initRewardsControls() {
    if ($("#rebang-widget").length > 0) return;

    const widgetHtml = `
    <div id='rebang-widget'>
        <div id='rebang-header'>
            <span id='rebang-title'>🤖 每日任务执行中...</span>
            <div id='rebang-controls'><span id='rebang-toggle-icon' class='rebang-btn-icon'>−</span></div>
        </div>
        <div id='rebang-body'>
            <div class='control-row' style='justify-content:center;'>
                <label style='font-size:12px;'>当前积分: <span id='ext-rewards-points' style='color:#d9534f; font-weight:bold;'>--</span></label>
            </div>
            <div class='control-row' style='justify-content:center;'>
                <label id='ex-user-msg' style='font-size:12px; color:#0078d4;'>正在检测任务...</label>
            </div>
            <div class='control-row' style='margin-top:10px; justify-content:center;'>
                <button id='ext-stop-rewards' class='rebang-btn stop' type='button' style='width:100%;'>停止并返回搜索</button>
            </div>
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

    $("#ext-stop-rewards").click(function() {
        setVal(autoSearchLockKey, "off");
        showUserMessage("已停止，即将返回...");
        setTimeout(() => {
            window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Stopped";
        }, 1000);
    });
}

function initSearchControls() {
  if (window.top !== window.self) return; 
  $("#rebang").remove(); $("#rebang-widget").remove();

  if ($("#rebang-widget").length == 0) {
    let savedHour = getVal(autoStartHourKey, "-1");
    let savedMin = getVal(autoStartMinKey, "-1");
    let savedMaxNoGain = getVal(maxNoGainLimitKey, "10");
    let savedDailyRetries = getVal(dailyTaskMaxRetriesKey, "3");
    let enableDailyTasks = getVal(enableDailyTasksKey, false);

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
                 <label>任务:</label>
                 <div class='checkbox-wrapper' title='勾选后，开始时会先去Rewards页面完成每日任务'>
                    <input type='checkbox' id='ext-enable-dailytasks' ${enableDailyTasks ? 'checked' : ''}>
                    <label for='ext-enable-dailytasks' style='cursor:pointer;'>开启</label>
                 </div>
                 <label style="margin-left:5px">重试:</label>
                 <input type='number' id='ext-daily-retries' style='width:35px;text-align:center;border:1px solid #ccc;border-radius:4px;' value='${savedDailyRetries}'>
                 <label>次</label>
            </div>
            <div class='control-row'>
                <label>有效搜:</label>
                <span id='ext-current-count' style='font-weight:bold;margin:0 2px;color:#d9534f;'>0</span>/
                <input type='text' id='ext-autosearch-limit' style='width:35px;text-align:center;border:1px solid #ccc;border-radius:4px;' value='50'>
                <label>次</label>
                <button id='ext-autosearch-lock' class='rebang-btn' type='button' style='margin-left:auto;'>开始</button>
            </div>
            <div class='control-row auto-row'>
                 <label>自动:</label>
                 <select id='ext-autostart-hour' class='form-select time-select'>${getHourOptionsHtml(savedHour)}</select>
                 <label>:</label>
                 <select id='ext-autostart-min' class='form-select time-select'>${getMinOptionsHtml(savedMin)}</select>
                 <button id='ext-save-autostart' class='rebang-btn save' type='button'>设置</button>
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

    let channelList = sessionStorage.getItem(channelListKey);
    if (channelList !== null) {
        let listArr = JSON.parse(channelList);
        initChannels(listArr, getCurrentChannel());
        checkAndRandomizeDailyChannel(listArr);
    }
    else {
      $.ajax({ url: "https://api.pearktrue.cn/api/dailyhot", method: "GET", timeout: 0 }).done(function (response) {
        if (response.code == 200 && response.data && response.data.platforms) {
          sessionStorage.setItem(channelListKey, JSON.stringify(response.data.platforms));
          initChannels(response.data.platforms, getCurrentChannel());
          checkAndRandomizeDailyChannel(response.data.platforms);
        } else { showUserMessage(`获取热榜频道失败。`); }
      });
    }
  }

  if (getVal(autoSearchLockKey, "off") == "off") {
      setVal(jumpFailCountKey, 0);
      setVal(rewardsFailCountKey, 0);
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
  $("#ext-enable-dailytasks").change(function(e) { setVal(enableDailyTasksKey, $(this).is(':checked')); });
  $("#ext-daily-retries").change(function(e) { setVal(dailyTaskMaxRetriesKey, $(this).val()); });

  $("#ext-save-autostart").click(function(e) {
      let h = $("#ext-autostart-hour").val();
      let m = $("#ext-autostart-min").val();
      setVal(autoStartHourKey, h);
      setVal(autoStartMinKey, m);
      setVal(getAutoStartTriggeredKey(), "false");

      if(h === "-1" || m === "-1") {
          showUserMessage("已关闭自动启动");
      } else {
          showUserMessage(`已设置: 每天 ${h}:${m < 10 && m !== "-1" ? '0'+m : m} 后自动执行`);
      }
  });

  $("#ext-autosearch-lock").click(function (e) {
    if (getVal(autoSearchLockKey, "off") == "on") {
      stopAutoSearch("自动搜索已停止");
    } else {
        if ($("#ext-daily-retries").length) setVal(dailyTaskMaxRetriesKey, $("#ext-daily-retries").val());

        if ($("#ext-enable-dailytasks").length) {
             let isChecked = $("#ext-enable-dailytasks").is(':checked');
             setVal(enableDailyTasksKey, isChecked);
        }

        if (TEST_MODE === 1) {
            showUserMessage("测试模式: 强制重置状态...");
            setVal(getDailyTasksDoneKey(), false);
            setVal(rewardsFailCountKey, 0);
            setVal(getDailyTaskRedirectTimeKey(), 0);
            setVal(jumpFailCountKey, 0);
            setVal(getAutoSearchCountKey(), 0);
        }

        let limit = Number($("#ext-autosearch-limit").val());
        let current = Number(getVal(getAutoSearchCountKey(), 0));

        let dailyEnabled = getVal(enableDailyTasksKey, false);
        let dailyDone = getVal(getDailyTasksDoneKey(), false);

        if (current >= limit && (!dailyEnabled || dailyDone)) {
            showUserMessage("今日任务已全部完成！");
            return; 
        }

        setVal(autoSearchLockKey, "on");
        setVal(consecutiveNoGainKey, 0);
        setVal(jumpFailCountKey, 0);
        setVal(jumpLastPointsKey, -1);
        setVal(rewardsFailCountKey, 0);

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

    initAntiSleepProtection();

    // 1. 如果在 Rewards 页面 (新版为 /earn 或子任务页)
    if (location.hostname === "rewards.bing.com") {
        if ($("#rebang-widget").length == 0) initRewardsControls();
        setInterval(handleRewardsPage, 3000);
    }
    // 2. 如果在 搜索 页面
    else {
        if (window.top === window.self) {
          this.intervalId = this.intervalId || setInterval(function () {
              if ($("#rebang-widget").length == 0) { initSearchControls(); }
              syncTabStatus();
              checkAutoStart();

              if ($("#ext-autosearch-limit").val() && $("#ext-autosearch-limit").val().trim() != "" && getVal(autoSearchLockKey, "off") == "on") {
                 doAutoSearch();
              }
            }, 1000); 
        }
    }
  });
})();
