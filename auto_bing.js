// ==UserScript==
// @name         微软Bing 必应积分自动脚本 (含每日任务-积分变化重试版-全功能修复)
// @version      2025.12.24.1
// @description  必应 Bing 搜索添加今日热榜，悬浮窗模式，智能检测积分变化，自动换榜单，支持每日任务自动点击，延迟刷新确保任务完成，防死循环，重试逻辑改为基于积分变化。修复跨天不换榜问题。
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
const TEST_MODE = 1; // <--- 已为您修改为1，调试完毕后请记得手动改回0
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

        /* 自动部分深色适配 */
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

// GM_getValue / GM_setValue 封装
function getVal(key, defaultValue) { return GM_getValue(key, defaultValue); }
function setVal(key, value) { GM_setValue(key, value); }

// 常量定义
const prefix = "Rebang_";
const autoSearchLockKey = `${prefix}AutoSearchLock`; // 搜索开关锁
const enableDailyTasksKey = `${prefix}EnableDailyTasks`; // 是否启用每日任务
const maxNoGainLimitKey = `${prefix}MaxNoGainLimit`; // 连续无积分熔断阈值
const dailyTaskMaxRetriesKey = `${prefix}DailyTaskMaxRetries`; // 任务重试次数
const autoSearchLockExpiresKey = `${prefix}AutoSearchLockExpires`; // 搜索冷却时间
const consecutiveNoGainKey = `${prefix}ConsecutiveNoGainCount`; // 连续无积分计数
const lastPointsKey = `${prefix}LastPoints`; // 上次记录的积分
const autoStartHourKey = `${prefix}AutoStartHour`; // 自动开始小时
const autoStartMinKey = `${prefix}AutoStartMin`; // 自动开始分钟
const limitSearchCountKey = `${prefix}LimitSearchCount`; // 每日搜索限制

// ==========================================
// 多标签页互斥与协同逻辑常量
// ==========================================
const globalLockKey = `${prefix}GlobalLastRunTime`;   // 全局最后一次执行时间（所有标签页共享）
const globalMasterTabKey = `${prefix}GlobalMasterTabId`; // 当前主控标签页的ID
const globalMasterStatusKey = `${prefix}GlobalMasterStatus`; //主控运行状态标识: "RUNNING" 或 "IDLE"
// ==========================================
// 使用 sessionStorage 固定当前标签页 ID
// 这样即使搜索刷新页面，ID也不会变，主控权牢牢锁定在当前标签页
// ==========================================
let currentTabId = sessionStorage.getItem("Rebang_TabId");
if (!currentTabId) {
    currentTabId = Date.now() + "_" + Math.floor(Math.random() * 10000);
    sessionStorage.setItem("Rebang_TabId", currentTabId);
}



