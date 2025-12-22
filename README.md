# 微软 Bing 必应积分自动脚本使用指南

**版本:** 2025.12.22.10  
**适用浏览器:** Chrome, Edge, Firefox (需安装 Tampermonkey 扩展)

---

## ⚠️ 免责声明 (Disclaimer)

**请在下载和使用本脚本前仔细阅读以下条款：**

1.  **仅供学习交流**：本脚本编写的初衷仅为了验证浏览器自动化技术与前端页面交互逻辑，**严禁用于任何商业用途**或通过此脚本进行非法获利。
2.  **风险自负**：使用自动化工具刷取积分违反了 Microsoft Rewards 的服务条款 (ToS)。微软拥有先进的检测机制，**使用本脚本可能会导致您的积分被清零、兑换功能被封禁，甚至 Microsoft 账号被永久封禁。**
3.  **无担保**：作者不对脚本的稳定性、安全性或因使用脚本造成的任何损失（包括但不限于账号封禁、数据丢失）承担责任。
4.  **自主选择**：一旦您安装并启用了本脚本，即代表您完全知晓并愿意承担所有相关风险。

---

## 🛠️ 功能特性

本脚本（2025.12.22.10版）针对必应积分系统进行了深度优化，主要功能包括：

*   **智能搜索刷分**：
    *   自动获取今日热榜（微博等）关键词进行真实感搜索。
    *   每日自动随机切换榜单，避免单一行为模式。
    *   **智能积分检测**：实时监控积分变化，若连续搜索无积分增长，会自动停止或尝试换页，防止无效刷分。
*   **每日任务自动化**：
    *   自动识别并点击 Rewards 页面的每日任务卡片（测试、投票等）。
    *   支持任务去重和黑名单机制，跳过卡死的任务。
*   **防封与稳定性**：
    *   **随机延迟**：搜索间隔采用 8-14秒 随机延迟，模拟真人操作。
    *   **多标签页互斥**：防止在多个必应页面同时运行脚本导致冲突。
    *   **防死循环**：内置熔断机制，连续多次无收益自动停止。
*   **UI 与交互**：
    *   可拖拽的悬浮窗控制面板。
    *   适配系统及 Bing 网页的深色模式 (Dark Mode)。
*   **定时任务**：
    *   支持设置每日自动启动的小时和分钟。

---

## 🚀 安装指南

1.  **安装扩展程序**：
    *   确保您的浏览器（Edge 或 Chrome）已安装 **Tampermonkey (油猴)** 扩展。
2.  **新建脚本**：
    *   点击浏览器右上角的 Tampermonkey 图标，选择“添加新脚本”。
3.  **粘贴代码**：
    *   删除编辑器中默认生成的代码。
    *   复制本文档下方 **[附录：完整脚本代码]** 中的所有内容。
    *   粘贴到 Tampermonkey 编辑器中。
4.  **保存**：
    *   按下 `Ctrl + S` 保存，或点击编辑器菜单栏的“文件”->“保存”。
