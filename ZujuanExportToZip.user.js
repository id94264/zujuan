// ==UserScript==
// @name         组卷网试题导出为JSON+ZIP
// @namespace    http://violentmonkey.net/
// @version      2.5
// @description  增强适应性，支持多种页面结构，将试题内容和图片打包为ZIP下载(代码由AI书写)
// @author       id94264+腾讯元宝
// @match        https://zujuan.xkw.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @updateURL     https://github.com/id94264/zujuan/releases/latest/download/ZujuanExportToZip.user.js
// @downloadURL   https://github.com/id94264/zujuan/releases/latest/download/ZujuanExportToZip.user.js
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const buttonStyle = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        padding: 12px 24px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-size: 14px;
        transition: 0.3s;
    `;

    // 需要排除的类名列表
    const EXCLUDE_CLASSES = [
        'info-list',
        'add-sec-ques',
        'exam-analyze',
        'ques-additional',
        'exam-item__opt',
        'exam-item__info',
        'ctrl-box',
        'info-msgs',
        'tool-box',
        'answer-box',
        'method-list',
        'jieti-btn'
    ];

    // 获取文件扩展名
    function getFileExt(url) {
        return (url.match(/\.([a-z0-9]+)(?:[?#]|$)/i) || [, 'jpg'])[1].toLowerCase();
    }

    // 检查节点是否需要排除
    function shouldExcludeNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;

        // 检查类名是否在排除列表中
        for (const className of EXCLUDE_CLASSES) {
            if (node.classList.contains(className)) {
                return true;
            }
        }

        // 检查父节点是否在排除列表中
        let parent = node.parentElement;
        while (parent) {
            for (const className of EXCLUDE_CLASSES) {
                if (parent.classList.contains(className)) {
                    return true;
                }
            }
            parent = parent.parentElement;
        }

        return false;
    }

    // 处理节点内容
    function processNode(node, isOptionContext = false) {
        // 跳过隐藏节点或不需要的节点
        if (node.nodeType === Node.ELEMENT_NODE && (
            node.hidden ||
            node.style.display === 'none' ||
            shouldExcludeNode(node)
        )) return null;

        // 处理文本节点
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            return text || null;
        }

        // 处理图片
        if (node.tagName === 'IMG') {
            return {
                type: 'image',
                src: node.src,
                alt: node.alt || '',
                width: node.width,
                height: node.height
            };
        }

        // 处理填空
        if (node.tagName === 'BK') {
            return '________';
        }

        // 处理选项表格
        if (node.tagName === 'TABLE' && (
            node.getAttribute('name') === 'optionsTable' ||
            node.classList.contains('ques-option') ||
            node.querySelector('td[class*="option"]')
        )) {
            const options = [];
            const cells = node.querySelectorAll('td');
            cells.forEach(cell => {
                const optionParts = [];
                Array.from(cell.childNodes).forEach(child => {
                    const processed = processNode(child, true);
                    if (processed) optionParts.push(processed);
                });
                if (optionParts.length > 0) {
                    options.push(optionParts.length === 1 ? optionParts[0] : optionParts);
                }
            });
            return { type: 'options', content: options };
        }

        // 处理普通表格
        if (node.tagName === 'TABLE') {
            const tableData = [];
            const rows = node.querySelectorAll('tr');
            rows.forEach(row => {
                const rowData = [];
                row.querySelectorAll('td, th').forEach(cell => {
                    const cellContent = [];
                    Array.from(cell.childNodes).forEach(child => {
                        const processed = processNode(child);
                        if (processed) cellContent.push(processed);
                    });
                    rowData.push(cellContent);
                });
                tableData.push(rowData);
            });
            return { type: 'table', content: tableData };
        }

        // 处理数学公式
        if (node.tagName === 'SPAN' && node.classList.contains('math-tex')) {
            return {
                type: 'formula',
                content: node.textContent.trim()
            };
        }

        // 处理公式图片
        if (node.tagName === 'IMG' && node.src.includes('formula')) {
            return {
                type: 'formula',
                src: node.src
            };
        }

        // 处理子节点
        let currentText = '';
        const children = [];

        node.childNodes.forEach(child => {
            const processed = processNode(child, isOptionContext);
            if (!processed) return;

            if (typeof processed === 'string') {
                currentText += processed;
            } else {
                if (currentText) {
                    children.push(currentText);
                    currentText = '';
                }
                children.push(processed);
            }
        });

        if (currentText) children.push(currentText);

        // 处理内联元素
        const inlineElements = ['SPAN', 'DIV', 'P', 'I', 'B', 'STRONG', 'EM'];
        if (inlineElements.includes(node.tagName) && !isOptionContext) {
            return children.length > 0 ? children : null;
        }

        return children.length > 0 ? children : null;
    }

    // 处理图片数据
    async function processImages(data) {
        const imageMap = new Map();
        let imgIndex = 0;

        // 收集所有图片URL
        function collectUrls(obj) {
            if (Array.isArray(obj)) {
                obj.forEach(collectUrls);
            } else if (obj && typeof obj === 'object') {
                if (obj.type === 'image' || (obj.type === 'formula' && obj.src)) {
                    const url = new URL(obj.src, location.href).href;
                    const ext = obj.type === 'formula' ? 'svg' : getFileExt(url);
                    imageMap.set(url, `img_${imgIndex++}.${ext}`);
                }
                Object.values(obj).forEach(collectUrls);
            }
        }

        // 替换图片路径
        function replacePaths(obj) {
            if (Array.isArray(obj)) {
                return obj.map(replacePaths);
            }
            if (obj && typeof obj === 'object') {
                if (obj.type === 'image' || (obj.type === 'formula' && obj.src)) {
                    const url = new URL(obj.src, location.href).href;
                    return {
                        ...obj,
                        src: `images/${imageMap.get(url)}`
                    };
                }
                return Object.fromEntries(
                    Object.entries(obj).map(([k, v]) => [k, replacePaths(v)])
                );
            }
            return obj;
        }

        collectUrls(data);
        return {
            data: replacePaths(data),
            images: Array.from(imageMap.entries())
        };
    }

    // 下载所有图片
    async function downloadAllImages(images) {
        const zip = new JSZip();
        const imgFolder = zip.folder('images');

        await Promise.all(images.map(async ([url, filename]) => {
            try {
                const blob = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: url,
                        responseType: "blob",
                        onload: r => resolve(r.response),
                        onerror: reject
                    });
                });
                imgFolder.file(filename, blob);
            } catch {
                console.warn('图片下载失败:', url);
            }
        }));

        return zip;
    }

    // 查找试题内容容器
    function findExamContainer() {
        // 尝试多种可能的容器选择器
        const possibleContainers = [
            'main.page.exam-detail article.exam-cnt',
            'main.page article.exam-cnt',
            'article.exam-cnt',
            'section.paper-cnt',
            'section.paper',
            '.paper-cnt',
            '.paper'
        ];

        for (const selector of possibleContainers) {
            const container = document.querySelector(selector);
            if (container) return container;
        }

        // 如果标准选择器找不到，尝试更通用的方法
        const candidates = document.querySelectorAll('main, article, section');
        for (const el of candidates) {
            if (el.querySelector('.exam-title, .sec-title, .tk-quest-item')) {
                return el;
            }
        }

        throw new Error('找不到试题内容容器');
    }

    // 查找试题部分
    function findSections(container) {
        // 尝试多种可能的章节选择器
        const sectionSelectors = [
            '.sec-item',
            '.type-group-item',
            '.exam-list',
            '.quesroot',
            '.question-item'
        ];

        for (const selector of sectionSelectors) {
            const sections = container.querySelectorAll(selector);
            if (sections.length > 0) return sections;
        }

        // 如果找不到标准章节，尝试直接查找问题
        const questions = container.querySelectorAll('.tk-quest-item, .quesroot, .question-item');
        if (questions.length > 0) {
            return [container]; // 将整个容器作为单个章节处理
        }

        throw new Error('找不到试题章节');
    }

    // 查找试题标题
    function findSectionTitle(section) {
        return section.querySelector('.sec-title, .type-name, .question-title')?.textContent.trim() ||
               section.querySelector('h2, h3, h4')?.textContent.trim() ||
               '未命名章节';
    }

    // 查找试题内容
    function findQuestions(section) {
        const questionSelectors = [
            '.tk-quest-item',
            '.quesroot',
            '.question-item',
            '.exam-item'
        ];

        for (const selector of questionSelectors) {
            const questions = section.querySelectorAll(selector);
            if (questions.length > 0) return questions;
        }

        // 如果找不到标准问题元素，尝试查找包含试题内容的元素
        const candidates = section.querySelectorAll('div, li');
        const questions = [];

        candidates.forEach(el => {
            if (el.textContent.trim().length > 50 &&
                !shouldExcludeNode(el)) {
                questions.push(el);
            }
        });

        return questions;
    }

    // 查找问题内容节点
    function findQuestionContent(question) {
        const contentSelectors = [
            '.exam-item__cnt',
            '.ques-content',
            '.question-content',
            '.quesdiv',
            '.question-text'
        ];

        for (const selector of contentSelectors) {
            const content = question.querySelector(selector);
            if (content) return content;
        }

        // 如果找不到标准内容节点，尝试直接使用问题元素
        return question;
    }

    // 导出为ZIP文件
    async function exportToZip() {
        try {
            const container = findExamContainer();
            const examTitle = container.querySelector('.exam-title .title-txt, h1, h2')?.textContent.trim() || '未命名试卷';

            const examData = {
                title: examTitle,
                sections: []
            };

            const sections = findSections(container);
            sections.forEach(section => {
                const sectionData = {
                    title: findSectionTitle(section),
                    questions: []
                };

                const questions = findQuestions(section);
                questions.forEach(question => {
                    const contentNode = findQuestionContent(question);
                    const content = processNode(contentNode);

                    if (content) {
                        sectionData.questions.push({
                            id: question.getAttribute('questionid') || question.id || Date.now(),
                            content: content
                        });
                    }
                });

                if (sectionData.questions.length > 0) {
                    examData.sections.push(sectionData);
                }
            });

            if (examData.sections.length === 0) {
                throw new Error('没有找到有效的试题内容');
            }

            const { data: processedData, images } = await processImages(examData);
            const zip = await downloadAllImages(images);
            zip.file('data.json', JSON.stringify(processedData, null, 2));

            // 添加README文件说明结构
            zip.file('README.txt', `本ZIP文件包含导出的试题数据:
- data.json: 试题内容(JSON格式)
- images/: 所有试题图片

JSON结构说明:
{
  "title": "试卷标题",
  "sections": [
    {
      "title": "章节标题",
      "questions": [
        {
          "id": "问题ID",
          "content": "问题内容(可能包含文本、图片、选项等)"
        }
      ]
    }
  ]
}`);

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);

            GM_download({
                url: url,
                name: `zujuan-export-${Date.now()}.zip`,
                onload: () => URL.revokeObjectURL(url)
            });

            alert('导出成功！文件开始下载');
        } catch (err) {
            alert(`导出失败：${err.message}`);
            console.error(err);
        }
    }

    // 添加导出按钮
    function addButton() {
        // 移除已存在的按钮
        const oldBtn = document.querySelector('#zujuan-export-btn');
        if (oldBtn) oldBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'zujuan-export-btn';
        btn.textContent = '📦 导出ZIP';
        btn.style.cssText = buttonStyle;
        btn.onclick = exportToZip;

        // 添加悬停效果
        btn.addEventListener('mouseover', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });

        btn.addEventListener('mouseout', () => {
            btn.style.transform = 'none';
            btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        });

        document.body.appendChild(btn);
    }

    // 初始化
    function init() {
        // 延迟执行以确保页面完全加载
        setTimeout(addButton, 1000);

        // 监听DOM变化，防止SPA页面动态加载
        const observer = new MutationObserver(() => {
            if (!document.querySelector('#zujuan-export-btn')) {
                addButton();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