// ==========================================
// 标签页状态同步函数
// ==========================================
function syncTabStatus() {
    let now = Date.now();
    let lastRun = Number(getVal(globalLockKey, 0));
    let masterId = getVal(globalMasterTabKey, "");
    let masterStatus = getVal(globalMasterStatusKey, "IDLE");

    // 当前页面的搜索开关状态 ("on" 为正在跑, "off" 为停止/闲置)
    let mySwitchState = getVal(autoSearchLockKey, "off");

    // 判定主控是否“死掉” (超过15秒没更新心跳)
    let isMasterDead = (now - lastRun > 15000);

    let isMaster = false;

    // --- 场景 1: 我就是主控 ---
    if (masterId === currentTabId) {
        isMaster = true;
        // 更新心跳
        setVal(globalLockKey, now);

        // 【关键】: 把我当前的状态(忙碌还是闲置)广播出去
        if (mySwitchState === "on") {
            setVal(globalMasterStatusKey, "RUNNING");
        } else {
            // 我虽然是主控，但我没事做（搜完了或被手动停了），标记为 IDLE
            setVal(globalMasterStatusKey, "IDLE");
        }
    }
    // --- 场景 2: 别人是主控 ---
    else {
        // 核心抢夺逻辑：
        // 1. 主控死掉了 (isMasterDead) -> 抢
        // 2. 主控还活着，但是它处于闲置状态 (Status == IDLE) -> 抢
        if (masterId === "" || isMasterDead || masterStatus === "IDLE") {
            console.log(`[Rebang] 检测到主控空闲或失效 (Status:${masterStatus}, Dead:${isMasterDead})，正在接管...`);

            // 抢夺主控权
            setVal(globalMasterTabKey, currentTabId);
            setVal(globalLockKey, now);
            setVal(globalMasterStatusKey, "RUNNING"); // 先声明我在跑

            // 【自动启动】: 接管后，立即开启自己的搜索开关
            setVal(autoSearchLockKey, "on");

            // 立即刷新UI状态
            $("#ext-autosearch-lock").text("停止").addClass("stop");

            isMaster = true;
        } else {
            // 主控正在 RUNNING 且没死，我老实待机
            isMaster = false;
        }
    }

    // === UI 显示控制 ===
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

// 状态 Key (用于跨标签页通信)
const rewardsFailCountKey = `${prefix}RewardsFailCount`; // 积分页：连续未涨分计数
const rewardsLastPointsKey = `${prefix}RewardsLastPoints`; // 积分页：上次点击时的积分
const jumpFailCountKey = `${prefix}JumpFailCount`; // 搜索页：连续跳转无收益计数
const jumpLastPointsKey = `${prefix}JumpLastPoints`; // 搜索页：上次跳转时的积分
const rewardsClickTimeKey = `${prefix}RewardsClickTime`; // 任务点击时间戳

const selectedChannelKey = `${prefix}SelectedChannel`; // 当前选中的榜单
const currentKeywordIndexKey = `${prefix}CurrentKeywordIndex`; // 当前搜索到第几个词
const channelListKey = `${prefix}Channels`; // 榜单列表缓存
const widgetPosKey = `${prefix}WidgetPosition`; // 悬浮窗位置
const widgetStateKey = `${prefix}WidgetState`; // 悬浮窗折叠状态

// 动态 Key 生成函数
const getDailyTaskRedirectTimeKey = () => `${prefix}DailyTaskRedirectTime`;

// 【重要】获取本地日期字符串 (YYYY-MM-DD)
// 解决了原版使用 UTC 时间导致早上 0-8 点判定为昨天的 bug
function getLocalDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 每日动态 Key
function getAutoSearchCountKey() {
  return `${prefix}AutoSearchCount_${getLocalDateStr()}`;
}

function getAutoStartTriggeredKey() {
  return `${prefix}AutoStartTriggered_${getLocalDateStr()}`;
}

function getDailyTasksDoneKey() {
  return `${prefix}DailyTasksDone_${getLocalDateStr()}`;
}

// ==========================================
// 【新增优化】防休眠与死页自动复活模块
// 解决浏览器后台冻结页面导致定时任务失效的问题
// ==========================================
function initAntiSleepProtection() {
    console.log("[Rebang] 启动防休眠保护系统...");

    // 1. 申请屏幕唤醒锁 (降低被浏览器判定为闲置的概率)
    if ('wakeLock' in navigator) {
        try {
            navigator.wakeLock.request('screen').then(lock => {
                console.log("[Rebang] 屏幕唤醒锁已获取 (Screen WakeLock Active)");
                lock.addEventListener('release', () => {
                    console.log('[Rebang] 唤醒锁被释放，正在重新申请...');
                    initAntiSleepProtection(); // 递归重新申请
                });
            }).catch(e => console.log("[Rebang] 唤醒锁获取受阻:", e));
        } catch (e) {}
    }

    // 2. 强力心跳检测 (检测页面是否刚刚从“假死”中醒来)
    let lastHeartbeat = Date.now();
    const checkInterval = 2000; // 每2秒跳动一次
    const freezeThreshold = 15000; // 阈值：如果超过15秒没跳动，判定为曾被冻结

    setInterval(() => {
        const now = Date.now();
        const timeDiff = now - lastHeartbeat;

        // 检测是否发生过“时间跳跃”（即页面被挂起）
        if (timeDiff > freezeThreshold) {
            console.warn(`[Rebang] ⚠️ 检测到页面曾被冻结 ${timeDiff / 1000}秒！`);
            console.warn(`[Rebang] 正在执行“热重启”以恢复脚本活性...`);

            // 【关键优化】: 强制刷新页面。
            // 这解决了您提到的“需要重新打开才能加载”的问题。
            // 刷新后，脚本会重新初始化，checkAutoStart() 会再次检查时间并立即运行。
            window.location.reload();
        }

        // 3. 动态标题微扰 (防止Chrome强行休眠后台Tab)
        // 仅在脚本开启状态下执行，在标题后加个点或去掉，制造“活动”假象
        if (document.hidden && getVal(autoSearchLockKey, "off") === "on") {
             const title = document.title;
             if (title.endsWith(".")) document.title = title.slice(0, -1);
             else document.title = title + ".";
        }

        lastHeartbeat = now;
    }, checkInterval);
}

// ==========================================
// 核心逻辑：获取积分 (深度修复版)
// ==========================================

// 辅助解析函数：安全解析积分文本
function parsePointsText(text) {
    if (!text) return null;
    // 1. 去除逗号 (例如 "17,036" -> "17036")
    let clean = text.replace(/,/g, '');
    // 2. 提取第一组连续数字，忽略后续干扰字符
    // 这一步能防止如果有漏网之鱼拼接到一起，只取前面的部分
    let match = clean.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

// 【搜索页面】专用逻辑 (完全复刻脚本2)
function getSearchPagePoints() {
    // 优先级 1: 脚本2 验证最有效的选择器 (.points-container)
    let $pointsEl = $(".points-container");
    if ($pointsEl.length > 0) {
        // 必须使用 first() 防止多元素拼接
        return parsePointsText($pointsEl.first().text());
    }

    // 优先级 2: 移动端/侧边栏 (备用)
    let $sidebarPoints = $(".b_id_c .id_text");
    if ($sidebarPoints.length > 0) {
        return parsePointsText($sidebarPoints.first().text());
    }

    // 优先级 3: 旧版 ID (仅当确认为数字时返回)
    let $oldId = $("#id_rc");
    if ($oldId.length > 0) {
        let txt = $oldId.text().trim();
        if (txt && /\d/.test(txt)) return parsePointsText(txt);
    }

    return null;
}

// 【Rewards页面】专用逻辑 (针对你提供的 HTML 结构修复)
function getRewardsPagePoints() {
    // 优先级 1: 【精确匹配】用户提供的 HTML 结构 (#balanceToolTipDiv)
    // 结构: #balanceToolTipDiv -> .pointsValue -> span
    let $userTarget = $("#balanceToolTipDiv .pointsValue span");
    if ($userTarget.length > 0) {
        // 关键修复：使用 .first() 确保只获取第一个匹配项，防止数值超出
        return parsePointsText($userTarget.first().text());
    }

    // 优先级 2: 新版 Dashboard Header
    let $header = $("dashboard-header").find("span.title-m, span.headline-m, .mee-icon-text span");
    if ($header.length > 0) {
        return parsePointsText($header.first().text());
    }

    // 优先级 3: 动画计数器 (必须加 .first() !!!)
    // 之前的 bug 就是因为这里获取了页面所有计数器并拼接了
    let $anim = $("mee-rewards-counter-animation span");
    if ($anim.length > 0) {
        return parsePointsText($anim.first().text());
    }

    // 优先级 4: 余额卡片兜底
    let $balance = $("div[data-testid='balance-card'] h1, div[class*='balance'] span");
    if ($balance.length > 0) {
        return parsePointsText($balance.first().text());
    }

    return null;
}

// 主入口：严格分流，互不干扰
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

// 【关键逻辑】每天随机切换榜单并清理旧缓存
// 确保每天第一次运行时，或者挂机跨天时，自动换一个新榜单并获取最新数据
function checkAndRandomizeDailyChannel(channelList) {
    if (!channelList || channelList.length === 0) return;

    const todayStr = getLocalDateStr(); // 获取本地日期
    const lastSelectDate = localStorage.getItem(`${prefix}LastAutoSelectDate`);

    // 如果上次选择日期不是今天
    if (lastSelectDate !== todayStr) {
        console.log(`[Rebang] 检测到新的一天 (${todayStr})，正在随机选择榜单...`);

        // 随机选一个榜单
        const randomIndex = Math.floor(Math.random() * channelList.length);
        const newChannel = channelList[randomIndex];

        // 更新状态
        localStorage.setItem(selectedChannelKey, newChannel);
        localStorage.setItem(currentKeywordIndexKey, 0);
        localStorage.setItem(`${prefix}LastAutoSelectDate`, todayStr);

        // 强制清除 SessionStorage 中的旧缓存，迫使 initKeywords 重新请求最新数据
        sessionStorage.removeItem(`${prefix}${newChannel}`);

        // 更新 UI
        $("#ext-channels").val(newChannel);
        showUserMessage(`新的一天，已随机切换至: ${newChannel}`);

        // 重新初始化
        initKeywords();
    }
}

// 切换到下一个榜单 (当前榜单搜完时)
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
            sessionStorage.removeItem(`${prefix}${nextChannel}`); // 清除缓存以防万一
            setTimeout(() => { location.reload(); }, 1000);
            return;
        }
    }
    stopAutoSearch("所有榜单已完成或无法切换。");
}

