// ==UserScript==
// @name         组卷网隐藏元素打印
// @namespace    https://github.com/id94264/zujuan
// @version      1.1
// @description  组卷网组卷中心隐藏无关元素，打印试题
// @author       id94264
// @match        https://zujuan.xkw.com/zujuan
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xkw.com
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
    window.onload = function () {
      //等内容加载完成再执行
      setTimeout(function () {
        //隐藏头部标签
        var header = document.getElementsByClassName("header"); //头部标签
        header[0].style.display = "none";
  
        //隐藏导航条
        var bread_nav = document.getElementsByClassName("bread-nav");
        bread_nav[0].style.display = "none";
  
        //隐藏右侧调整工具条
        var tools = document.getElementsByClassName("tools");
        tools[0].style.display = "none";
  
        //隐藏右侧固定快捷栏
        var fiexd_nav = document.getElementsByClassName("fiexd-nav");
        fiexd_nav[0].style.display = "none";
  
        //隐藏左侧装订线
        var seal_line = document.getElementsByClassName("seal-line");
        seal_line[0].style.display = "none";
  
        //底部信息栏
        var footer = document.getElementsByClassName("footer");
        footer[0].style.display = "none";
  
        //隐藏已删试题
        var deleted_box = document.getElementsByClassName("deleted-box");
        deleted_box[0].style.display = "none";
  
        //调整试题页面宽度100%
        var paper_cnt = document.getElementsByClassName("paper-cnt clearfix");
        paper_cnt[0].style.cssText = "max-width: 100%";
  
        //调整试题周围0px
        var ques_item = document.getElementsByClassName("ques-item");
        for (var i = 0, ilen = ques_item.length; i < ilen; i++) {
          ques_item[i].style.cssText =
            "max-width: none; padding: 0px; margin-bottom: 0px;";
        }
  
        //调整试题间距
        var wrapper_quesdiv = document.getElementsByClassName("wrapper quesdiv");
        for (var i = 0, ilen = wrapper_quesdiv.length; i < ilen; i++) {
          wrapper_quesdiv[i].style.cssText = "padding: 0px;";
        }
  
        //试题大标题字体
        var main_title = document.getElementsByClassName("main-title");
        main_title[0].style.cssText = "font-size: 1.375rem; font-weight: bold; ";
  
        //试题小标题题号字体
        var questypeindex = document.getElementsByClassName("questypeindex");
        for (var i = 0, ilen = questypeindex.length; i < ilen; i++) {
          questypeindex[i].style.cssText = "font-size: 1rem;";
        }
  
        //试题小标题内容字体
        var questypename = document.getElementsByClassName("questypename");
        for (var i = 0, ilen = questypename.length; i < ilen; i++) {
          questypename[i].style.cssText = "font-size: 1rem;";
        }
  
        //试题正文字体
        var exam_item_cnt = document.getElementsByClassName("exam-item__cnt");
        for (var i = 0, ilen = exam_item_cnt.length; i < ilen; i++) {
          exam_item_cnt[i].style.cssText = "font-size: .875rem;";
        }
      }, 1000);
    };
    // Your code here...
  })();
  