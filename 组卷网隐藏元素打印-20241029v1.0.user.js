// ==UserScript==
// @name         组卷网隐藏元素打印
// @namespace    http://tampermonkey.net/
// @version      20241029v1.0
// @description  组卷网组卷中心隐藏无关元素，打印试题
// @author       id94264
// @match        https://zujuan.xkw.com/zujuan
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xkw.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var header = document.getElementsByClassName('header'); //头部标签
    header[0].style.display = 'none';
    var bread_nav = document.getElementsByClassName('bread-nav'); //导航条
    bread_nav[0].style.display = 'none';
    var tools = document.getElementsByClassName('tools'); //右侧工具条
    tools[0].style.display = 'none';
    var fiexd_nav = document.getElementsByClassName('fiexd-nav'); //右侧固定快捷栏
    fiexd_nav[0].style.display = 'none';
    var seal_line = document.getElementsByClassName('seal-line'); //左侧装订线
    seal_line[0].style.display = 'none';
    var footer = document.getElementsByClassName('footer'); //底部信息栏
    footer[0].style.display = 'none';
    var deleted_box = document.getElementsByClassName('deleted-box'); //已删试题
    deleted_box[0].style.display = 'none';
    var paper_cnt = document.getElementsByClassName('paper-cnt clearfix'); //试题页面宽度
//    paper_cnt[0].style['max-width'] = '100%';
    paper_cnt[0].style.cssText = "max-width: 100%";
    window.onload = function() { //等内容加载完成再执行
        var ques_item = document.getElementsByClassName('ques-item'); //试题内容宽度
        for(var i = 0; i < ques_item.length; i++){
            ques_item[i].style.cssText = "max-width: none; padding: 0px; margin-bottom: 0px";
        }
    }
    // Your code here...
})();