function truncateText(str, maxlength) {
  return str.length > maxlength ? str.slice(0, maxlength - 1) + "…" : str;
}

function getCurrentChannelKeywordsCacheKey() {
  return `${prefix}${getCurrentChannel()}`;
}

function getCurrentChannel() {
  return localStorage.getItem(selectedChannelKey) ?? "微博";
}

function showUserMessage(msg) {
  $("#ex-user-msg").text(msg);
}

function doSearch(keyword) {
    // 1. 尝试使用脚本 2 的逻辑：模拟点击搜索按钮
    // 这样 Bing 会自动添加 &form=QBRE, &cvid=... 等关键参数
    let $input = $("#sb_form_q");
    let $btn = $("#sb_form_go"); // 桌面端常用 ID

    // 兼容性查找按钮
    if ($btn.length === 0) $btn = $("#sb_form_submit"); // 移动端或旧版
    if ($btn.length === 0) $btn = $(".search_icon, .b_searchboxSubmit"); // 通用类名

    if ($input.length > 0 && $btn.length > 0) {
        // 填入关键词
        $input.val(keyword);

        // 触发 React/Angular 等框架可能需要的 input 事件
        try {
            let evt = new Event('input', { bubbles: true });
            $input[0].dispatchEvent(evt);
            $input[0].value = keyword; //再一次确保赋值
        } catch(e) {}

        // 模拟点击
        $btn[0].click();
    }
    else {
        // 2. 兜底方案：如果找不到按钮，手动构建带参数的 URL
        // &form=QBRE 是 Bing 判断是否为“手动搜索”的核心参数
        window.location.href = "https://www.bing.com/search?q=" + encodeURIComponent(keyword) + "&form=QBRE&sp=-1&lq=0";
    }
}