5.  **生效**：
    *   打开 [www.bing.com](https://www.bing.com) 即可看到脚本悬浮窗。

---

## 📖 使用说明

### 1. 悬浮窗界面介绍
脚本加载后，会在页面右上角显示一个悬浮窗（可拖拽位置），包含以下控制项：

*   **榜单**：选择搜索关键词的来源（如微博热搜、知乎等）。
*   **任务**：
    *   **开启** (Checkbox)：勾选后，点击“开始”时会优先跳转到 Rewards 页面完成点击任务，然后再回来搜索。
    *   **重试**：设置每日任务失败重试的次数。
*   **有效搜**：
    *   左侧数字：今日已完成的有效搜索次数。
    *   输入框：设置今日目标搜索次数（默认 50 次，也就是移动端+PC端的大致总和）。
*   **自动**：设置每天自动开始运行的时间（需保持浏览器开启）。
*   **失败停**：连续多少次搜索未增加积分后，自动停止脚本（防止账号被风控）。
*   **开始/停止按钮**：手动控制脚本运行。

### 2. 推荐运行流程
1.  打开 Bing 搜索首页。
2.  在悬浮窗中勾选 **“开启”** (任务)，以确保每日的点击奖励也能拿到。
3.  设置 **有效搜** 次数（建议：如果你有移动端模拟，可设为 PC(30) + Mobile(20) ≈ 50；如果仅PC，设为 30-35 即可）。
4.  点击 **“开始”**。
    *   脚本会自动跳转到 Rewards 页面做任务。
    *   任务完成后自动跳回搜索页开始刷关键词。
    *   达到指定次数后自动停止。

### 3. 常见问题 (FAQ)

*   **Q: 脚本显示“等待冷却”是什么意思？**
    *   A: 为了防止被微软判定为机器人，脚本在每次搜索后会强制等待 8~14 秒。请耐心等待，不要手动频繁刷新。
*   **Q: 为什么积分不涨了？**
    *   A: 可能是今日积分已达上限，或者是微软服务器延迟，也可能是您的账号进入了“冷却期”（15分钟内只能得几次分）。脚本检测到连续无分后会自动停止保护账号。
*   **Q: 如何最小化悬浮窗？**
    *   A: 点击悬浮窗标题栏右侧的 `−` 号即可折叠，点击 `+` 号展开。

---

## 🧩 附录：完整脚本代码

复制以下代码到 Tampermonkey 中：

```javascript
// ==UserScript==
// @name         微软Bing 必应积分自动脚本 (含每日任务-积分变化重试版-全功能修复)
// @version      2025.12.22.10
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
const TEST_MODE = 0;
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

    /* 自动部分深色适配 (Bing类名) */
    .b_dark .auto-row {
        background-color: #3a3a3a;
        border-color: #444;
    }

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
// 新增：多标签页互斥与协同逻辑常量
// ==========================================
const globalLockKey = `${prefix}GlobalLastRunTime`;   // 全局最后一次执行时间（所有标签页共享）
const globalMasterTabKey = `${prefix}GlobalMasterTabId`; // 当前主控标签页的ID
const currentTabId = Date.now() + "_" + Math.floor(Math.random() * 10000); // 当前页面的唯一ID

// ==========================================
// 新增：标签页状态同步函数
// ==========================================
// 用于判断当前标签页是否应该显示UI或执行任务
function syncTabStatus() {
    // 获取全局最后执行时间
    let lastRun = Number(getVal(globalLockKey, 0));
    let masterId = getVal(globalMasterTabKey, "");
    let now = Date.now();

    // 判定主控权逻辑：
    let isMaster = false;
    if (masterId === currentTabId) {
        isMaster = true;
    } else if (now - lastRun > 15000) {
        // 抢占主控权 (如果上次执行超过15秒，视为对方卡死)
        setVal(globalMasterTabKey, currentTabId);
        setVal(globalLockKey, now);
        isMaster = true;
        console.log(`[Rebang] tab ${currentTabId} took over master control.`);
    }

    // === 【核心修改点】 ===
    // 移除之前的 .hide() 逻辑，改为所有页面常驻显示
    if ($("#rebang-widget").length > 0) {
        $("#rebang-widget").show(); // 强制显示

        if (isMaster) {
            // 如果是主控页，正常显示
            $("#rebang-title").text("🔥 必应积分助手 (主控)");
            $("#rebang-widget").css("opacity", "1"); // 完全不透明
        } else {
            // 如果是副页面，也显示，但标题提示“待机”
            // 这样你就可以在任何页面修改设置了
            $("#rebang-title").text("💤 必应积分助手 (待机)");
            $("#rebang-widget").css("opacity", "0.85"); // 稍微透明一点点以示区分
        }

        // 移除强制同步最小化的逻辑，防止你在A页面展开，B页面突然把你关上的情况
        // 保留手动点击折叠即可
    }

    return isMaster;
}

// ==========================================
// 新增：新建标签页执行兜底逻辑
// ==========================================
function openNewWorkerTab() {
    // 只有在开启自动搜索且还没搜完时才触发
    if (getVal(autoSearchLockKey, "off") === "on") {
        showUserMessage("页面卡滞，开启新窗口接力...");

        // 1. 打开新标签页
        window.open("https://www.bing.com/search?q=Bing+Rewards+Relay&form=QBRE", "_blank");

        // 2. 【关键修改】不要调用 stopAutoSearch()！
        // 因为 stopAutoSearch 会把全局开关设为 off，导致新页面不运行。

        // 3. 可以在本地做一个视觉上的停止，或者直接关闭当前页（如果浏览器允许）
        $("#ext-autosearch-lock").text("已移交").addClass("stop");

        // 4. 可选：尝试关闭当前死循环的页面 (大部分浏览器会拦截脚本关闭非脚本打开的页面，但可以尝试)
        // window.close();

        // 5. 或者简单地跳转空白页，彻底结束当前页面的逻辑干扰
        // window.location.href = "about:blank";
    }
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
        setTimeout(() => { window.location.href = "https://www.bing.com/search?q=Bing+Rewards"; }, 2000);
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
    if (hasPending && targetLink && failCount > maxRetries) {
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

             if (failCount > maxRetries) {
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


  // 如果我不是主控，且上次全局执行在 8秒内 (正常搜索间隔是8-14秒)，则我保持静默
  if (!isMaster && (nowTime - lastGlobalRun < 8000)) {
      console.log(`[Rebang] Slave tab standby. Master running.`);
      return;
  }
  // -----------------------------------

  let enableDaily = getVal(enableDailyTasksKey, false);
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
              // 获取已尝试换页的次数
              let retryCount = Number(getVal(`${prefix}RelayRetryCount`, 0)); // 使用动态变量名或直接写死 key 字符串

              // 【修复逻辑】仅允许尝试换页 1 次
              if (retryCount < 1) {
                  console.log("[Rebang] 连续无分，尝试新建标签页激活...");

                  setVal(`${prefix}RelayRetryCount`, retryCount + 1); // 增加重试计数
                  setVal(consecutiveNoGainKey, 0); // 重要：归零无分计数，让新页面从0开始计算

                  openNewWorkerTab(); // 执行移交
                  return; // 退出当前页面的执行循环
              }
              // 如果已经换过一次页了，还是无分，说明是真没分了，停止。
              else {
                  setVal(`${prefix}RelayRetryCount`, 0); // 重置以便下次手动开始
                  stopAutoSearch(`已尝试换页但仍连续${maxNoGainLimit}次无积分，判定为今日达赫或IP限制。`);
                  return;
              }
          }
      }
  }

  $("#ext-current-count").text(currentSearchCount);

  // 每日搜索次数限制
  let limitSearchCount = Number(getVal(limitSearchCountKey, 50));
  if (currentSearchCount >= limitSearchCount) {
      setVal(lastPointsKey, null);
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
    else { $("#rebang-toggle-icon").text("−
