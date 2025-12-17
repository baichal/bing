// ==UserScript==
// @name         微软Bing 必应积分自动脚本 (积分检测版)
// @version      2025.12.03.06
// @description  必应 Bing 搜索添加今日热榜，悬浮窗模式，智能检测积分变化，积分未涨不计次数，自动换榜单
// @author       8969
// @match        *://*.bing.com/search*
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
    }
    @media (prefers-color-scheme: dark) {
        #rebang-widget {
            background-color: #2b2b2b;
            border-color: #444;
            color: #eee;
        }
        #rebang-header {
            background-color: #3a3a3a !important;
            border-bottom-color: #444 !important;
        }
        .keyword-link {
            color: #bbb !important;
        }
        .keyword-link:hover {
            color: #fff !important;
        }
        select, input {
            background-color: #444;
            color: #fff;
            border: 1px solid #555;
        }
    }
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
    #rebang-body { padding: 12px; max-height: 400px; overflow-y: auto; display: block; }
    #rebang-body.minimized { display: none; }
    .control-row { display: flex; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; font-size: 12px; }
    .form-select { padding: 2px 5px; border-radius: 4px; border: 1px solid #ccc; max-width: 100px; font-size: 12px; }
    button.rebang-btn { background: #0078d4; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    button.rebang-btn:hover { background: #006abc; }
    button.rebang-btn.stop { background: #d9534f; }
    #ext-keywords-list { margin-top: 10px; display: flex; flex-wrap: wrap; }
    .keyword-link { display: block; width: 100%; padding: 3px 0; text-decoration: none; color: #333; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .keyword-link:hover { color: #0078d4; background: rgba(0,0,0,0.03); }
    .keyword-link-current { font-weight: bold; color: #d9534f !important; }
    #ex-user-msg { font-size: 12px; color: #d9534f; margin-top: 5px; display: block; min-height: 18px; }
`);

this.$ = this.jQuery = jQuery.noConflict(true);
const prefix = "Rebang_";
const selectedChannelKey = `${prefix}SelectedChannel`;
const limitSearchCountKey = `${prefix}LimitSearchCount`;
const currentKeywordIndexKey = `${prefix}CurrentKeywordIndex`;
const channelListKey = `${prefix}Channels`;
const autoSearchLockKey = `${prefix}AutoSearchLock`;
const autoSearchLockExpiresKey = `${prefix}AutoSearchLockExpires`;
const widgetPosKey = `${prefix}WidgetPosition`;
const widgetStateKey = `${prefix}WidgetState`;
const lastPointsKey = `${prefix}LastPoints`; // 记录上次搜索前的积分

function getAutoSearchCountKey() {
  return `${prefix}AutoSearchCount_${new Date().toISOString().split("T")[0]}`;
}

// === 核心逻辑：获取当前积分 ===
function getBingPoints() {
    // 适配用户提供的HTML结构: <span class="points-container">16395</span>
    let $pointsEl = $(".points-container");
    if ($pointsEl.length > 0) {
        let text = $pointsEl.text().trim();
        // 去除逗号 (例如 16,395 -> 16395)
        let points = parseInt(text.replace(/,/g, ''), 10);
        if (!isNaN(points)) {
            return points;
        }
    }
    return null; // 未找到或解析失败
}

function stopAutoSearch(msg) {
    localStorage.setItem(autoSearchLockKey, "off");
    $("#ext-autosearch-lock").text("开始").removeClass("stop");
    if(msg) showUserMessage(msg);
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
  $("#sb_form_q").val(keyword);
  $("#sb_form_go").click();
}

function doAutoSearch() {
  // 1. 等待积分元素加载 (防止页面刚开还没有积分)
  let currentPoints = getBingPoints();
  if (currentPoints === null) {
      // 尝试等待，如果页面加载太久还没积分可能是未登录，暂不阻塞，视为0
      if (document.readyState === 'complete') {
          currentPoints = 0; 
      } else {
          return; // 继续等待 DOM
      }
  }

  // 2. 检查时间锁
  let jobLockExpires = localStorage.getItem(autoSearchLockExpiresKey) ?? "";
  let now = new Date();
  
  if (jobLockExpires.length > 0) {
      let expireTime = new Date(jobLockExpires);
      if (expireTime > now) {
          let secondsLeft = Math.ceil((expireTime - now) / 1000);
          showUserMessage(`等待冷却 ${secondsLeft}s | 当前积分: ${currentPoints}`);
          return;
      }
  }

  // === 积分检测与计数逻辑 ===
  // 此时冷却已结束，准备进行下一次搜索。我们利用这个时机结算"上一次"搜索的结果。
  // 我们比较：CurrentPoints(现在) vs LastPoints(上次搜索前保存的值)
  
  let lastPoints = localStorage.getItem(lastPointsKey);
  let currentSearchCount = Number(localStorage.getItem(getAutoSearchCountKey()) ?? 0); // 注意：默认为0
  let isPointsIncreased = false;

  // 如果有记录上次的积分，进行比对
  if (lastPoints !== null) {
      let lastP = Number(lastPoints);
      if (currentPoints > lastP) {
          // 积分涨了！计入有效搜索
          currentSearchCount++;
          localStorage.setItem(getAutoSearchCountKey(), currentSearchCount);
          isPointsIncreased = true;
          console.log(`[Rebang] Points increased: ${lastP} -> ${currentPoints}. Count: ${currentSearchCount}`);
      } else {
          // 积分没涨（可能达到上限，或者网络问题），不计入次数
          console.log(`[Rebang] Points unchanged: ${currentPoints}. Not counting.`);
      }
  } else {
      // 第一次运行或被重置，无法比较，暂不增加计数，只初始化
      // 或者：如果是第一次启动脚本，我们可以不计数，直接开始搜第一个词
  }
  
  $("#ext-current-count").text(currentSearchCount);

  // 3. 检查是否达到目标限制
  let limitSearchCount = Number($("#ext-autosearch-limit").val() ?? 50);
  if (currentSearchCount >= limitSearchCount) {
      localStorage.removeItem(lastPointsKey); // 清理
      stopAutoSearch("今日积分任务已达标！");
      return;
  }

  // 4. 准备下一次搜索
  
  // 设置随机延迟
  let randomDelay = Math.floor(Math.random() * 6000) + 8000; // 8-14秒
  let t = new Date();
  t.setSeconds(t.getSeconds() + randomDelay / 1000);
  localStorage.setItem(autoSearchLockExpiresKey, t);

  // 获取关键词
  let currentKeywordIndex = Number(localStorage.getItem(currentKeywordIndexKey) ?? 0);
  var cacheKey = getCurrentChannelKeywordsCacheKey();
  var keywords = JSON.parse(sessionStorage.getItem(cacheKey));

  if (keywords && keywords.length > currentKeywordIndex) {
    // === 关键：在搜索前，保存当前积分作为"LastPoints" ===
    // 这样页面刷新后，脚本就能知道搜索前的积分是多少
    localStorage.setItem(lastPointsKey, currentPoints);

    // 索引+1 (无论积分是否增加，都换下一个词，防止死循环)
    currentKeywordIndex++;
    localStorage.setItem(currentKeywordIndexKey, currentKeywordIndex);

    let msg = isPointsIncreased ? `积分+${currentPoints - Number(lastPoints)}! ` : (lastPoints !== null ? "积分未变. " : "");
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

function initControls() {
  if (window.top !== window.self) return;
  $("#rebang").remove(); $("#rebang-widget").remove();

  if ($("#rebang-widget").length == 0) {
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

    // 加载榜单数据
    let channelList = sessionStorage.getItem(channelListKey);
    if (channelList !== null) { initChannels(JSON.parse(channelList), getCurrentChannel()); }
    else {
      $.ajax({ url: "https://api.pearktrue.cn/api/dailyhot", method: "GET", timeout: 0 }).done(function (response) {
        if (response.code == 200 && response.data && response.data.platforms) {
          sessionStorage.setItem(channelListKey, JSON.stringify(response.data.platforms));
          initChannels(response.data.platforms, getCurrentChannel());
        } else { showUserMessage(`获取热榜频道失败。`); }
      });
    }
  }

  let currentSearchCount = Number(localStorage.getItem(getAutoSearchCountKey()) ?? 0);
  let limitSearchCount = Number(localStorage.getItem(limitSearchCountKey) ?? 50);
  
  $("#ext-current-count").text(currentSearchCount);
  $("#ext-autosearch-limit").val(limitSearchCount);

  if (currentSearchCount >= limitSearchCount) { localStorage.setItem(autoSearchLockKey, "off"); }

  if (localStorage.getItem(autoSearchLockKey) == "on") { $("#ext-autosearch-lock").text("停止").addClass("stop"); }
  else { $("#ext-autosearch-lock").text("开始").removeClass("stop"); }

  $("#ext-channels").change(function (e) { localStorage.setItem(selectedChannelKey, $(this).val()); localStorage.setItem(currentKeywordIndexKey, 0); initKeywords(); });
  $("#ext-keywords-linktype").change(function (e) { initKeywords(); });
  $("#ext-autosearch-limit").change(function (e) { localStorage.setItem(limitSearchCountKey, $(this).val()); });
  $("#ext-keywords-refresh").click(function (e) { sessionStorage.removeItem(getCurrentChannelKeywordsCacheKey()); initKeywords(); });

  $("#ext-autosearch-lock").click(function (e) {
    if (localStorage.getItem(autoSearchLockKey) == "on") {
      stopAutoSearch("自动搜索已停止");
    } else {
      let limit = Number($("#ext-autosearch-limit").val());
      let current = Number(localStorage.getItem(getAutoSearchCountKey()) ?? 0);
      if (current >= limit) {
        showUserMessage("今日任务已完成！");
      } else {
        localStorage.setItem(autoSearchLockKey, "on");
        $(this).text("停止").addClass("stop");
        showUserMessage("初始化中...");
        localStorage.setItem(autoSearchLockExpiresKey, ""); // 立即开始
        
        // 点击开始时，尝试记录当前积分，以便第一次搜索也能被正确比对（如果点开始时已经有分）
        let p = getBingPoints();
        if(p !== null) localStorage.setItem(lastPointsKey, p);
        
        doAutoSearch();
      }
    }
  });
}

(function () {
  "use strict";
  $(document).ready(function () {
    if (window.top === window.self) {
      this.intervalId = this.intervalId || setInterval(function () {
          if ($("#rebang-widget").length == 0) { initControls(); }
          if ($("#ext-autosearch-limit").val().trim() != "" && localStorage.getItem(autoSearchLockKey) == "on") {
             doAutoSearch();
          }
        }, 1000);
    }
  });
})();