// ==========================================
// 每日任务黑名单管理 (跳过卡住的任务)
// ==========================================
function getTaskBlacklistKey() {
    return `${prefix}TaskBlacklist_${getLocalDateStr()}`;
}

function getTaskBlacklist() {
    return JSON.parse(getVal(getTaskBlacklistKey(), "[]"));
}

function addTaskToBlacklist(url) {
    let list = getTaskBlacklist();
    if (url && !list.includes(url)) {
        list.push(url);
        setVal(getTaskBlacklistKey(), JSON.stringify(list));
    }
}

// ==========================================
// 页面逻辑：Rewards 任务页
// ==========================================
function handleRewardsPage() {
    let isLocked = getVal(autoSearchLockKey, "off");
    let currentPoints = getBingPoints();

    if (currentPoints !== null) {
        $("#ext-rewards-points").text(currentPoints);
        setVal(lastPointsKey, currentPoints);
    }

    // 如果脚本未开启，不执行任何操作
    if (isLocked !== "on") {
         showUserMessage("脚本未开启");
         return;
    }

    if (getVal(enableDailyTasksKey, false) !== true) {
        showUserMessage("未启用每日任务，返回...");
        return;
    }

    let $cardGroup = $("#more-activities");
    if ($cardGroup.length === 0) {
        showUserMessage("等待任务列表加载...");
        return;
    }

    // 检测是否处于点击后的冷却期
    let lastClickTime = Number(getVal(rewardsClickTimeKey, 0));
    let now = new Date().getTime();
    let waitDuration = 10000; // 每次点击后等待 10 秒验证

    if (now - lastClickTime < waitDuration) {
        let left = Math.ceil((waitDuration - (now - lastClickTime)) / 1000);
        showUserMessage(`等待验证... ${left}s`);

        if (left <= 1) {
             setVal(rewardsClickTimeKey, 0);
             showUserMessage("刷新状态...");
             location.reload();
        }
        return;
    }

    // 状态准备
    let rewardsLastPoints = Number(getVal(rewardsLastPointsKey, -1));
    let failCount = Number(getVal(rewardsFailCountKey, 0));
    let maxRetries = Number(getVal(dailyTaskMaxRetriesKey, 3));
    let blacklist = getTaskBlacklist();

    // 寻找未完成的任务
    let $cards = $("#more-activities mee-card");
    let hasPending = false;
    let targetLink = null;
    let targetName = "";
    let targetUrl = "";

    $cards.each(function() {
        if (targetLink) return;

        let $icon = $(this).find(".mee-icon-SkypeCircleCheck");

        if ($icon.length === 0) { // 没有绿色勾勾
            let $link = $(this).find("a");
            if ($link.length > 0) {
                let url = $link.attr("href");

                // 跳过黑名单
                if (blacklist.includes(url)) {
                    return;
                }

                hasPending = true;
                targetLink = $link;
                targetName = $link.text().trim() || "任务";
                targetUrl = url;
            }
        }
    });

    // 积分验证逻辑：如果积分涨了，重置失败计数
    if (rewardsLastPoints !== -1 && currentPoints !== null) {
        if (currentPoints > rewardsLastPoints) {
            if (failCount > 0) console.log(`[Rebang] Points increased! Reset fail count.`);
            failCount = 0;
            setVal(rewardsFailCountKey, 0);
        }
    }

    // 熔断逻辑：单任务失败次数过多
    if (hasPending && targetLink && failCount >= maxRetries) { 
        console.log(`[Rebang] Task limit (${failCount}) reached for: ${targetName}`);
        showUserMessage(`任务[${truncateText(targetName,6)}]多次无分，拉黑跳过...`);

        addTaskToBlacklist(targetUrl); // 加入黑名单
        setVal(rewardsFailCountKey, 0); // 重置计数
        setTimeout(() => { location.reload(); }, 1500); // 刷新页面
        return;
    }

    // 所有任务完成或被跳过
    if (!hasPending && $cards.length > 0) {
        console.log("[Rebang] Daily tasks done (or all skipped).");
        setVal(getDailyTasksDoneKey(), true);
        showUserMessage("任务完成(或已跳过卡住任务)！返回...");
        setTimeout(() => {
            window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Done";
        }, 1500);
        return;
    }

    // 执行点击
    if (hasPending && targetLink) {
        // 预判失败：如果不是第一次点击且积分没涨，先记一次失败
        if (rewardsLastPoints !== -1 && currentPoints !== null && currentPoints <= rewardsLastPoints) {
             failCount++;
             setVal(rewardsFailCountKey, failCount);

             if (failCount >= maxRetries) {
                 showUserMessage(`重试超限，准备跳过...`);
                 location.reload();
                 return;
             }
        } else if (currentPoints > rewardsLastPoints) {
            failCount = 0;
            setVal(rewardsFailCountKey, 0);
        }

        showUserMessage(`执行: ${truncateText(targetName, 8)} (失误:${failCount})`);

        if (currentPoints !== null) setVal(rewardsLastPointsKey, currentPoints);

        setVal(rewardsClickTimeKey, now);
        targetLink[0].click();
    }
}

