// ==UserScript==
// @name         微软Bing 必应积分自动脚本 (含每日任务-积分变化重试版)
// @version      2025.12.19.14
// @description  必应 Bing 搜索添加今日热榜，悬浮窗模式，智能检测积分变化，自动换榜单，支持每日任务自动点击，延迟刷新确保任务完成，防死循环，重试逻辑改为基于积分变化
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

// ==========================================
// ============== 设置区域 ==================
// ==========================================

// 测试模式开关
// 1: 开启测试模式。点击“开始”时，强制重置今日所有状态。
// 0: 正常模式。智能判断是否已完成。
const TEST_MODE = 1; 

// ==========================================
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
    #rebang-body { padding: 12px; max-height: 520px; overflow-y: auto; display: block; }
    #rebang-body.minimized { display: none; }
    .control-row { display: flex; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; font-size: 12px; }
    .form-select { padding: 2px 5px; border-radius: 4px; border: 1px solid #ccc; max-width: 100px; font-size: 12px; }
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

// === 跨域存储封装 ===
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

// === 新增/修改的状态 Key ===
const rewardsFailCountKey = `${prefix}RewardsFailCount`; // 积分页：连续未涨分计数
const rewardsLastPointsKey = `${prefix}RewardsLastPoints`; // 积分页：上次点击时的积分

const jumpFailCountKey = `${prefix}JumpFailCount`; // 搜索页：连续跳转无收益计数
const jumpLastPointsKey = `${prefix}JumpLastPoints`; // 搜索页：上次跳转时的积分

const rewardsClickTimeKey = `${prefix}RewardsClickTime`; 
const getDailyTaskRedirectTimeKey = () => `${prefix}DailyTaskRedirectTime`; 

const selectedChannelKey = `${prefix}SelectedChannel`;
const currentKeywordIndexKey = `${prefix}CurrentKeywordIndex`;
const channelListKey = `${prefix}Channels`;
const widgetPosKey = `${prefix}WidgetPosition`;
const widgetStateKey = `${prefix}WidgetState`;

function getAutoSearchCountKey() {
  return `${prefix}AutoSearchCount_${new Date().toISOString().split("T")[0]}`;
}

function getAutoStartTriggeredKey() {
  return `${prefix}AutoStartTriggered_${new Date().toISOString().split("T")[0]}`;
}

function getDailyTasksDoneKey() {
  return `${prefix}DailyTasksDone_${new Date().toISOString().split("T")[0]}`;
}

// === 核心逻辑：获取当前积分 ===
function getBingPoints() {
    let $searchPoints = $(".points-container");
    if ($searchPoints.length > 0) {
        let text = $searchPoints.text().trim();
        let points = parseInt(text.replace(/,/g, ''), 10);
        if (!isNaN(points)) return points;
    }

    let $rewardsPoints = $("#balanceToolTipDiv .pointsValue span");
    if ($rewardsPoints.length > 0) {
        let text = $rewardsPoints.text().trim();
        let points = parseInt(text.replace(/,/g, ''), 10);
        if (!isNaN(points)) return points;
    }

    return null; 
}

function stopAutoSearch(msg) {
    setVal(autoSearchLockKey, "off");
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

// === Rewards 页面逻辑 (基于积分变化重试) ===
function handleRewardsPage() {
    let isLocked = getVal(autoSearchLockKey, "off");
    let currentPoints = getBingPoints();
    
    // 更新悬浮窗
    if (currentPoints !== null) {
        $("#ext-rewards-points").text(currentPoints);
        setVal(lastPointsKey, currentPoints); 
    }

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

    // === 1. 检查是否处于“点击后等待”状态 ===
    let lastClickTime = Number(getVal(rewardsClickTimeKey, 0));
    let now = new Date().getTime();
    let waitDuration = 15000; // 等待15秒

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

    // === 2. 积分变化检测 (关键逻辑) ===
    let rewardsLastPoints = Number(getVal(rewardsLastPointsKey, -1)); // 默认-1表示首次进入
    let failCount = Number(getVal(rewardsFailCountKey, 0));
    let maxRetries = Number(getVal(dailyTaskMaxRetriesKey, 3));

    // 如果不是首次检测（lastPoints != -1），则对比积分
    if (rewardsLastPoints !== -1 && currentPoints !== null) {
        // 我们只在“点击操作刷新回来后”且“不在等待期”时才进行这个判断
        // 为了避免页面刚加载时的误判，这里需要配合 rewardsClickTimeKey 为 0 来判断
        // 但这里简化：只要 handleRewardsPage 正常执行，说明刷新完成了
        
        // 注意：这里需要一个标志位，表明“刚刚进行了一次点击”。
        // 但为了简单，我们对比：如果积分涨了 -> 重置 FailCount
        if (currentPoints > rewardsLastPoints) {
            if (failCount > 0) console.log(`[Rebang] Points increased! Reset fail count.`);
            failCount = 0;
            setVal(rewardsFailCountKey, 0);
        } else {
            // 积分没涨。
            // 这里有一个问题：如果只是刚进页面还没点，积分当然没涨。
            // 所以，必须是“执行了点击”之后才算。
            // 现在的逻辑是：点击 -> 记录时间 -> 刷新 -> 回到这里。
            // 所以，如果 now - lastClickTime > waitDuration (即上面的if没进去)，说明是刷新回来了。
            // 但是，如果是刚打开页面呢？ lastClickTime 是 0。
            // 只有当 lastClickTime 曾经被设置过（>0）且现在归零了？ 不太好判断。
            
            // 改进：在点击动作发生时，记录 rewardsLastPoints。
            // 只有在点击时，才把“旧积分”存入 rewardsLastPointsKey。
            // 这样，当页面刷新回来，currentPoints 对比的就是“点击前”的积分。
            // 如果没涨，说明上次点击无效。
            
            // 下面的逻辑移到点击动作里去设置 baseline。
            // 这里只负责读取结果：
            // 但怎么知道是“点击后回来”还是“刚进来”？
            // 我们可以利用一个 flag: Rebang_IsCheckingResult
        }
    }

    // === 3. 熔断检测 ===
    if (failCount > maxRetries) {
        console.log(`[Rebang] Task No-Gain limit (${failCount}) reached. Skipping.`);
        showUserMessage(`连续${failCount}次无分，跳过...`);
        setVal(getDailyTasksDoneKey(), true);
        setTimeout(() => {
            window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Skip";
        }, 1500);
        return;
    }

    // === 4. 查找并执行任务 ===
    let $cards = $("#more-activities mee-card");
    let hasPending = false;
    let targetLink = null;
    let targetName = "";

    $cards.each(function() {
        if (targetLink) return; 

        let $icon = $(this).find(".mee-icon-SkypeCircleCheck");
        if ($icon.length === 0) {
            let $link = $(this).find("a");
            if ($link.length > 0) {
                hasPending = true;
                targetLink = $link;
                targetName = $link.text().trim() || "任务";
            }
        }
    });

    if (hasPending && targetLink) {
        // === 核心：点击前逻辑 ===
        // 1. 检查上次点击是否有收益 (如果这不是第一次点击)
        // 逻辑：如果 rewardsLastPoints 有值，且 currentPoints == rewardsLastPoints，说明上次白点了
        if (rewardsLastPoints !== -1 && currentPoints !== null) {
             if (currentPoints > rewardsLastPoints) {
                 failCount = 0; // 涨分了，重置
                 setVal(rewardsFailCountKey, 0);
             } else {
                 failCount++; // 没涨，记一过
                 setVal(rewardsFailCountKey, failCount);
             }
        }
        
        // 2. 再次检查熔断 (因为 failCount 刚可能增加了)
        if (failCount > maxRetries) {
            showUserMessage(`无分重试(${failCount})超限，跳过`);
            setVal(getDailyTasksDoneKey(), true);
            setTimeout(() => { window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Skip"; }, 1000);
            return;
        }

        // 3. 执行本次点击
        showUserMessage(`执行: ${truncateText(targetName, 8)} (失误:${failCount})`);
        
        // 记录当前积分作为“下一次的基准”
        if (currentPoints !== null) setVal(rewardsLastPointsKey, currentPoints);
        
        setVal(rewardsClickTimeKey, now); // 开启等待计时

        targetLink[0].click();
        
    } else if (!hasPending && $cards.length > 0) {
        console.log("[Rebang] Daily tasks done.");
        setVal(getDailyTasksDoneKey(), true);
        showUserMessage("任务全清！返回搜索...");
        setTimeout(() => {
            window.location.href = "https://www.bing.com/search?q=Bing+Rewards+Done";
        }, 1500);
    }
}

function doAutoSearch() {
  let enableDaily = getVal(enableDailyTasksKey, false);
  let dailyDone = getVal(getDailyTasksDoneKey(), false);

  // === 每日任务跳转逻辑 (基于积分变化) ===
  if (enableDaily && !dailyDone) {
      let lastRedirect = Number(getVal(getDailyTaskRedirectTimeKey(), 0));
      let nowTime = new Date().getTime();
      
      // 冷却时间
      if (nowTime - lastRedirect < 60 * 1000) {
          let waitSec = Math.ceil((60000 - (nowTime - lastRedirect)) / 1000);
          showUserMessage(`等待任务页冷却... ${waitSec}s`);
          return; 
      }

      // 获取当前状态
      let currentPoints = getBingPoints();
      let jumpLastPoints = Number(getVal(jumpLastPointsKey, -1));
      let jumpFailCount = Number(getVal(jumpFailCountKey, 0));
      
      // UI配置的重试次数
      let uiMaxRetries = $("#ext-daily-retries").length ? Number($("#ext-daily-retries").val()) : -1;
      let maxRetries = uiMaxRetries >= 0 ? uiMaxRetries : Number(getVal(dailyTaskMaxRetriesKey, 3));

      // 判定上次跳转是否有效
      if (jumpLastPoints !== -1 && currentPoints !== null) {
          if (currentPoints > jumpLastPoints) {
              // 涨分了！说明上次跳转是有意义的
              jumpFailCount = 0;
              setVal(jumpFailCountKey, 0);
          } else {
              // 没涨分，说明上次白跑了
              jumpFailCount++;
              setVal(jumpFailCountKey, jumpFailCount);
          }
      }

      // 熔断检测
      if (jumpFailCount > maxRetries) {
          showUserMessage(`无分跳转(${jumpFailCount}次)超限，跳过`);
          setVal(getDailyTasksDoneKey(), true); 
          return; 
      }

      // 准备跳转
      showUserMessage(`前往任务页 (无分次数:${jumpFailCount})...`);
      
      // 记录状态
      if (currentPoints !== null) setVal(jumpLastPointsKey, currentPoints); // 记录当前积分为基准
      setVal(getDailyTaskRedirectTimeKey(), nowTime);
      setVal(rewardsClickTimeKey, 0); 
      // 注意：进入积分页时，把积分页内部的基准积分重置，防止误判
      setVal(rewardsLastPointsKey, -1); 
      setVal(rewardsFailCountKey, 0);

      setTimeout(() => {
          window.location.href = "https://rewards.bing.com/";
      }, 1000);
      return; 
  }

  // === 搜索刷分逻辑 ===
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
          console.log(`[Rebang] Points increased: ${lastP} -> ${currentPoints}.`);
      } else {
          consecutiveNoGain++;
          setVal(consecutiveNoGainKey, consecutiveNoGain);
          
          if (consecutiveNoGain >= maxNoGainLimit) {
              stopAutoSearch(`连续${consecutiveNoGain}次无积分，已停止保护。`);
              return; 
          }
      }
  }
  
  $("#ext-current-count").text(currentSearchCount);

  let limitSearchCount = Number(getVal(limitSearchCountKey, 50));
  if (currentSearchCount >= limitSearchCount) {
      setVal(lastPointsKey, null); 
      stopAutoSearch("今日积分任务已达标！");
      return;
  }

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
    let startHourStr = getVal(autoStartHourKey, "-1");
    let startMinStr = getVal(autoStartMinKey, "-1");
    
    let startHour = parseInt(startHourStr, 10);
    let startMin = parseInt(startMinStr, 10);

    if (isNaN(startHour) || isNaN(startMin) || startHour === -1 || startMin === -1) return;

    let triggeredKey = getAutoStartTriggeredKey();
    if (getVal(triggeredKey, "false") === "true") return;

    let now = new Date();
    if (now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() >= startMin)) {
        
        let limit = Number($("#ext-autosearch-limit").val() ?? 50);
        let current = Number(getVal(getAutoSearchCountKey(), 0));
        
        if (getVal(autoSearchLockKey, "off") !== "on" && current < limit) {
             let niceMin = startMin < 10 ? '0'+startMin : startMin;
             console.log(`[Rebang] Auto-start triggered. Time: ${now.toLocaleTimeString()}`);
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

// === Rewards 页面专用悬浮窗 ===
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

// === Bing 搜索页面专用悬浮窗 ===
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
                 <label>次跳过</label>
            </div>
            <div class='control-row'>
                <label>有效搜:</label>
                <span id='ext-current-count' style='font-weight:bold;margin:0 2px;color:#d9534f;'>0</span>/
                <input type='text' id='ext-autosearch-limit' style='width:35px;text-align:center;border:1px solid #ccc;border-radius:4px;' value='50'>
                <label>次</label>
                <button id='ext-autosearch-lock' class='rebang-btn' type='button' style='margin-left:auto;'>开始</button>
            </div>
            
            <div class='control-row' style='background:#f0f0f0; padding:5px; border-radius:4px;'>
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

  // 页面加载时，如果在停止状态，强制重置计数器
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

        if (TEST_MODE === 0) {
            let limit = Number($("#ext-autosearch-limit").val());
            let current = Number(getVal(getAutoSearchCountKey(), 0));
            let dailyEnabled = getVal(enableDailyTasksKey, false);
            let dailyDone = getVal(getDailyTasksDoneKey(), false);

            if (current >= limit && (!dailyEnabled || dailyDone)) {
                showUserMessage("今日任务已全部完成！");
                return;
            }
        } 
        else if (TEST_MODE === 1) {
            setVal(getDailyTasksDoneKey(), false);
            setVal(rewardsFailCountKey, 0);
            setVal(getDailyTaskRedirectTimeKey(), 0);
            setVal(jumpFailCountKey, 0); 
            
            setVal(getAutoSearchCountKey(), 0); 
            showUserMessage("测试模式: 强制重置状态...");
        }

        setVal(autoSearchLockKey, "on");
        setVal(consecutiveNoGainKey, 0); 
        
        // 点击开始，重置今日跳转计数
        setVal(jumpFailCountKey, 0); 
        setVal(jumpLastPointsKey, -1);
        setVal(rewardsFailCountKey, 0);
        
        $(this).text("停止").addClass("stop");
        showUserMessage("初始化中...");
        setVal(autoSearchLockExpiresKey, ""); 
        
        let p = getBingPoints();
        if(p !== null) setVal(lastPointsKey, p);
        
        doAutoSearch();
    }
  });
}

(function () {
  "use strict";
  $(document).ready(function () {
    if (location.hostname === "rewards.bing.com") {
        if ($("#rebang-widget").length == 0) initRewardsControls();
        setInterval(handleRewardsPage, 2000); 
    } else {
        if (window.top === window.self) {
          this.intervalId = this.intervalId || setInterval(function () {
              if ($("#rebang-widget").length == 0) { initSearchControls(); }
              
              checkAutoStart();

              if ($("#ext-autosearch-limit").val() && $("#ext-autosearch-limit").val().trim() != "" && getVal(autoSearchLockKey, "off") == "on") {
                 doAutoSearch();
              }
            }, 1000);
        }
    }
  });
})();
