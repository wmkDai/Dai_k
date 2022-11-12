// ==UserScript==
// @name         Dai_会员解析
// @namespace    http://tampermonkey.net/
// @version      0.0.22
// @icon         https://cdn.jsdelivr.net/gh/Anjude/pubsrc@img/1.png
// @description  浸入式虚拟会员体验，功能智能自动化，让你的 B站 比别人的更强。自动跳转多 P 视频（UP 上传视频）上次观看进度,快捷键增强，每日任务（签到&分享），会员番剧无感解析，视频已看标签等等，具体看脚本介绍~
// @author       Dai_
// @match        https://*.bilibili.com/*
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_xmlhttpRequest
// @original-script   https://github.com/Anjude/tampermonkey
// @require      https://lf26-cdn-tos.bytecdntp.com/cdn/expire-1-M/jquery/3.2.1/jquery.min.js
// @require     https://greasyfork.org/scripts/412159-mydrag/code/MyDrag.js?version=858320
// ==/UserScript==

(function () {
  "use strict";
  // @require     https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
  // 检查版本
  const RELEASE_VERSION = "0.0.22";
  let ENV = "RELEASE";
  // ENV = 'DEBUG'
  const updateVersion =
    ENV === "DEBUG" || RELEASE_VERSION !== GM_getValue("RELEASE_VERSION");
  updateVersion && GM_setValue("RELEASE_VERSION", RELEASE_VERSION);
  startHttpProxy();
  /**
   * 默认设置
   * `${e.altKey}${e.ctrlKey}${e.shiftKey}${pressKey}`
   */
  let defaultBili2sConf = {
    shortcutMap: {
      upToTop: "000U", // 回到顶部
      takeNote: "000N", // 打开视频笔记
      lightOff: "000L", // 开关宽屏模式
      notePicShot: "101P", // 笔记-视频截图
      noteTimePoint: "101T", // 笔记-时间标记
      changeParseApi: "100V", // 解锁视频
      showMenu: "100M", // 打开菜单
    },
    videoRecordMap: {}, // 视频记录
    multiUnceasing: true, // 多集自动连播
    singleUncreasing: false, // 单集自动连播
    autoUnlockVideo: false, // 是否自动解锁视频
    shareDate: "2022/1/1",
    lastClearup: new Date().toLocaleString(),
    parseApiIndex: 0, // 解析接口选择
    pretendVip: false,
    installTime: null,
  };
  // 网站配置
  const siteConfig = {
    delay2s: 2000,
    scrollBtnList: [
      "div.item.back-top", // 首页
      "button.primary-btn.top-btn", // 新版首页
      "div.item.backup", // up视频,
      "div.tool-item.backup.iconfont.icon-up", //
      "#app > div.to-top", // up主所有视频
      "#cheese_guide > div > div", // 课堂
    ],
    noteBtnList: [
      "div.note-btn", // 普通up视频
      "span.note-btn", // 课堂视频
    ],
    notePanelList: [
      "div.resizable-component.bili-note", // 普通up视频
    ],
    lightOffBtn: [
      "div.squirtle-single-setting-other-choice.squirtle-lightoff",
      "div.bilibili-player-fl.bilibili-player-video-btn-setting-right-others-content-lightoff.bui.bui-checkbox.bui-dark > input",
    ],
    wideScreenBtn: [
      "div.squirtle-widescreen-wrap.squirtle-block-wrap > div", // bangumi 视频
      "div.bilibili-player-video-btn.bilibili-player-video-btn-widescreen", // up 视频
    ],
    videoSettingBtn: [
      "div.bilibili-player-video-btn.bilibili-player-video-btn-setting",
    ],
    picBtnList: ["span.ql-capture-btn"],
    pointBtnList: ["span.ql-tag-btn"],
    multiPageBox: ["#multi_page > div.cur-list"],
    chapListItem: ["div.cur-list > ul > li.on"],
    trendBtnList: [
      // "div.box-bottom > div > div:nth-child(1)",
      "div.share-btns > div:nth-child(1)",
      "div.share-info > div > div > span",
    ],
    shareBtnList: ["div.share-info"],
    unceasingBtnList: ["span.switch-button"],
    searchResBox: [
      "#video-list > ul",
      "div.video-list", // 搜索页
      "div.video.search-all-list > div", // 搜索页
      "div.mixin-list > ul.video-list", // 番剧
      "div.flow-loader > ul",
      "div.rcmd-box", // 首页推荐
      "div.section.video > div.content", // UP主页
      "#submit-video-list > ul.list-list", // UP主页，更多视频
      "#submit-video-list > ul.cube-list", // UP主页，更多视频
      "#page-series-detail > div > div > div > ul"     // 专栏视频
      // '#reco_list > div.rec-list',  // 相关视频
    ],
    vipIcon: "bili-avatar-icon--big-vip",
    vipSpan: [
      "div.avatar-container > div > div > span",
      "div.big-avatar-container--default > a > div > span",
      "a.header-entry-avatar > div > span",
    ],
    vipLabel: "div.h-vipType",
    playerBox: ["#player_module"],
    videoBox: ["video"],
    vipAdClose: ["div.twp-mask > div > i"],
    parseApiList: [
      // 解析链接均收集自网络，经过简单测试
      // https://jx.bozrc.com:4433/player/?url=
      // {
      //   url: "https://vip.parwix.com:4433/player/?url=",
      //   name: "Parwix解析系统",
      // },
      { url: "https://jx.bozrc.com:4433/player/?url=", name: "夜幕解析" },
      { url: "https://yparse.jn1.cc/index.php?url=", name: "云解析" },
      { url: "https://vip.parwix.com:4433/player/?url=", name: "Parwix解析系统" },
      // { url: "https://www.yemu.xyz/?url=", name: "夜幕解析" },
      // { url: "https://vip.bljiex.cc/?v=", name: "BL解析" },
      // { url: "https://vip.mmkv.cn/tv.php?url=", name: "mmkv" },
      // { url: "https://vip5.jiexi.one/?url=", name: "爱爱蓝光解析" },
      // { url: 'https://www.1717yun.com/jx/ty.php?url=', name: '1717云解析' },
      // { url: 'https://jx.rdhk.net/?v=', name: '4080视频解析' },
      // { url: 'https://go.yh0523.cn/y.cy?url=', name: '盘古云解析' },
      // { url: 'https://17kyun.com/api.php?url=', name: '17kyun' },
      // { url: 'https://lecurl.cn/?url=', name: 'dplayer - by-le' },
    ],
    bangumiLi: ["li.ep-item.cursor.badge.visited"],
    watchroomvip: ["#paybar_module > div.vip"],
    shortcutList: {
      upToTop: "回到顶部",
      takeNote: "打开/关闭笔记",
      changeParseApi: "切换视频解析接口",
      showMenu: "打开菜单",
      notePicShot: "笔记-视频截图",
      noteTimePoint: "笔记-时间标志",
      lightOff: "开关宽屏模式",
    }, // shortcut list
    scSetting: "",
  };

  let bili2sConf = GM_getValue("bili2sConf") || defaultBili2sConf;

  if (updateVersion) {
    let shortcutMap = Object.assign({}, defaultBili2sConf.shortcutMap);
    bili2sConf = Object.assign(defaultBili2sConf, bili2sConf);
    bili2sConf.shortcutMap = Object.assign(shortcutMap, bili2sConf.shortcutMap);
    console.log(
      shortcutMap,
      defaultBili2sConf.shortcutMap,
      bili2sConf.shortcutMap
    );
    GM_setValue("bili2sConf", bili2sConf);
    Toast("脚本已更新");
  }

  if (!bili2sConf.installTime) {
    bili2sConf.installTime =  new Date().toLocaleString();
    GM_setValue("bili2sConf", bili2sConf);
    alert("首次使用,前往微信,随时反馈!");
    window.GM_openInTab(
      "http://photogz.photo.store.qq.com/psc?/V10Zu1oy0ixofk/bqQfVz5yrrGYSXMvKr.cqZSaDLuVb.z6jHndfNX6Sg7DiPNGR6revWbgMK7.PomvvBrN7luOngSJNv7WnTwDcpSGVCQTnLnygprc2jIOcKg!/b&bo=PAMABzwDAAcWECA!&rf=viewer_311",
      { active: true, insert: true, setParent: true }
    );
  }

  const delayExecute = (execution, delayMs) => {
    setTimeout(() => {
      execution();
    }, delayMs || siteConfig.delay2s);
  };

  const getElement = (list) => {
    if (typeof list === "string") return document.querySelector(list);
    let btn = document.querySelector(list[0]);
    list.forEach((e) => {
      btn = document.querySelector(e) || btn;
    });
    return btn;
  };

  const getBvid = (href) => {
    let res = /video\/([0-9|a-z|A-Z]*)/gi.exec(href || document.location.href);
    return res === null ? false : res[1];
  };

  // 改编自 github 网友贡献的代码，详情请参见 github 的提交记录
  const LightOff = () => {
    let settingBtn = getElement(siteConfig.videoSettingBtn);
      settingBtn?.dispatchEvent(new MouseEvent("mouseover"));
    settingBtn?.dispatchEvent(new MouseEvent("mouseover"));
    settingBtn?.dispatchEvent(new MouseEvent("mouseout"));

    let wideScreenBtn = getElement(siteConfig.wideScreenBtn);
    let lightOffBtn = getElement(siteConfig.lightOffBtn);
    let scrollDistance = window.location.href.match("bangumi") ? 50 : 100;

    wideScreenBtn.click();
    lightOffBtn.click();
    window.scrollTo(0, scrollDistance);
  };

  const UpToTop = () => {
    // 回到顶部
    let scrollBtn = getElement(siteConfig.scrollBtnList);
    if (scrollBtn) scrollBtn.click();
  };

  const TakeNote = () => {
    let noteBtn = getElement(siteConfig.noteBtnList);
    let nodePanel = getElement(siteConfig.notePanelList);
    let res =
      nodePanel ||
      (() => {
        noteBtn.click();
        return false;
      })();
    if (!res) return;

    nodePanel.style.display = nodePanel.style.display === "none" ? "" : "none";
  };

  const NotePicShot = () => {
    let picBtn = getElement(siteConfig.picBtnList);
    picBtn.click();
  };

  const NoteTimePoint = () => {
    let pointBtn = getElement(siteConfig.pointBtnList);
    pointBtn.click();
  };

  const keyCtrl = () => { };

  const blockKey = (e) => {
    let isBlock = false;

    // do sth if isBlock should be true

    return isBlock;
  };

  const setShortcut = (command) => {
    let commandString = getShortCut(command);
    let scSetting = siteConfig.scSetting;
    let innerTextList = document
      .querySelector(`#${scSetting}`)
      .innerHTML.split(":");
    document.querySelector(`#${scSetting}`).innerHTML =
      innerTextList[0] + ": " + commandString;
    siteConfig.scm[scSetting] = command;
  };

  let focus = false; // 输入中
  $(document).ready(() => {
    $(document).delegate("input, textarea", "focus", () => {
      focus = true;
    });
    $(document).delegate("input, textarea", "blur", () => {
      focus = false;
    });
    $(document).keydown((e) => {
      // 如果正在打字或者特殊情况，屏蔽快捷键
      if (!e.altKey && !e.shiftKey && !e.ctrlKey && (focus || blockKey(e))) {
        return;
      }
      const k = (key) => (key ? 1 : 0);
      let pressKey = String.fromCharCode(e.keyCode);
      let command = `${k(e.altKey)}${k(e.ctrlKey)}${k(e.shiftKey)}${pressKey}`;
      let keyMap = bili2sConf.shortcutMap;

      // console.log('键盘:', command, siteConfig.scSetting)
      if (siteConfig.scSetting) {
        return setShortcut(command);
      }
      switch (command) {
        case keyMap.upToTop:
          return UpToTop();
        case keyMap.lightOff:
          return LightOff();
        case keyMap.takeNote:
          return TakeNote();
        case keyMap.changeParseApi:
          return ChangeParseApi();
        case keyMap.showMenu:
          return (document.querySelector("#sc-box").style.display = "");
        case keyMap.notePicShot:
          return NotePicShot();
        case keyMap.noteTimePoint:
          return NoteTimePoint();
        default:
          keyCtrl(command); // 一些不常用的小操作，集中一个函数处理
      }
    });
  });

  const chapListener = (res) => {
    let listItem = getElement(siteConfig.chapListItem)?.innerHTML;
    if (!listItem) {
      console.log("非多集视频");
      return;
    }
    let regxList = /video\/([0-9a-zA-Z]*)\?p=(\d+).*title=.(.*?).><div/i.exec(
      listItem
    );
    let bvid = regxList[1];
    bili2sConf.videoRecordMap[bvid] = Object.assign(
      bili2sConf.videoRecordMap[bvid] || {},
      {
        p: regxList[2],
        title: regxList[3],
        updateTime: new Date().toLocaleString(),
      }
    );
    GM_setValue("bili2sConf", bili2sConf);
  };

  const multiPageJump = async () => {
    let bvid = getBvid();
    let videoHis = bili2sConf.videoRecordMap[bvid];
    videoHis &&
      (() => {
        let hrefRegexp = new RegExp(`${bvid}\\?p=\\d+`, "i");
        if (hrefRegexp.test(window.location.href)) {
          return;
        }
        let curChapLi = document.querySelector(
          `div.cur-list > ul > li:nth-child(${videoHis.p}) > a > div`
        );
        if (!curChapLi) {
          return delayExecute(multiPageJump);
        }
        curChapLi.click();
        Toast(`小助手: 跳转上次观看 P${videoHis.p}`);
      })();
  };

  const setVideoRecord = () => {
    let bvid = getBvid();
    let videoRecord = bili2sConf.videoRecordMap[bvid] || {
      docTitle: document.title,
      p: 1,
    };
    videoRecord.updateTime = new Date().toLocaleString();
    bili2sConf.videoRecordMap[bvid] = Object.assign(
      bili2sConf.videoRecordMap[bvid] || {},
      videoRecord
    );
    // console.log(bili2sConf.videoRecordMap[bvid], videoRecord)
    GM_setValue("bili2sConf", bili2sConf);
  };

  const dealUnceasing = (isMultiPage) => {
    // 处理连播
    let switchCase = isMultiPage ? "multiUnceasing" : "singleUncreasing";
    let unceasingBtn = getElement(siteConfig.unceasingBtnList);
    if (!unceasingBtn) {
      return delayExecute(dealUnceasing);
    }
    let curUnceasing = /switch-button on/.test(
      unceasingBtn.getAttribute("class")
    );
    curUnceasing === bili2sConf[switchCase] || unceasingBtn.click();
    unceasingBtn.addEventListener("click", (e) => {
      // 过滤脚本模拟点击
      if (e.isTrusted) {
        bili2sConf[switchCase] = !/switch-button on/.test(
          unceasingBtn.getAttribute("class")
        );
        GM_setValue("bili2sConf", bili2sConf);
      }
    });
  };

  const doShare = () => {
    console.log("[B站小助手]: 开始分享!");
    // let shareBtn = getElement(siteConfig.shareBtnList);

    // console.log(111, shareBtn);
    // shareBtn?.dispatchEvent(new MouseEvent("mouseover"));

    let trendBtn = getElement(siteConfig.trendBtnList);
    if (!trendBtn) {
      return delayExecute(doShare);
    }
    trendBtn.click();
    document.body.lastChild.remove();
    // shareBtn?.dispatchEvent(new MouseEvent("mouseout"));
    bili2sConf.shareDate = new Date().toLocaleDateString();
    GM_setValue("bili2sConf", bili2sConf);
    console.log("[B站小助手]: 分享完成!");
    Toast("小助手: 今日分享任务达成");
  };

  const dealRead = (res) => {
    siteConfig.searchResBox.forEach((boxPath) => {
      let searchResBox = getElement(boxPath);
      console.log(searchResBox, boxPath)
      searchResBox &&
        searchResBox.childNodes.forEach((e) => {
          if (!e.innerHTML) return;
          e.style.position = "relative";
          let bvid = getBvid(e.innerHTML);
          if (!bvid) return;
          let addDiv = document.createElement("div");
          addDiv.className = "video-view";
          if (bili2sConf.videoRecordMap[bvid]) {
            addDiv.innerHTML = "已看";
            addDiv.style.opacity = 0.9;
            addDiv.style.color = "red";
          } else {
            // addDiv.innerHTML = "未看";
          }
          e.prepend(addDiv);
        });
    });
  };

  const ChangeParseApi = () => {
    let curIndex = bili2sConf.parseApiIndex;
    bili2sConf.parseApiIndex = (curIndex + 1) % siteConfig.parseApiList.length;
    UnlockBangumi(bili2sConf.parseApiIndex, false, true);
    GM_setValue("bili2sConf", bili2sConf);
    Toast(
      `B站小助手: 解析接口${bili2sConf.parseApiIndex + 1} ${siteConfig.parseApiList[bili2sConf.parseApiIndex].name
      }`
    );
  };

  const UnlockBangumi = (parseApiIndex = 0, setAutoUnlock, forceUnlock) => {
    if (setAutoUnlock) {
      let set = !bili2sConf.autoUnlockVideo;
      bili2sConf.autoUnlockVideo = set;
      GM_setValue("bili2sConf", bili2sConf);
      Toast(`B站小助手:${set ? "开启" : "关闭"}自动解锁!`);
    }
    parseApiIndex %= siteConfig.parseApiList.length;
    let videoInfo = getElement(siteConfig.bangumiLi)?.innerHTML;
    let href = window.location.href
    // 观看室独立逻辑
    if (/bilibili.com\/watchroom/.test(href)) {
      href = document.referrer
      videoInfo = getElement(siteConfig.watchroomvip)?.innerHTML
    }
    if (!forceUnlock) {
      if (!bili2sConf.autoUnlockVideo || (videoInfo && !/(会员|付费|受限)/.test(videoInfo)) || !videoInfo) {
        return $("#anjude-iframe").length && location.reload();
      }
    }

    let parseApi = siteConfig.parseApiList[parseApiIndex];
    let newPlayer = document.createElement("iframe");
    newPlayer.id = "anjude-iframe";
    newPlayer.height = "100%";
    newPlayer.width = "100%";
    newPlayer.src = parseApi.url + href;
    newPlayer.setAttribute("allow", "autoplay");
    newPlayer.setAttribute("frameborder", "no");
    newPlayer.setAttribute("border", "0");
    newPlayer.setAttribute("allowfullscreen", "true");
    newPlayer.setAttribute("webkitallowfullscreen", "webkitallowfullscreen");

    let playerBox = getElement(siteConfig.playerBox);
    let videoBox = getElement(siteConfig.videoBox);

    if (videoBox) {
      videoBox.muted = true;
      videoBox.pause();
    }

    playerBox.innerHTML = "";
    playerBox.append(newPlayer);

    let monitorTimes = 0;
    let vipAdMonitor = setInterval(() => {
      monitorTimes++;
      let closeAd = getElement(siteConfig.vipAdClose);
      if (closeAd || monitorTimes >= (5 * 60 * 1000) / 200) {
        closeAd.click();
        clearInterval(vipAdMonitor);
      }
    }, 200);
    Toast(`B站小助手: 解析完成`, 500);
  };

  const pretendVip = () => {
    siteConfig.vipSpan.forEach((e) => {
      let vipSpan = getElement(e);
      vipSpan && vipSpan.classList.add(siteConfig.vipIcon);
    });
    let vipLabel = getElement(siteConfig.vipLabel);
    if (vipLabel) {
      let newClass = vipLabel.getAttribute("class").replace("disable", "");
      vipLabel.setAttribute("class", newClass);
    }
  };

  const executeByUri = (responseURL, result) => {
    /\/player\/playurl/.test(responseURL) && chapListener(result);
    (/x\/web-interface\/search/.test(responseURL) ||
      /x\/web-interface\/index\/top\/rcmd/.test(responseURL) ||
      /x\/series\/archives/.test(responseURL) ||
      /x\/space\/arc/.test(responseURL)) &&
      dealRead(result);
    (/pgc\/view\/web\/section\/order/.test(responseURL) ||
      /pgc\/season\/episode\/web\/info/.test(responseURL)) &&
      UnlockBangumi(bili2sConf.parseApiIndex);
  };

  const runScript = () => {
    let date = new Date().toLocaleDateString();
    let href = window.location.href;
    let isMultiPage = getElement(siteConfig.multiPageBox);
    if (isMultiPage) {
      multiPageJump();
    }
    if (/\/video\//.test(href)) {
      setVideoRecord();
      dealUnceasing(isMultiPage);
      dealRead();
      date === bili2sConf.shareDate || doShare();
    }
    if (/bilibili.com\/bangumi/.test(href)) {
      addParseBtn();
    }
    if (/bilibili.com\/watchroom/.test(href)) {
      UnlockBangumi(bili2sConf.parseApiIndex)
    }
    if (/search.bilibili.com/.test(href)) {
      dealRead();
    }
    bili2sConf.pretendVip && pretendVip();
  };

  // 执行脚本
  try {
    // console.log('[B站小助手]:', bili2sConf)
    GM_addStyle(getCss());
    setCommand();
    setTimeout(() => {
      runScript();
    }, siteConfig.delay2s);
    clearupStore();
  } catch (err) {
    console.log("[B站小助手]:", err.name, err.message);
    if (confirm(`【B站小助手】: 请截图(到 我的 - 客服 处)反馈 ${err}`)) {
      window.GM_openInTab(
        "http://photogz.photo.store.qq.com/psc?/V10Zu1oy0ixofk/bqQfVz5yrrGYSXMvKr.cqZSaDLuVb.z6jHndfNX6Sg7DiPNGR6revWbgMK7.PomvvBrN7luOngSJNv7WnTwDcpSGVCQTnLnygprc2jIOcKg!/b&bo=PAMABzwDAAcWECA!&rf=viewer_311",
        { active: true, insert: true, setParent: true }
      );
    }
  }

  function resetScript() {
    GM_deleteValue("bili2sConf");
  }

  function helper() {
    let str = ``;
    let list = str.match(/https?:\/\/[0-9a-zA-Z./?_-]*=/gi);
    list.forEach((e, i) => {
      setTimeout(() => {
        console.log(i, i === list.length - 1);
        window.open(
          `${e}https://www.bilibili.com/bangumi/play/ep457778?spm_id_from=333.999.0.0`,
          "target"
        );
      }, i * 15000);
    });
  }

  function clearupStore() {
    const getDayDiff = (d) => {
      return (new Date() - new Date(d)) / (1000 * 60 * 60 * 24);
    };
    let dayDiff = getDayDiff(bili2sConf.lastClearup);
    if (dayDiff < 30) return; // 每月清理一次数据
    console.log("[B站小助手]:开始清理!");

    let recordMapKeys = Object.keys(bili2sConf.videoRecordMap);
    recordMapKeys.forEach((e) => {
      let updateTime = bili2sConf.videoRecordMap[e].updateTime;
      if (getDayDiff(updateTime) > 365 * 2) {
        delete bili2sConf.videoRecordMap[e];
      }
    });
    bili2sConf.lastClearup = new Date().toLocaleString();
    GM_setValue("bili2sConf", bili2sConf);
  }

  function startHttpProxy() {
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, {
      apply: (target, thisArg, args) => {
        thisArg.addEventListener("load", (event) => {
          try {
            // console.log(111, event.target.responseURL)
            let { responseText, responseURL } = event.target;
            if (/^{.*}$/.test(responseText)) {
              const result = JSON.parse(responseText);
              executeByUri(responseURL, result);
            }
          } catch (err) { }
        });
        return target.apply(thisArg, args);
      },
    });
  }

  function addParseBtn() {
    let ele = $(`
    <div id="anjude-parse" class="mobile-info">
    <i class="iconfont icon-play"></i>
    <span>解析</span>
    </div>
    `);
    $("#toolbar_module").append(ele);
    document
      .querySelector("#anjude-parse")
      .addEventListener("click", ChangeParseApi);
  }

  function Toast(message = "已完成", time = 2000) {
    /*设置信息框停留的默认时间*/
    let el = document.createElement("div");
    el.setAttribute("class", "web-toast");
    el.innerHTML = message;
    document.body.appendChild(el);
    el.classList.add("fadeIn");
    setTimeout(() => {
      el.classList.remove("fadeIn");
      el.classList.add("fadeOut");
      /*监听动画结束，移除提示信息元素*/
      el.addEventListener("animationend", () => {
        document.body.removeChild(el);
      });
      el.addEventListener("webkitAnimationEnd", () => {
        document.body.removeChild(el);
      });
    }, time);
  }

  function getShortCut(command) {
    // console.log(command);
    let res = "";
    if (parseInt(command[0])) res += "Alt+";
    if (parseInt(command[1])) res += "Ctrl+";
    if (parseInt(command[2])) res += "Shift+";
    res += command[3];
    return res;
  }

  function clearCommandStatus(SL) {
    SL.forEach((e) => {
      document.querySelector(`#${e}`).style.color = "";
    });
  }

  function setCommand() {
    initSettingPanel();
    GM_registerMenuCommand("设置脚本", () => {
      document.querySelector("#sc-box").style.display = "";
    });
    GM_registerMenuCommand("重置脚本", () => {
      if (confirm("重置后观看记录、快捷键修改等数据将清空!")) {
        resetScript();
      }
    });
  }

  function initSettingPanel() {
    let SCL = siteConfig.shortcutList;
    siteConfig.scm = bili2sConf.shortcutMap;
    let scItem = "";
    Object.keys(SCL).forEach((e) => {
      scItem += `<div id="${e}">${SCL[e]}快捷键: ${getShortCut(
        siteConfig.scm[e]
      )}</div>`;
    });
    let boxHtml = $(`
<div id="sc-box" style="display:none;width:300px;">
<div id="sc-title" style="width: 100%;height: 20px;
text-align: center;font-size: 16px;padding: 20px;">
快捷键设置(点击选中设置)
</div>
<div style="display:flex; font-size: 15px;flex-direction: column;">
<label>假装自己是大会员 <input type="checkbox" id="pretend-vip" ${bili2sConf.pretendVip ? "checked" : ""
      } /></label>
<label>解锁全部会员视频 <input type="checkbox" id="auto-unlockvideo" ${bili2sConf.autoUnlockVideo ? "checked" : ""
      } /></label>
</div>
<div style="font-size: 15px;">
${scItem}
</div>
<div style="justify-content:center; display: flex; padding: 10px;">
<button id="anjude-scok-btn" style="color: white; font-size:16px; border-radius: 2px;
background: green;padding: 3px;">设置完成</button>
</div>
<a style="font-size: 12px; color: blue;" target="_blank" href="http://photogz.photo.store.qq.com/psc?/V10Zu1oy0ixofk/bqQfVz5yrrGYSXMvKr.cqZSaDLuVb.z6jHndfNX6Sg7DiPNGR6revWbgMK7.PomvvBrN7luOngSJNv7WnTwDcpSGVCQTnLnygprc2jIOcKg!/b&bo=PAMABzwDAAcWECA!&rf=viewer_311">好用的话，去给个好评咯~</a>
<a id="badguy" style="font-size: 12px; color: red;margin-left: 10px;">烂脚本,我要差评!</a>
<img id="miniprogram" style="display: none;" src="https://cdn.jsdelivr.net/gh/Anjude/pubsrc@img/TW-TamperMonkey.png">
</div>
    `);
    $(document.body).append(boxHtml);
    try {
      new MyDrag($("#sc-box")[0], { handle: $("#sc-title")[0] });
    } catch (err) {
      console.log(err);
      return
    }
    Object.keys(SCL).forEach((v) => {
      document.querySelector(`#${v}`).addEventListener("click", function (e) {
        siteConfig.scSetting = this.id;
        clearCommandStatus(Object.keys(SCL));
        this.style.color = "green";
      });
    });
    document
      .querySelector("#anjude-scok-btn")
      .addEventListener("click", function (e) {
        // 设置快捷键,缓存数据
        siteConfig.scSetting = "";
        bili2sConf.shortcutMap = siteConfig.scm;
        GM_setValue("bili2sConf", bili2sConf);
        document.querySelector("#sc-box").style.display = "none";
      });
    document
      .querySelector("#auto-unlockvideo")
      .addEventListener("click", function (e) {
        UnlockBangumi(bili2sConf.parseApiIndex, true);
      });
    document
      .querySelector("#pretend-vip")
      .addEventListener("click", function (e) {
        bili2sConf.pretendVip = !bili2sConf.pretendVip;
        GM_setValue("bili2sConf", bili2sConf);
        Toast("小助手: 刷新页面后生效");
      });
    document.querySelector("#badguy").addEventListener("click", function (e) {
      let cur = document.querySelector("#miniprogram").style.display;
      document.querySelector("#miniprogram").style.display = cur ? "" : "none";
    });
    updateVersion && (document.querySelector("#sc-box").style.display = "");
  }

  function getCss() {
    return `
    #anjude-parse{
      color: orange;
      margin-left: 20px;
    }
    a{text-decoration:none;}
    #pretend-vip,
    #auto-unlockvideo{
      background-color: initial;
	    cursor: default;
	    appearance: checkbox;
	    box-sizing: border-box;
	    padding: initial;
	    border: initial;
    }
    #sc-box{
        padding: 10px;border-radius: 5px;
        background: #F6F6F6;border: #44b549 2px solid;
    }
    .video-view{
      display:inline-block;
      position:absolute;
      left:0px; top:0px;
      background:#FFF; color:#666;
      opacity: 0.8; padding:1px 5px;
      z-index:999;
    }
    @keyframes fadeIn {
    0%    {opacity: 0}
        100%  {opacity: 1}
    }
    @keyframes fadeOut {
        0%    {opacity: 1}
        100%  {opacity: 0}
    }
    .web-toast{
        position: fixed;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 14px;
        line-height: 1;
        padding:10px;
        border-radius: 3px;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        z-index: 9999;
        white-space: nowrap;
    }
    .fadeOut{
        animation: fadeOut .5s;
    }
    .fadeIn{
        animation:fadeIn .5s;
    }
    `;

  }
})();