// ==========================================
// Bing 搜索页
// ==========================================
function doAutoSearch() {
  // --- 多标签页互斥检查 (要求1 & 4) ---
  // 每次执行搜索前，先同步状态。如果不是主控页，且有其他页面刚跑过，则跳过本次执行。
  let isMaster = syncTabStatus();
  let lastGlobalRun = Number(getVal(globalLockKey, 0));
  let nowTime = Date.now();
  const relayRetryKey = `${prefix}RelayRetryCount`; // 换页重试计数

  // 【核心修复逻辑】
  // 原代码是: if (!isMaster && (nowTime - lastGlobalRun < 8000)) { ... }
  // 这意味着如果主控休息了9秒（但他还在正常等待中），副页面就会抢走执行权。
  // 修改后：只要 isMaster 为 false，说明 syncTabStatus 认为主控还活着（没超过20秒），
  // 那么我就绝对不动，老老实实待机，实现“固定主控”。
  if (!isMaster) {
      console.log(`[Rebang] Slave tab standby. Waiting for Master.`);
      return;
  }
  // -----------------------------------

  // 【修复关键】：优先读取 UI 复选框的实时状态，防止存储延迟导致读取为 false
  let enableDaily = $("#ext-enable-dailytasks").length > 0 
      ? $("#ext-enable-dailytasks").is(":checked") 
      : getVal(enableDailyTasksKey, false);

  let dailyDone = getVal(getDailyTasksDoneKey(), false);

  // 1. 每日任务跳转逻辑 (优先执行)
  if (enableDaily && !dailyDone) {
      let lastRedirect = Number(getVal(getDailyTaskRedirectTimeKey(), 0));
      // 任务页跳转冷却 (60秒)
      if (nowTime - lastRedirect < 60 * 1000) {
          let waitSec = Math.ceil((60000 - (nowTime - lastRedirect)) / 1000);
          showUserMessage(`等待任务页冷却... ${waitSec}s`);
          return;
      }

      // 抢占锁，防止其他页面同时也跳
      setVal(globalLockKey, nowTime);
      setVal(globalMasterTabKey, currentTabId);

      let currentPoints = getBingPoints();
      let jumpLastPoints = Number(getVal(jumpLastPointsKey, -1));
      let jumpFailCount = Number(getVal(jumpFailCountKey, 0));

      let uiMaxRetries = $("#ext-daily-retries").length ? Number($("#ext-daily-retries").val()) : -1;
      let maxRetries = uiMaxRetries >= 0 ? uiMaxRetries : Number(getVal(dailyTaskMaxRetriesKey, 3));

      // 验证上次跳转是否有收益
      if (jumpLastPoints !== -1 && currentPoints !== null) {
          if (currentPoints > jumpLastPoints) {
              jumpFailCount = 0;
              setVal(jumpFailCountKey, 0);
          } else {
              jumpFailCount++;
              setVal(jumpFailCountKey, jumpFailCount);
          }
      }

      // 跳转失败过多，放弃任务
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
          window.location.href = "https://rewards.bing.com/";
      }, 1000);
      return;
  }

  // 2. 搜索刷分主逻辑
  let currentPoints = getBingPoints();
  if (currentPoints === null) {
      if (document.readyState === 'complete') { currentPoints = 0; }
      else { return; }
  }

  // 搜索冷却时间检查 (基于本地时间，防止刷太快)
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

  // 积分对比
  if (lastPoints !== null) {
      let lastP = Number(lastPoints);
      if (currentPoints > lastP) {
          currentSearchCount++;
          setVal(getAutoSearchCountKey(), currentSearchCount);
          isPointsIncreased = true;
          setVal(consecutiveNoGainKey, 0);
          
          // 【修复】积分涨了，说明当前页面正常，重置“换页重试计数”
          setVal(relayRetryKey, 0);

          console.log(`[Rebang] Points increased: ${lastP} -> ${currentPoints}.`);
      } else {
          consecutiveNoGain++;
          setVal(consecutiveNoGainKey, consecutiveNoGain);

          // 连续无积分保护逻辑
          if (consecutiveNoGain >= maxNoGainLimit) {
              // 直接停止，不再尝试新建页面
              stopAutoSearch(`已连续 ${maxNoGainLimit} 次无积分，判定为今日达赫或IP限制，停止运行。`);
              return;
          }
      }
  }

  $("#ext-current-count").text(currentSearchCount);

  // 每日搜索次数限制
  let limitSearchCount = Number(getVal(limitSearchCountKey, 50));
  if (currentSearchCount >= limitSearchCount) {
      setVal(lastPointsKey, null);

      // 【新增】: 搜完了，先把全局状态设为 IDLE，让别的页面赶紧接手
      setVal(globalMasterStatusKey, "IDLE");

      stopAutoSearch("今日积分任务已达标！");
      return;
  }

  // --- 确认为有效搜索，更新全局锁 (核心) ---
  // 这会告诉其他标签页："我刚搜过，你们歇着"
  setVal(globalLockKey, Date.now());
  setVal(globalMasterTabKey, currentTabId);
  // -------------------------------------

  // 设置下次搜索的随机延迟 (8-14秒)
  let randomDelay = Math.floor(Math.random() * 6000) + 8000;
  let t = new Date();
  t.setSeconds(t.getSeconds() + randomDelay / 1000);
  setVal(autoSearchLockExpiresKey, t.toString());

  // 获取关键词并执行搜索
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
    // 如果没有关键词或搜完了
    if (!keywords) {
        initKeywords();
    } else {
        switchToNextChannel();
    }
  }
}

// 初始化榜单下拉框
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

// 初始化/获取关键词 (从 API)
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
      timeout: 0,
    }).done(function (response) {
      if (response.code == 200 && response.data) {
        keywords = response.data;
        sessionStorage.setItem(cacheKey, JSON.stringify(keywords));
        renderKeywords(keywords);
        showUserMessage("");
      } else {
        showUserMessage(`获取热榜失败，请重试。`);
      }
    });
  }
}

// 渲染关键词列表到悬浮窗
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

// 恢复悬浮窗位置
function restoreWidgetPosition() {
    const pos = JSON.parse(localStorage.getItem(widgetPosKey));
    if (pos) { $("#rebang-widget").css({ top: pos.top, left: pos.left, right: 'auto', bottom: 'auto' }); }
    else { $("#rebang-widget").css({ top: '100px', right: '20px' }); }

    const isMinimized = localStorage.getItem(widgetStateKey) === 'true';
    if (isMinimized) { $("#rebang-body").addClass("minimized"); $("#rebang-toggle-icon").text("+"); }
    else { $("#rebang-toggle-icon").text("−"); }
}

// 拖拽功能实现
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

// 定时检查是否需要自动开始 (优化版：包含跨天自动刷新)
function checkAutoStart() {
    // === 新增逻辑：跨天检测 ===
    // 如果当前日期不等于脚本加载时的日期，说明跨天了，强制刷新页面以唤醒脚本
    if (getLocalDateStr() !== SCRIPT_LOAD_DATE) {
        console.log("[Rebang] 检测到日期变更，执行跨天刷新...");
        location.reload();
        return;
    }
    // ========================

    // 1. 优先检查是否跨天（修复挂机不刷新页面导致不换榜的问题）
    let channelList = sessionStorage.getItem(channelListKey);
    if (channelList) {
        checkAndRandomizeDailyChannel(JSON.parse(channelList));
    }

    // 2. 检查定时启动逻辑
    let startHourStr = getVal(autoStartHourKey, "-1");
    let startMinStr = getVal(autoStartMinKey, "-1");

    let startHour = parseInt(startHourStr, 10);
    let startMin = parseInt(startMinStr, 10);

    if (isNaN(startHour) || isNaN(startMin) || startHour === -1 || startMin === -1) return;

    let triggeredKey = getAutoStartTriggeredKey();
    if (getVal(triggeredKey, "false") === "true") return;

    let now = new Date();

    // === 优化逻辑：防止浏览器休眠导致的错过时间 ===
    // 如果当前时间已经 超过了 设定时间（哪怕是几小时），只要今天还没跑过，就触发
    // 比如设定 8:00，电脑休眠到 9:30 才打开，脚本也会立即执行
    let isTimeReached = false;
    if (now.getHours() > startHour) {
        isTimeReached = true;
    } else if (now.getHours() === startHour && now.getMinutes() >= startMin) {
        isTimeReached = true;
    }

    if (isTimeReached) {
        let limit = Number($("#ext-autosearch-limit").val() ?? 50);
        let current = Number(getVal(getAutoSearchCountKey(), 0));

        // 如果还没开始搜，且还没达到今日上限 -> 自动点击开始
        if (getVal(autoSearchLockKey, "off") !== "on" && current < limit) {
             console.log(`[Rebang] Auto-start triggered. Time: ${now.toLocaleTimeString()}`);
             setVal(triggeredKey, "true");

             // 模拟点击开始
             $("#ext-autosearch-lock").click();
        } else if (current >= limit) {
             // 如果已经完成了，也标记为已触发，防止重复尝试
             setVal(triggeredKey, "true");
        }
    }
}

// 生成时间选择下拉框HTML
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

// ==========================================
// 初始化 UI：Rewards 页
// ==========================================
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
        setTimeout(() => {
        }, 1000);
    });
}

// ==========================================
// 初始化 UI：搜索页
// ==========================================
function initSearchControls() {
  if (window.top !== window.self) return; // 不在 iframe 中运行
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

            <!-- 关键修改点：移除了 style="background:..."，改用 class="auto-row" -->
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

    // 加载榜单列表
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

  // 页面加载时，如果在停止状态，强制重置部分计数器
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

  // 事件绑定
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

 // 点击“开始/停止”按钮
  $("#ext-autosearch-lock").click(function (e) {
    if (getVal(autoSearchLockKey, "off") == "on") {
      stopAutoSearch("自动搜索已停止");
    } else {
        // 保存设置
        if ($("#ext-daily-retries").length) setVal(dailyTaskMaxRetriesKey, $("#ext-daily-retries").val());

        // 【关键修复】: 在点击开始的一瞬间，强制读取UI上复选框的状态并写入存储
        // 防止出现"用户勾选了，但脚本读取到的是旧值"的情况
        if ($("#ext-enable-dailytasks").length) {
             let isChecked = $("#ext-enable-dailytasks").is(':checked');
             setVal(enableDailyTasksKey, isChecked);
        }

        // ▼▼▼【修改开始】▼▼▼

        // 统一的逻辑判断区
        if (TEST_MODE === 1) {
            // 1. 如果是测试模式，先强制重置所有相关状态
            showUserMessage("测试模式: 强制重置状态...");
            setVal(getDailyTasksDoneKey(), false);
            setVal(rewardsFailCountKey, 0);
            setVal(getDailyTaskRedirectTimeKey(), 0);
            setVal(jumpFailCountKey, 0);
            setVal(getAutoSearchCountKey(), 0);
            // 重置后，让逻辑继续向下走，进行统一的完成状态判断
        }

        // 2. 统一进行“是否完成”的判断 (无论何种模式)
        let limit = Number($("#ext-autosearch-limit").val());
        let current = Number(getVal(getAutoSearchCountKey(), 0));
        
        // 读取刚才强制同步过的状态
        let dailyEnabled = getVal(enableDailyTasksKey, false);
        let dailyDone = getVal(getDailyTasksDoneKey(), false);

        // 如果搜索次数达标，并且任务部分也无需再做，则停止
        if (current >= limit && (!dailyEnabled || dailyDone)) {
            showUserMessage("今日任务已全部完成！");
            return; // 阻止脚本启动
        }
        
        // ▲▲▲【修改结束】▲▲▲

        setVal(autoSearchLockKey, "on");
        setVal(consecutiveNoGainKey, 0);

        setVal(jumpFailCountKey, 0);
        setVal(jumpLastPointsKey, -1);
        setVal(rewardsFailCountKey, 0);

        setVal(globalMasterTabKey, currentTabId); // 强制设为当前页 ID
        setVal(globalLockKey, Date.now());        // 更新活跃时间

        $(this).text("停止").addClass("stop");
        showUserMessage("初始化中...");
        setVal(autoSearchLockExpiresKey, "");

        // 启动时将 lastPoints 设为 null，而不是当前分。
        // 这样第一次进入 doAutoSearch 时会跳过积分对比逻辑，避免"无分"误报。
        setVal(lastPointsKey, null);
        // ===================

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

    // >>>>>>>>>> 【在此处添加代码】 <<<<<<<<<<
    // 初始化防休眠保护机制 (无论在搜索页还是积分页都运行)
    initAntiSleepProtection();
    // >>>>>>>>>> 【添加结束】 <<<<<<<<<<

    // 1. 如果是 Rewards 页面
    if (location.hostname === "rewards.bing.com") {
        if ($("#rebang-widget").length == 0) initRewardsControls();
        setInterval(handleRewardsPage, 3000);
    }
    // 2. 如果是 搜索 页面
    else {
        if (window.top === window.self) {
          this.intervalId = this.intervalId || setInterval(function () {
              // 初始化悬浮窗
              if ($("#rebang-widget").length == 0) { initSearchControls(); }

              // --- 周期性同步状态 (要求4) ---
              syncTabStatus();

              // 检查自动启动 (包含跨天检查)
              checkAutoStart();

              // 如果开关开启，执行搜索循环
              if ($("#ext-autosearch-limit").val() && $("#ext-autosearch-limit").val().trim() != "" && getVal(autoSearchLockKey, "off") == "on") {
                 doAutoSearch();
              }
            }, 1000); // 1秒心跳
        }
    }
  });
})();
