// ==UserScript==
// @name        网页元素修改工具
// @namespace   Tampermonkey Scripts
// @match       https://zujuan.xkw.com/*
// @match       https://service.banjixiaoguanjia.com/appweb/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_registerMenuCommand
// @grant       GM_download
// @icon
// @version     2.0
// @author      AI & id94264
// @description 允许隐藏和修改网页元素，支持批量编辑和默认修改样式
// @updateURL     https://github.com/id94264/zujuan/raw/main/PageElementTweaking.user.js
// @downloadURL   https://github.com/id94264/zujuan/raw/main/PageElementTweaking.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 存储修改的数据键名
    const STORAGE_KEY = 'element_modifications';
    const STYLE_STORAGE_KEY = 'element_style_modifications';
    const DEFAULT_MODIFICATIONS_KEY = 'default_element_modifications';
    const PAUSE_STATE_KEY = 'modifications_paused'; // 新增：暂停状态存储键

    // 获取当前页面的唯一标识
    function getPageId() {
        return window.location.hostname + window.location.pathname;
    }

    // 获取当前页面的隐藏元素数据
    function getModifications() {
        const pageId = getPageId();
        const allModifications = GM_getValue(STORAGE_KEY, {});
        return allModifications[pageId] || [];
    }

    // 获取当前页面的样式修改数据
    function getStyleModifications() {
        const pageId = getPageId();
        const allModifications = GM_getValue(STYLE_STORAGE_KEY, {});
        return allModifications[pageId] || {};
    }

    // 获取暂停状态
    function getPauseState() {
        return GM_getValue(PAUSE_STATE_KEY, false);
    }

    // 保存隐藏元素数据
    function saveModifications(modifications) {
        const pageId = getPageId();
        const allModifications = GM_getValue(STORAGE_KEY, {});
        allModifications[pageId] = modifications;
        GM_setValue(STORAGE_KEY, allModifications);
    }

    // 保存样式修改数据
    function saveStyleModifications(modifications) {
        const pageId = getPageId();
        const allModifications = GM_getValue(STYLE_STORAGE_KEY, {});
        allModifications[pageId] = modifications;
        GM_setValue(STYLE_STORAGE_KEY, allModifications);
    }

    // 添加隐藏元素修改
    function addModification(selector) {
        // 检查是否尝试隐藏html或body元素
        const lowerSelector = selector.toLowerCase();
        if (lowerSelector === 'html' || lowerSelector === 'body') {
            alert('不能直接隐藏html或body元素！');
            return false;
        }

        const modifications = getModifications();
        if (!modifications.includes(selector)) {
            modifications.push(selector);
            saveModifications(modifications);
            return true;
        }
        return false;
    }

    // 删除隐藏元素修改
    function removeModification(selector) {
        const modifications = getModifications();
        const index = modifications.indexOf(selector);
        if (index !== -1) {
            modifications.splice(index, 1);
            saveModifications(modifications);
        }
    }

    // 添加样式修改
    function addStyleModification(selector, styles) {
        // 检查是否尝试修改html或body元素的display属性为none
        const lowerSelector = selector.toLowerCase();
        if ((lowerSelector === 'html' || lowerSelector === 'body') && styles.display === 'none') {
            alert('不能通过样式修改隐藏html或body元素！');
            return false;
        }

        const modifications = getStyleModifications();
        const currentStyles = modifications[selector] || {};
        const newStyles = {...currentStyles};

        // 只保留实际有值的样式属性
        Object.keys(styles).forEach(key => {
            if (styles[key] && styles[key] !== '') {
                newStyles[key] = styles[key];
            } else {
                delete newStyles[key];
            }
        });

        modifications[selector] = newStyles;
        saveStyleModifications(modifications);
        return true;
    }

    // 删除样式修改
    function removeStyleModification(selector) {
        const modifications = getStyleModifications();
        delete modifications[selector];
        saveStyleModifications(modifications);
    }

    // 应用所有隐藏元素修改
    function applyModifications() {
        // 如果修改被暂停，则不应用
        if (getPauseState()) return;

        const modifications = getModifications();
        modifications.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.display = 'none';
                });
            } catch (e) {
                console.error('应用隐藏修改失败:', e);
            }
        });
    }

    // 应用所有样式修改
    function applyStyleModifications() {
        // 如果修改被暂停，则不应用
        if (getPauseState()) return;

        const modifications = getStyleModifications();
        Object.keys(modifications).forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                const styles = modifications[selector];
                elements.forEach(el => {
                    // 只应用已修改的样式属性
                    Object.keys(styles).forEach(prop => {
                        el.style[prop] = styles[prop];
                    });
                });
            } catch (e) {
                console.error('应用样式修改失败:', e);
            }
        });
    }

    // 检查并应用默认修改
    function checkAndApplyDefaultModifications() {
        const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
        const pageUrl = window.location.href;
        const pageId = getPageId();

        // 检查是否有匹配的默认修改
        for (const [pattern, mods] of Object.entries(defaultMods)) {
            try {
                const regex = new RegExp(pattern);
                if (regex.test(pageUrl)) {
                    // 应用匹配的默认修改
                    const allHideModifications = GM_getValue(STORAGE_KEY, {});
                    const allStyleModifications = GM_getValue(STYLE_STORAGE_KEY, {});

                    // 如果当前页面还没有修改记录，则应用默认修改
                    if (!allHideModifications[pageId] && mods.hideModifications) {
                        allHideModifications[pageId] = mods.hideModifications;
                        GM_setValue(STORAGE_KEY, allHideModifications);
                    }

                    if (!allStyleModifications[pageId] && mods.styleModifications) {
                        allStyleModifications[pageId] = mods.styleModifications;
                        GM_setValue(STYLE_STORAGE_KEY, allStyleModifications);
                    }

                    // 应用修改
                    applyModifications();
                    applyStyleModifications();
                    break;
                }
            } catch (e) {
                console.error('应用默认修改失败:', e);
            }
        }
    }

    // 显示管理窗口
    function showManagementWindow() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '50px';
        panel.style.right = '10px';
        panel.style.zIndex = '999999';
        panel.style.backgroundColor = 'white';
        panel.style.padding = '10px';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '5px';
        panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
        panel.style.fontFamily = 'Arial, sans-serif';
        panel.style.maxHeight = '80vh';
        panel.style.overflow = 'hidden';
        panel.style.width = '400px';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';

        closeButton.addEventListener('click', () => {
            document.body.removeChild(panel);
        });
        panel.appendChild(closeButton);

        // 创建标签页容器（固定部分）
        const tabContainer = document.createElement('div');
        tabContainer.style.display = 'flex';
        tabContainer.style.marginBottom = '10px';
        tabContainer.style.borderBottom = '1px solid #ddd';
        tabContainer.style.flexShrink = '0';

        const hideTab = document.createElement('button');
        hideTab.textContent = '隐藏元素';
        hideTab.style.padding = '5px 10px';
        hideTab.style.marginRight = '5px';
        hideTab.style.cursor = 'pointer';
        hideTab.style.border = 'none';
        hideTab.style.backgroundColor = '#f0f0f0';

        const styleTab = document.createElement('button');
        styleTab.textContent = '样式修改';
        styleTab.style.padding = '5px 10px';
        styleTab.style.cursor = 'pointer';
        styleTab.style.border = 'none';
        styleTab.style.backgroundColor = 'transparent';

        const importExportTab = document.createElement('button');
        importExportTab.textContent = '导入/导出';
        importExportTab.style.padding = '5px 10px';
        importExportTab.style.cursor = 'pointer';
        importExportTab.style.border = 'none';
        importExportTab.style.backgroundColor = 'transparent';

        const defaultModsTab = document.createElement('button');
        defaultModsTab.textContent = '默认修改';
        defaultModsTab.style.padding = '5px 10px';
        defaultModsTab.style.cursor = 'pointer';
        defaultModsTab.style.border = 'none';
        defaultModsTab.style.backgroundColor = 'transparent';

        tabContainer.appendChild(hideTab);
        tabContainer.appendChild(styleTab);
        tabContainer.appendChild(importExportTab);
        tabContainer.appendChild(defaultModsTab);
        panel.appendChild(tabContainer);

        // 创建内容容器（可滚动部分）
        const contentContainer = document.createElement('div');
        contentContainer.style.overflowY = 'auto';
        contentContainer.style.flexGrow = '1';
        panel.appendChild(contentContainer);

        document.body.appendChild(panel);

        // 更新隐藏元素列表
        function updateHideList() {
            contentContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '已隐藏的元素';
            title.style.margin = '0 0 10px 0';
            title.style.fontSize = '16px';
            contentContainer.appendChild(title);

            // 添加批量编辑按钮
            const bulkEditButton = document.createElement('button');
            bulkEditButton.textContent = '批量编辑';
            bulkEditButton.style.padding = '5px 10px';
            bulkEditButton.style.marginBottom = '10px';
            bulkEditButton.style.cursor = 'pointer';
            bulkEditButton.style.backgroundColor = '#4CAF50';
            bulkEditButton.style.color = 'white';
            bulkEditButton.style.border = 'none';
            bulkEditButton.style.borderRadius = '3px';

            bulkEditButton.addEventListener('click', () => {
                const modifications = getModifications();
                const bulkEditPanel = document.createElement('div');
                bulkEditPanel.style.position = 'fixed';
                bulkEditPanel.style.top = '50%';
                bulkEditPanel.style.left = '50%';
                bulkEditPanel.style.transform = 'translate(-50%, -50%)';
                bulkEditPanel.style.zIndex = '999999';
                bulkEditPanel.style.backgroundColor = 'white';
                bulkEditPanel.style.padding = '15px';
                bulkEditPanel.style.border = '1px solid #ccc';
                bulkEditPanel.style.borderRadius = '5px';
                bulkEditPanel.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
                bulkEditPanel.style.width = '500px';
                bulkEditPanel.style.maxHeight = '80vh';
                bulkEditPanel.style.display = 'flex';
                bulkEditPanel.style.flexDirection = 'column';

                const bulkTitle = document.createElement('h3');
                bulkTitle.textContent = '批量编辑隐藏元素';
                bulkTitle.style.margin = '0 0 15px 0';
                bulkEditPanel.appendChild(bulkTitle);

                const bulkTextarea = document.createElement('textarea');
                bulkTextarea.style.width = '100%';
                bulkTextarea.style.height = '300px';
                bulkTextarea.style.marginBottom = '10px';
                bulkTextarea.style.fontFamily = 'monospace';
                bulkTextarea.style.padding = '5px';
                bulkTextarea.value = JSON.stringify(modifications, null, 2);
                bulkEditPanel.appendChild(bulkTextarea);

                const buttonContainer = document.createElement('div');
                buttonContainer.style.display = 'flex';
                buttonContainer.style.justifyContent = 'space-between';
                bulkEditPanel.appendChild(buttonContainer);

                const cancelButton = document.createElement('button');
                cancelButton.textContent = '取消';
                cancelButton.style.padding = '5px 10px';
                cancelButton.style.cursor = 'pointer';
                cancelButton.addEventListener('click', () => {
                    document.body.removeChild(bulkEditPanel);
                });
                buttonContainer.appendChild(cancelButton);

                const saveButton = document.createElement('button');
                saveButton.textContent = '保存';
                saveButton.style.padding = '5px 10px';
                saveButton.style.cursor = 'pointer';
                saveButton.style.backgroundColor = '#4CAF50';
                saveButton.style.color = 'white';
                saveButton.style.border = 'none';
                saveButton.addEventListener('click', () => {
                    try {
                        const newModifications = JSON.parse(bulkTextarea.value);
                        if (Array.isArray(newModifications)) {
                            // 验证所有选择器
                            let hasInvalid = false;
                            for (const selector of newModifications) {
                                if (selector.toLowerCase() === 'html' || selector.toLowerCase() === 'body') {
                                    hasInvalid = true;
                                    break;
                                }
                            }

                            if (hasInvalid) {
                                alert('不能直接隐藏html或body元素！');
                                return;
                            }

                            saveModifications(newModifications);
                            applyModifications();
                            document.body.removeChild(bulkEditPanel);
                            updateHideList();
                        } else {
                            alert('必须输入一个数组！');
                        }
                    } catch (e) {
                        alert('JSON格式错误: ' + e.message);
                    }
                });
                buttonContainer.appendChild(saveButton);

                document.body.appendChild(bulkEditPanel);
            });

            contentContainer.appendChild(bulkEditButton);

            // 添加手动输入框
            const addContainer = document.createElement('div');
            addContainer.style.display = 'flex';
            addContainer.style.marginBottom = '15px';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入CSS选择器...';
            input.style.flex = '1';
            input.style.padding = '5px';
            input.style.marginRight = '5px';

            const addButton = document.createElement('button');
            addButton.textContent = '添加';
            addButton.style.padding = '5px 10px';
            addButton.style.cursor = 'pointer';

            addButton.addEventListener('click', () => {
                const selector = input.value.trim();
                if (selector) {
                    if (addModification(selector)) {
                        // 尝试应用修改
                        try {
                            const elements = document.querySelectorAll(selector);
                            if (elements.length > 0) {
                                elements.forEach(el => {
                                    el.style.display = 'none';
                                });
                                input.value = '';
                                updateHideList();
                            } else {
                                alert('没有找到匹配的元素！');
                            }
                        } catch (e) {
                            alert('无效的选择器: ' + e.message);
                        }
                    }
                }
            });

            addContainer.appendChild(input);
            addContainer.appendChild(addButton);
            contentContainer.appendChild(addContainer);

            const modifications = getModifications();

            if (modifications.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '没有已保存的隐藏元素';
                emptyMsg.style.margin = '0';
                emptyMsg.style.fontSize = '12px';
                emptyMsg.style.color = '#666';
                contentContainer.appendChild(emptyMsg);
                return;
            }

            modifications.forEach((selector, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.marginBottom = '5px';
                item.style.fontSize = '12px';

                const selectorText = document.createElement('span');
                selectorText.textContent = `${index + 1}. ${selector}`;
                selectorText.style.overflow = 'hidden';
                selectorText.style.textOverflow = 'ellipsis';
                selectorText.style.whiteSpace = 'nowrap';
                selectorText.style.maxWidth = '200px';

                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';

                // 修复：添加editButton的定义
                const editButton = document.createElement('button');
                editButton.textContent = '编辑';
                editButton.style.padding = '2px 5px';
                editButton.style.fontSize = '11px';
                editButton.style.cursor = 'pointer';
                editButton.style.marginRight = '5px';

                editButton.addEventListener('click', () => {
                    const newSelector = prompt('编辑选择器:', selector);
                    if (newSelector && newSelector.trim()) {
                     const newSelectorTrimmed = newSelector.trim();
                        // 检查新选择器是否有效
                        try {
                            document.querySelectorAll(newSelectorTrimmed);
                            // 先删除旧的
                            removeModification(selector);
                            // 添加新的
                            if (addModification(newSelectorTrimmed)) {
                        applyModifications();
                        updateHideList();
                    }
                } catch (e) {
                    alert('无效的选择器: ' + e.message);
                }
            }
        });

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '删除';
                deleteButton.style.padding = '2px 5px';
                deleteButton.style.fontSize = '11px';
                deleteButton.style.cursor = 'pointer';

                deleteButton.addEventListener('click', () => {
                    removeModification(selector);
                    applyModifications();
                    updateHideList();
                });

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(deleteButton);

                item.appendChild(selectorText);
                item.appendChild(buttonsContainer);
                contentContainer.appendChild(item);
            });
        }

        // 更新样式修改列表
        function updateStyleList() {
            contentContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '已修改样式的元素';
            title.style.margin = '0 0 10px 0';
            title.style.fontSize = '16px';
            contentContainer.appendChild(title);

            // 添加批量编辑按钮
            const bulkEditButton = document.createElement('button');
            bulkEditButton.textContent = '批量编辑';
            bulkEditButton.style.padding = '5px 10px';
            bulkEditButton.style.marginBottom = '10px';
            bulkEditButton.style.cursor = 'pointer';
            bulkEditButton.style.backgroundColor = '#4CAF50';
            bulkEditButton.style.color = 'white';
            bulkEditButton.style.border = 'none';
            bulkEditButton.style.borderRadius = '3px';

            bulkEditButton.addEventListener('click', () => {
                const modifications = getStyleModifications();
                const bulkEditPanel = document.createElement('div');
                bulkEditPanel.style.position = 'fixed';
                bulkEditPanel.style.top = '50%';
                bulkEditPanel.style.left = '50%';
                bulkEditPanel.style.transform = 'translate(-50%, -50%)';
                bulkEditPanel.style.zIndex = '999999';
                bulkEditPanel.style.backgroundColor = 'white';
                bulkEditPanel.style.padding = '15px';
                bulkEditPanel.style.border = '1px solid #ccc';
                bulkEditPanel.style.borderRadius = '5px';
                bulkEditPanel.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
                bulkEditPanel.style.width = '500px';
                bulkEditPanel.style.maxHeight = '80vh';
                bulkEditPanel.style.display = 'flex';
                bulkEditPanel.style.flexDirection = 'column';

                const bulkTitle = document.createElement('h3');
                bulkTitle.textContent = '批量编辑样式修改';
                bulkTitle.style.margin = '0 0 15px 0';
                bulkEditPanel.appendChild(bulkTitle);

                const bulkTextarea = document.createElement('textarea');
                bulkTextarea.style.width = '100%';
                bulkTextarea.style.height = '300px';
                bulkTextarea.style.marginBottom = '10px';
                bulkTextarea.style.fontFamily = 'monospace';
                bulkTextarea.style.padding = '5px';
                bulkTextarea.value = JSON.stringify(modifications, null, 2);
                bulkEditPanel.appendChild(bulkTextarea);

                const buttonContainer = document.createElement('div');
                buttonContainer.style.display = 'flex';
                buttonContainer.style.justifyContent = 'space-between';
                bulkEditPanel.appendChild(buttonContainer);

                const cancelButton = document.createElement('button');
                cancelButton.textContent = '取消';
                cancelButton.style.padding = '5px 10px';
                cancelButton.style.cursor = 'pointer';
                cancelButton.addEventListener('click', () => {
                    document.body.removeChild(bulkEditPanel);
                });
                buttonContainer.appendChild(cancelButton);

                const saveButton = document.createElement('button');
                saveButton.textContent = '保存';
                saveButton.style.padding = '5px 10px';
                saveButton.style.cursor = 'pointer';
                saveButton.style.backgroundColor = '#4CAF50';
                saveButton.style.color = 'white';
                saveButton.style.border = 'none';
                saveButton.addEventListener('click', () => {
                    try {
                        const newModifications = JSON.parse(bulkTextarea.value);
                        if (typeof newModifications === 'object' && newModifications !== null) {
                            // 验证所有选择器
                            let hasInvalid = false;
                            for (const selector in newModifications) {
                                if (selector.toLowerCase() === 'html' || selector.toLowerCase() === 'body') {
                                    const styles = newModifications[selector];
                                    if (styles.display === 'none') {
                                        hasInvalid = true;
                                        break;
                                    }
                                }
                            }

                            if (hasInvalid) {
                                alert('不能通过样式修改隐藏html或body元素！');
                                return;
                            }

                            saveStyleModifications(newModifications);
                            applyStyleModifications();
                            document.body.removeChild(bulkEditPanel);
                            updateStyleList();
                        } else {
                            alert('必须输入一个对象！');
                        }
                    } catch (e) {
                        alert('JSON格式错误: ' + e.message);
                    }
                });
                buttonContainer.appendChild(saveButton);

                document.body.appendChild(bulkEditPanel);
            });

            contentContainer.appendChild(bulkEditButton);

            // 添加手动输入框
            const addContainer = document.createElement('div');
            addContainer.style.display = 'flex';
            addContainer.style.flexDirection = 'column';
            addContainer.style.marginBottom = '15px';

            const selectorInput = document.createElement('input');
            selectorInput.type = 'text';
            selectorInput.placeholder = '输入CSS选择器...';
            selectorInput.style.padding = '5px';
            selectorInput.style.marginBottom = '5px';

            const stylesInput = document.createElement('textarea');
            stylesInput.placeholder = '输入JSON格式的样式，如: {"color":"red","font-size":"16px"}';
            stylesInput.style.padding = '5px';
            stylesInput.style.marginBottom = '5px';
            stylesInput.style.height = '60px';
            stylesInput.style.resize = 'vertical';

            const addButton = document.createElement('button');
            addButton.textContent = '添加';
            addButton.style.padding = '5px 10px';
            addButton.style.cursor = 'pointer';
            addButton.style.alignSelf = 'flex-start';

            addButton.addEventListener('click', () => {
                const selector = selectorInput.value.trim();
                const stylesText = stylesInput.value.trim();

                if (selector && stylesText) {
                    try {
                        const styles = JSON.parse(stylesText);
                        if (addStyleModification(selector, styles)) {
                            // 尝试应用修改
                            try {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    elements.forEach(el => {
                                        Object.keys(styles).forEach(prop => {
                                            el.style[prop] = styles[prop];
                                        });
                                    });
                                    selectorInput.value = '';
                                    stylesInput.value = '';
                                    updateStyleList();
                                } else {
                                    alert('没有找到匹配的元素！');
                                }
                            } catch (e) {
                                alert('应用样式时出错: ' + e.message);
                            }
                        }
                    } catch (e) {
                        alert('无效的JSON格式: ' + e.message);
                    }
                }
            });

            addContainer.appendChild(selectorInput);
            addContainer.appendChild(stylesInput);
            addContainer.appendChild(addButton);
            contentContainer.appendChild(addContainer);

            const modifications = getStyleModifications();
            const selectors = Object.keys(modifications);

            if (selectors.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '没有已保存的样式修改';
                emptyMsg.style.margin = '0';
                emptyMsg.style.fontSize = '12px';
                emptyMsg.style.color = '#666';
                contentContainer.appendChild(emptyMsg);
                return;
            }

            selectors.forEach((selector, index) => {
                const item = document.createElement('div');
                item.style.marginBottom = '10px';
                item.style.fontSize = '12px';

                const selectorText = document.createElement('div');
                selectorText.textContent = `${index + 1}. ${selector}`;
                selectorText.style.marginBottom = '5px';
                selectorText.style.fontWeight = 'bold';

                const styles = modifications[selector];
                const styleText = document.createElement('div');
                styleText.textContent = JSON.stringify(styles, null, 2);
                styleText.style.marginBottom = '5px';
                styleText.style.whiteSpace = 'pre-wrap';
                styleText.style.fontFamily = 'monospace';
                styleText.style.fontSize = '11px';
                styleText.style.backgroundColor = '#f5f5f5';
                styleText.style.padding = '5px';
                styleText.style.borderRadius = '3px';

                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';

                const editButton = document.createElement('button');
                editButton.textContent = '编辑';
                editButton.style.padding = '2px 5px';
                editButton.style.fontSize = '11px';
                editButton.style.cursor = 'pointer';
                editButton.style.marginRight = '5px';

                editButton.addEventListener('click', () => {
                    const newStyles = prompt('编辑样式 (JSON格式):', JSON.stringify(styles, null, 2));
                    if (newStyles) {
                        try {
                            const parsedStyles = JSON.parse(newStyles);
                            if (addStyleModification(selector, parsedStyles)) {
                                applyStyleModifications();
                                updateStyleList();
                            }
                        } catch (e) {
                            alert('无效的JSON格式: ' + e.message);
                        }
                    }
                });

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '删除';
                deleteButton.style.padding = '2px 5px';
                deleteButton.style.fontSize = '11px';
                deleteButton.style.cursor = 'pointer';

                deleteButton.addEventListener('click', () => {
                    removeStyleModification(selector);
                    applyStyleModifications();
                    updateStyleList();
                });

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(deleteButton);

                item.appendChild(selectorText);
                item.appendChild(styleText);
                item.appendChild(buttonsContainer);
                contentContainer.appendChild(item);
            });
        }

        // 显示导入导出界面
        function showImportExport() {
            contentContainer.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '导入/导出修改';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            contentContainer.appendChild(title);

            // 导出部分
            const exportSection = document.createElement('div');
            exportSection.style.marginBottom = '20px';

            const exportTitle = document.createElement('h4');
            exportTitle.textContent = '导出当前页面的修改';
            exportTitle.style.margin = '0 0 10px 0';
            exportTitle.style.fontSize = '14px';
            exportSection.appendChild(exportTitle);

            const exportButton = document.createElement('button');
            exportButton.textContent = '导出修改';
            exportButton.style.padding = '5px 10px';
            exportButton.style.cursor = 'pointer';
            exportButton.style.backgroundColor = '#4CAF50';
            exportButton.style.color = 'white';
            exportButton.style.border = 'none';
            exportButton.style.borderRadius = '3px';

exportButton.addEventListener('click', () => {
    const pageId = getPageId();
    const data = {
        type: 'page_modifications',  // 明确标记为页面修改
        hideModifications: getModifications(),
        styleModifications: getStyleModifications(),
        pageUrl: window.location.href
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    GM_download({
        url: url,
        name: `element_modifications_${pageId.replace(/[^a-z0-9]/gi, '_')}.json`,
        saveAs: true,
        onload: () => URL.revokeObjectURL(url)
    });
});

            exportSection.appendChild(exportButton);
            contentContainer.appendChild(exportSection);

            // 导入部分
            const importSection = document.createElement('div');

            const importTitle = document.createElement('h4');
            importTitle.textContent = '导入修改到当前页面';
            importTitle.style.margin = '0 0 10px 0';
            importTitle.style.fontSize = '14px';
            importSection.appendChild(importTitle);

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.marginBottom = '10px';

            const importButton = document.createElement('button');
            importButton.textContent = '导入修改';
            importButton.style.padding = '5px 10px';
            importButton.style.cursor = 'pointer';
            importButton.style.backgroundColor = '#2196F3';
            importButton.style.color = 'white';
            importButton.style.border = 'none';
            importButton.style.borderRadius = '3px';
            importButton.style.marginLeft = '10px';

            importButton.addEventListener('click', () => {
                if (fileInput.files.length === 0) {
                    alert('请先选择要导入的文件');
                    return;
                }

                const file = fileInput.files[0];
                const reader = new FileReader();

                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);

                        if (!data.hideModifications || !data.styleModifications) {
                            throw new Error('无效的导入文件格式');
                        }

                        // 确认导入
                        if (confirm(`确定要导入${data.pageUrl || '未知页面'}的修改到当前页面吗？`)) {
                            // 保存修改
                            const pageId = getPageId();
                            const allHideModifications = GM_getValue(STORAGE_KEY, {});
                            allHideModifications[pageId] = data.hideModifications;
                            GM_setValue(STORAGE_KEY, allHideModifications);

                            const allStyleModifications = GM_getValue(STYLE_STORAGE_KEY, {});
                            allStyleModifications[pageId] = data.styleModifications;
                            GM_setValue(STYLE_STORAGE_KEY, allStyleModifications);

                            // 应用修改
                            applyModifications();
                            applyStyleModifications();

                            // 更新显示
                            if (hideTab.style.backgroundColor === '#f0f0f0') {
                                updateHideList();
                            } else {
                                updateStyleList();
                            }

                            alert('导入成功！');
                        }
                    } catch (e) {
                        alert('导入失败: ' + e.message);
                    }
                };

                reader.readAsText(file);
            });

            const importContainer = document.createElement('div');
            importContainer.style.display = 'flex';
            importContainer.style.alignItems = 'center';
            importContainer.appendChild(fileInput);
            importContainer.appendChild(importButton);

            importSection.appendChild(importContainer);
            contentContainer.appendChild(importSection);
        }
// 显示默认修改管理界面
function showDefaultModifications() {
    contentContainer.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '默认修改管理';
    title.style.margin = '0 0 15px 0';
    title.style.fontSize = '16px';
    contentContainer.appendChild(title);

    // 添加新的默认修改
    const addSection = document.createElement('div');
    addSection.style.marginBottom = '20px';

    const addTitle = document.createElement('h4');
    addTitle.textContent = '添加/编辑默认修改';
    addTitle.style.margin = '0 0 10px 0';
    addTitle.style.fontSize = '14px';
    addSection.appendChild(addTitle);

    const urlPatternInput = document.createElement('input');
    urlPatternInput.type = 'text';
    urlPatternInput.placeholder = '输入URL模式 (正则表达式)';
    urlPatternInput.style.width = '100%';
    urlPatternInput.style.padding = '5px';
    urlPatternInput.style.marginBottom = '5px';

    const modsTextarea = document.createElement('textarea');
    modsTextarea.placeholder = '输入修改内容 (JSON格式)';
    modsTextarea.style.width = '100%';
    modsTextarea.style.height = '150px';
    modsTextarea.style.padding = '5px';
    modsTextarea.style.marginBottom = '5px';
    modsTextarea.style.resize = 'vertical';

    const addButton = document.createElement('button');
    addButton.textContent = '保存默认修改';
    addButton.style.padding = '5px 10px';
    addButton.style.cursor = 'pointer';
    addButton.style.backgroundColor = '#4CAF50';
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '3px';

    addButton.addEventListener('click', () => {
        const pattern = urlPatternInput.value.trim();
        const modsText = modsTextarea.value.trim();

        if (!pattern) {
            alert('请输入URL模式');
            return;
        }

        if (!modsText) {
            alert('请输入修改内容');
            return;
        }

        try {
            // 测试正则表达式是否有效
            new RegExp(pattern);

            const mods = JSON.parse(modsText);
            if (!mods.hideModifications || !mods.styleModifications) {
                throw new Error('必须包含hideModifications和styleModifications属性');
            }

            const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
            defaultMods[pattern] = mods;
            GM_setValue(DEFAULT_MODIFICATIONS_KEY, defaultMods);

            urlPatternInput.value = '';
            modsTextarea.value = '';
            alert('默认修改已保存！');
            showDefaultModifications();
        } catch (e) {
            alert('错误: ' + e.message);
        }
    });

    addSection.appendChild(urlPatternInput);
    addSection.appendChild(modsTextarea);
    addSection.appendChild(addButton);
    contentContainer.appendChild(addSection);

    // 导入导出部分
    const importExportSection = document.createElement('div');
    importExportSection.style.marginBottom = '20px';

    const importExportTitle = document.createElement('h4');
    importExportTitle.textContent = '导入/导出默认修改';
    importExportTitle.style.margin = '0 0 10px 0';
    importExportTitle.style.fontSize = '14px';
    importExportSection.appendChild(importExportTitle);

    const exportButton = document.createElement('button');
    exportButton.textContent = '导出所有默认修改';
    exportButton.style.padding = '5px 10px';
    exportButton.style.cursor = 'pointer';
    exportButton.style.backgroundColor = '#2196F3';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '3px';
    exportButton.style.marginRight = '10px';

    exportButton.addEventListener('click', () => {
        const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
        if (Object.keys(defaultMods).length === 0) {
            alert('没有可导出的默认修改');
            return;
        }

        const data = {
            type: 'default_modifications',
            modifications: defaultMods,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        GM_download({
            url: url,
            name: `default_element_modifications_${new Date().toISOString().slice(0, 10)}.json`,
            saveAs: true,
            onload: () => URL.revokeObjectURL(url)
        });
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';

    const importButton = document.createElement('button');
    importButton.textContent = '导入默认修改';
    importButton.style.padding = '5px 10px';
    importButton.style.cursor = 'pointer';
    importButton.style.backgroundColor = '#4CAF50';
    importButton.style.color = 'white';
    importButton.style.border = 'none';
    importButton.style.borderRadius = '3px';

    importButton.addEventListener('click', () => {
        fileInput.click();
    });

// 修改文件导入部分的代码
fileInput.addEventListener('change', () => {
    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // 处理导入逻辑 - 现在支持两种格式
            let importedMods = {};

            if (data.type === 'default_modifications' && data.modifications) {
                // 导入整个默认修改集合
                importedMods = data.modifications;
            }
            else if (data.type === 'page_modifications') {
                // 将页面修改转换为默认修改格式
                const pattern = escapeRegExp(window.location.href);
                importedMods[pattern] = {
                    hideModifications: data.hideModifications || [],
                    styleModifications: data.styleModifications || {}
                };
            }
            else {
                // 尝试处理旧格式或无类型标记的文件
                if (typeof data === 'object' && data !== null) {
                    // 假设是默认修改的直接对象
                    importedMods = data;
                } else {
                    throw new Error('无法识别的导入文件格式');
                }
            }

            // 显示导入预览
            const previewPanel = document.createElement('div');
            previewPanel.style.position = 'fixed';
            previewPanel.style.top = '50%';
            previewPanel.style.left = '50%';
            previewPanel.style.transform = 'translate(-50%, -50%)';
            previewPanel.style.zIndex = '999999';
            previewPanel.style.backgroundColor = 'white';
            previewPanel.style.padding = '20px';
            previewPanel.style.border = '1px solid #ccc';
            previewPanel.style.borderRadius = '5px';
            previewPanel.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
            previewPanel.style.width = '600px';
            previewPanel.style.maxHeight = '80vh';
            previewPanel.style.overflow = 'auto';

            const previewTitle = document.createElement('h3');
            previewTitle.textContent = '导入预览';
            previewTitle.style.margin = '0 0 15px 0';
            previewPanel.appendChild(previewTitle);

            // 显示文件类型信息
            const fileTypeInfo = document.createElement('p');
            fileTypeInfo.textContent = `文件类型: ${data.type || '未标记类型'}`;
            fileTypeInfo.style.margin = '0 0 10px 0';
            previewPanel.appendChild(fileTypeInfo);

            // 显示导入的URL模式数量
            const countInfo = document.createElement('p');
            countInfo.textContent = `共导入 ${Object.keys(importedMods).length} 个URL模式的修改`;
            countInfo.style.margin = '0 0 10px 0';
            previewPanel.appendChild(countInfo);

            // 显示导入的修改详情
            const modsContainer = document.createElement('div');
            modsContainer.style.maxHeight = '400px';
            modsContainer.style.overflow = 'auto';
            modsContainer.style.marginBottom = '15px';
            modsContainer.style.border = '1px solid #eee';
            modsContainer.style.padding = '10px';

            Object.entries(importedMods).forEach(([pattern, mods]) => {
                const patternItem = document.createElement('div');
                patternItem.style.marginBottom = '15px';

                const patternTitle = document.createElement('h4');
                patternTitle.textContent = `URL模式: ${pattern}`;
                patternTitle.style.margin = '0 0 5px 0';
                patternTitle.style.fontSize = '14px';
                patternItem.appendChild(patternTitle);

                const modsContent = document.createElement('pre');
                modsContent.textContent = JSON.stringify(mods, null, 2);
                modsContent.style.margin = '0';
                modsContent.style.whiteSpace = 'pre-wrap';
                modsContent.style.fontSize = '12px';
                modsContent.style.backgroundColor = '#f5f5f5';
                modsContent.style.padding = '5px';
                modsContent.style.borderRadius = '3px';
                patternItem.appendChild(modsContent);

                modsContainer.appendChild(patternItem);
            });

            previewPanel.appendChild(modsContainer);

            // 添加操作按钮
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.padding = '5px 10px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(previewPanel);
            });
            buttonContainer.appendChild(cancelButton);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = '确认导入';
            confirmButton.style.padding = '5px 10px';
            confirmButton.style.cursor = 'pointer';
            confirmButton.style.backgroundColor = '#4CAF50';
            confirmButton.style.color = 'white';
            confirmButton.style.border = 'none';
            confirmButton.addEventListener('click', () => {
                // 合并导入的修改
                const currentMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
                const mergedMods = {...currentMods, ...importedMods};

                GM_setValue(DEFAULT_MODIFICATIONS_KEY, mergedMods);
                document.body.removeChild(previewPanel);
                showDefaultModifications();
                alert('导入成功！');
            });
            buttonContainer.appendChild(confirmButton);

            previewPanel.appendChild(buttonContainer);
            document.body.appendChild(previewPanel);
        } catch (e) {
            alert('导入失败: ' + e.message);
        }
    };

    reader.readAsText(file);
});

// 辅助函数：转义字符串为正则表达式
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.marginBottom = '10px';
    buttonContainer.appendChild(exportButton);
    buttonContainer.appendChild(importButton);

    importExportSection.appendChild(buttonContainer);
    importExportSection.appendChild(fileInput);
    contentContainer.appendChild(importExportSection);

// 显示现有的默认修改
const listSection = document.createElement('div');

    const listTitle = document.createElement('h4');
    listTitle.textContent = '现有的默认修改';
    listTitle.style.margin = '0 0 10px 0';
    listTitle.style.fontSize = '14px';
    listSection.appendChild(listTitle);

    const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
    const patterns = Object.keys(defaultMods);

    if (patterns.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = '没有已保存的默认修改';
        emptyMsg.style.margin = '0';
        emptyMsg.style.fontSize = '12px';
        emptyMsg.style.color = '#666';
        listSection.appendChild(emptyMsg);
    } else {
        // 创建表格容器
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '15px';
        table.style.fontSize = '12px';

        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f5f5f5';

        const headers = ['序号', 'URL模式', '隐藏元素数', '样式修改数', '操作'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.padding = '8px';
            th.style.textAlign = 'left';
            th.style.borderBottom = '1px solid #ddd';
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 创建表体
        const tbody = document.createElement('tbody');

        patterns.forEach((pattern, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';

            if (index % 2 === 0) {
                row.style.backgroundColor = '#f9f9f9';
            }

            // 序号单元格
            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;
            indexCell.style.padding = '8px';
            row.appendChild(indexCell);

            // URL模式单元格
            const patternCell = document.createElement('td');
            patternCell.textContent = pattern;
            patternCell.style.padding = '8px';
            patternCell.style.maxWidth = '150px';
            patternCell.style.overflow = 'hidden';
            patternCell.style.textOverflow = 'ellipsis';
            patternCell.style.whiteSpace = 'nowrap';
            row.appendChild(patternCell);

            // 隐藏元素数单元格
            const hideCountCell = document.createElement('td');
            const hideCount = defaultMods[pattern].hideModifications ? defaultMods[pattern].hideModifications.length : 0;
            hideCountCell.textContent = hideCount;
            hideCountCell.style.padding = '8px';
            hideCountCell.style.textAlign = 'center';
            row.appendChild(hideCountCell);

            // 样式修改数单元格
            const styleCountCell = document.createElement('td');
            const styleCount = defaultMods[pattern].styleModifications ? Object.keys(defaultMods[pattern].styleModifications).length : 0;
            styleCountCell.textContent = styleCount;
            styleCountCell.style.padding = '8px';
            styleCountCell.style.textAlign = 'center';
            row.appendChild(styleCountCell);

            // 操作单元格
            const actionCell = document.createElement('td');
            actionCell.style.padding = '8px';

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '5px';
            buttonContainer.style.flexWrap = 'wrap';

            // 应用按钮
            const applyButton = document.createElement('button');
            applyButton.textContent = '应用';
            applyButton.style.padding = '2px 5px';
            applyButton.style.fontSize = '11px';
            applyButton.style.cursor = 'pointer';
            applyButton.style.backgroundColor = '#4CAF50';
            applyButton.style.color = 'white';
            applyButton.style.border = 'none';
            applyButton.style.borderRadius = '3px';

            applyButton.addEventListener('click', () => {
                const mods = defaultMods[pattern];

                // 保存修改到当前页面
                const pageId = getPageId();
                const allHideModifications = GM_getValue(STORAGE_KEY, {});
                allHideModifications[pageId] = mods.hideModifications || [];
                GM_setValue(STORAGE_KEY, allHideModifications);

                const allStyleModifications = GM_getValue(STYLE_STORAGE_KEY, {});
                allStyleModifications[pageId] = mods.styleModifications || {};
                GM_setValue(STYLE_STORAGE_KEY, allStyleModifications);

                // 应用修改
                applyModifications();
                applyStyleModifications();

                alert('默认修改已应用到当前页面！');
            });

            // 测试按钮
            const testButton = document.createElement('button');
            testButton.textContent = '测试';
            testButton.style.padding = '2px 5px';
            testButton.style.fontSize = '11px';
            testButton.style.cursor = 'pointer';
            testButton.style.backgroundColor = '#2196F3';
            testButton.style.color = 'white';
            testButton.style.border = 'none';
            testButton.style.borderRadius = '3px';

            testButton.addEventListener('click', () => {
                try {
                    const regex = new RegExp(pattern);
                    const currentUrl = window.location.href;
                    const matches = regex.test(currentUrl);

                    alert(`URL模式: ${pattern}\n当前URL: ${currentUrl}\n匹配结果: ${matches ? '匹配成功' : '匹配失败'}`);
                } catch (e) {
                    alert('测试失败: ' + e.message);
                }
            });

            // 编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.style.padding = '2px 5px';
            editButton.style.fontSize = '11px';
            editButton.style.cursor = 'pointer';
            editButton.style.backgroundColor = '#2196F3';
            editButton.style.color = 'white';
            editButton.style.border = 'none';
            editButton.style.borderRadius = '3px';

            editButton.addEventListener('click', () => {
                urlPatternInput.value = pattern;
                modsTextarea.value = JSON.stringify(defaultMods[pattern], null, 2);
                // 滚动到顶部
                contentContainer.scrollTop = 0;
            });

            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.style.padding = '2px 5px';
            deleteButton.style.fontSize = '11px';
            deleteButton.style.cursor = 'pointer';
            deleteButton.style.backgroundColor = '#f44336';
            deleteButton.style.color = 'white';
            deleteButton.style.border = 'none';
            deleteButton.style.borderRadius = '3px';

            deleteButton.addEventListener('click', () => {
                if (confirm('确定要删除这个默认修改吗？')) {
                    const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});
                    delete defaultMods[pattern];
                    GM_setValue(DEFAULT_MODIFICATIONS_KEY, defaultMods);
                    showDefaultModifications();
                }
            });

            // 查看详情按钮
            const detailsButton = document.createElement('button');
            detailsButton.textContent = '详情';
            detailsButton.style.padding = '2px 5px';
            detailsButton.style.fontSize = '11px';
            detailsButton.style.cursor = 'pointer';
            detailsButton.style.backgroundColor = '#9C27B0';
            detailsButton.style.color = 'white';
            detailsButton.style.border = 'none';
            detailsButton.style.borderRadius = '3px';

            // 修改详情按钮的事件处理函数
// 修改详情按钮的事件处理函数
detailsButton.addEventListener('click', () => {
    const previewPanel = document.createElement('div');
    previewPanel.style.position = 'fixed';
    previewPanel.style.top = '50%';
    previewPanel.style.left = '50%';
    previewPanel.style.transform = 'translate(-50%, -50%)';
    previewPanel.style.zIndex = '999999';
    previewPanel.style.backgroundColor = 'white';
    previewPanel.style.padding = '20px';
    previewPanel.style.border = '1px solid #ccc';
    previewPanel.style.borderRadius = '5px';
    previewPanel.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
    previewPanel.style.width = '600px';
    previewPanel.style.maxHeight = '80vh';
    previewPanel.style.overflow = 'auto';

    const previewTitle = document.createElement('h3');
    previewTitle.textContent = '默认修改详情';
    previewTitle.style.margin = '0 0 15px 0';
    previewPanel.appendChild(previewTitle);

    // 创建按钮容器 - 现在放在顶部
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end'; // 右对齐
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginBottom = '15px';
    previewPanel.appendChild(buttonContainer);

    // 保存按钮 - 现在放在左边
    const saveButton = document.createElement('button');
    saveButton.textContent = '保存';
    saveButton.style.padding = '5px 10px';
    saveButton.style.cursor = 'pointer';
    saveButton.style.backgroundColor = '#4CAF50';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '3px';
    buttonContainer.appendChild(saveButton);

    // 关闭按钮 - 现在放在右边
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.padding = '5px 10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.backgroundColor = '#2196F3';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '3px';
    buttonContainer.appendChild(closeButton);

    // URL模式改为可编辑
    const patternTitle = document.createElement('h4');
    patternTitle.textContent = 'URL模式:';
    patternTitle.style.margin = '0 0 5px 0';
    previewPanel.appendChild(patternTitle);

    const patternInput = document.createElement('input'); // 改为input而不是div
    patternInput.type = 'text';
    patternInput.value = pattern;
    patternInput.style.width = '100%';
    patternInput.style.padding = '8px';
    patternInput.style.margin = '0 0 15px 0';
    patternInput.style.border = '1px solid #ddd';
    patternInput.style.borderRadius = '3px';
    previewPanel.appendChild(patternInput);

    const hideTitle = document.createElement('h4');
    hideTitle.textContent = '隐藏元素:';
    hideTitle.style.margin = '0 0 5px 0';
    previewPanel.appendChild(hideTitle);

    const hideTextarea = document.createElement('textarea');
    hideTextarea.value = defaultMods[pattern].hideModifications ?
        defaultMods[pattern].hideModifications.join('\n') : '';
    hideTextarea.style.width = '98%';
    hideTextarea.style.height = '100px';
    hideTextarea.style.margin = '0 0 15px 0';
    hideTextarea.style.padding = '10px';
    hideTextarea.style.backgroundColor = '#f5f5f5';
    hideTextarea.style.borderRadius = '3px';
    hideTextarea.style.resize = 'vertical';
    previewPanel.appendChild(hideTextarea);

    const styleTitle = document.createElement('h4');
    styleTitle.textContent = '样式修改:';
    styleTitle.style.margin = '0 0 5px 0';
    previewPanel.appendChild(styleTitle);

    const styleTextarea = document.createElement('textarea');
    styleTextarea.value = defaultMods[pattern].styleModifications ?
        JSON.stringify(defaultMods[pattern].styleModifications, null, 2) : '{}';
    styleTextarea.style.width = '98%';
    styleTextarea.style.height = '200px';
    styleTextarea.style.margin = '0 0 15px 0';
    styleTextarea.style.padding = '10px';
    styleTextarea.style.backgroundColor = '#f5f5f5';
    styleTextarea.style.borderRadius = '3px';
    styleTextarea.style.resize = 'vertical';
    previewPanel.appendChild(styleTextarea);

    // 事件处理
    closeButton.addEventListener('click', () => {
        document.body.removeChild(previewPanel);
    });

    saveButton.addEventListener('click', () => {
        try {
            const newPattern = patternInput.value.trim();
            if (!newPattern) {
                alert('URL模式不能为空');
                return;
            }

            const newHideModifications = hideTextarea.value.split('\n').filter(s => s.trim());
            const newStyleModifications = JSON.parse(styleTextarea.value);

            const defaultMods = GM_getValue(DEFAULT_MODIFICATIONS_KEY, {});

            // 如果URL模式改变了，先删除旧的
            if (newPattern !== pattern) {
                delete defaultMods[pattern];
            }

            // 添加/更新修改
            defaultMods[newPattern] = {
                hideModifications: newHideModifications,
                styleModifications: newStyleModifications
            };

            GM_setValue(DEFAULT_MODIFICATIONS_KEY, defaultMods);
            alert('修改已保存！');
            document.body.removeChild(previewPanel);
            showDefaultModifications();
        } catch (e) {
            alert('保存失败: ' + e.message);
        }
    });

    document.body.appendChild(previewPanel);
});

            buttonContainer.appendChild(applyButton);
            buttonContainer.appendChild(testButton);
            buttonContainer.appendChild(deleteButton);
            buttonContainer.appendChild(detailsButton);
            actionCell.appendChild(buttonContainer);
            row.appendChild(actionCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        listSection.appendChild(table);
    }

// 添加删除全部按钮
const deleteAllContainer = document.createElement('div');
deleteAllContainer.style.marginTop = '20px';
deleteAllContainer.style.paddingTop = '20px';
deleteAllContainer.style.borderTop = '1px solid #eee';

const deleteAllButton = document.createElement('button');
deleteAllButton.textContent = '删除当前页面的所有修改';
deleteAllButton.style.padding = '5px 10px';
deleteAllButton.style.cursor = 'pointer';
deleteAllButton.style.backgroundColor = '#f44336';
deleteAllButton.style.color = 'white';
deleteAllButton.style.border = 'none';
deleteAllButton.style.borderRadius = '3px';

deleteAllButton.addEventListener('click', () => {
    if (confirm('确定要删除当前页面的所有修改吗？此操作将删除所有隐藏元素和样式修改，且不可撤销！')) {
        const pageId = getPageId();

        // 删除隐藏元素修改
        const allHideModifications = GM_getValue(STORAGE_KEY, {});
        if (allHideModifications[pageId]) {
            delete allHideModifications[pageId];
            GM_setValue(STORAGE_KEY, allHideModifications);
        }

        // 删除样式修改
        const allStyleModifications = GM_getValue(STYLE_STORAGE_KEY, {});
        if (allStyleModifications[pageId]) {
            delete allStyleModifications[pageId];
            GM_setValue(STYLE_STORAGE_KEY, allStyleModifications);
        }

        // 重新加载页面以清除所有修改
        const currentUrl = window.location.href;
        window.location.href = currentUrl;
    }
});

deleteAllContainer.appendChild(deleteAllButton);
contentContainer.appendChild(deleteAllContainer);
contentContainer.appendChild(listSection);
}

        // 标签页切换
        hideTab.addEventListener('click', () => {
            hideTab.style.backgroundColor = '#f0f0f0';
            styleTab.style.backgroundColor = 'transparent';
            importExportTab.style.backgroundColor = 'transparent';
            defaultModsTab.style.backgroundColor = 'transparent';
            updateHideList();
        });

        styleTab.addEventListener('click', () => {
            styleTab.style.backgroundColor = '#f0f0f0';
            hideTab.style.backgroundColor = 'transparent';
            importExportTab.style.backgroundColor = 'transparent';
            defaultModsTab.style.backgroundColor = 'transparent';
            updateStyleList();
        });

        importExportTab.addEventListener('click', () => {
            importExportTab.style.backgroundColor = '#f0f0f0';
            hideTab.style.backgroundColor = 'transparent';
            styleTab.style.backgroundColor = 'transparent';
            defaultModsTab.style.backgroundColor = 'transparent';
            showImportExport();
        });

        defaultModsTab.addEventListener('click', () => {
            defaultModsTab.style.backgroundColor = '#f0f0f0';
            hideTab.style.backgroundColor = 'transparent';
            styleTab.style.backgroundColor = 'transparent';
            importExportTab.style.backgroundColor = 'transparent';
            showDefaultModifications();
        });

        // 默认显示隐藏元素列表
        updateHideList();
    }

    // 修改模式状态
    let editMode = false;
    let hoveredElement = null;
    let isEditingStyle = false;
    let modificationsPaused = false;

    // 高亮显示鼠标悬停的元素
    function highlightElement(element) {
        if (hoveredElement) {
            hoveredElement.style.outline = '';
            hoveredElement.style.backgroundColor = '';
        }

        // 不处理html和body元素
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'html' || tagName === 'body') {
            return;
        }

        hoveredElement = element;
        element.style.outline = '2px solid #0066ff';
        element.style.backgroundColor = 'rgba(173, 216, 230, 0.3)';
    }

    // 移除高亮样式
    function removeHighlight() {
        if (hoveredElement) {
            hoveredElement.style.outline = '';
            hoveredElement.style.backgroundColor = '';
            hoveredElement = null;
        }
    }

    // 处理鼠标移动事件
    function handleMouseMove(e) {
        if (!editMode || isEditingStyle) return;

        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && element !== hoveredElement) {
            const tagName = element.tagName.toLowerCase();
            if (tagName !== 'html' && tagName !== 'body') {
                highlightElement(element);
            }
        }
    }

    // 处理左键点击事件 - 隐藏元素
    function handleLeftClick(e) {
        if (!editMode || e.button !== 0 || isEditingStyle) return;

        e.preventDefault();
        e.stopPropagation();

        if (hoveredElement) {
            const tagName = hoveredElement.tagName.toLowerCase();
            if (tagName === 'html' || tagName === 'body') {
                alert('不能隐藏html或body元素！');
                return;
            }

            // 生成选择器
            const selector = generateSelector(hoveredElement);
            if (selector) {
                if (addModification(selector)) {
                    hoveredElement.style.display = 'none';
                    removeHighlight();
                }
            }
        }
    }

    // 获取元素的计算样式
    function getElementStyles(element) {
        const computed = window.getComputedStyle(element);
        const styles = {};

        // 只获取常用的CSS属性
        const cssProperties = [
            'color', 'background-color', 'font-size', 'font-family',
            'max-width', 'width', 'height', 'padding', 'margin', 'border',
            'display', 'position', 'top', 'left', 'right', 'bottom',
            'flex-direction', 'justify-content', 'align-items',
            'text-align', 'opacity', 'visibility', 'z-index', 'font-weight',
            'line-height', 'min-height'
        ];

        cssProperties.forEach(prop => {
            styles[prop] = computed.getPropertyValue(prop);
        });

        return styles;
    }

    // 处理右键点击事件 - 编辑样式
    function handleRightClick(e) {
        if (!editMode || e.button !== 2 || isEditingStyle) return;

        e.preventDefault();
        e.stopPropagation();

        if (hoveredElement) {
            const tagName = hoveredElement.tagName.toLowerCase();
            if (tagName === 'html' || tagName === 'body') {
                alert('不能修改html或body元素的样式！');
                return;
            }

            isEditingStyle = true;
            const selector = generateSelector(hoveredElement);
            if (!selector) {
                isEditingStyle = false;
                return;
            }

            // 移除高亮样式
            const originalOutline = hoveredElement.style.outline;
            const originalBackground = hoveredElement.style.backgroundColor;
            hoveredElement.style.outline = '';
            hoveredElement.style.backgroundColor = '';

            // 创建样式编辑面板
            const panel = document.createElement('div');
            panel.style.position = 'fixed';
            panel.style.top = '50%';
            panel.style.left = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.style.zIndex = '999999';
            panel.style.backgroundColor = 'white';
            panel.style.padding = '15px';
            panel.style.border = '1px solid #ccc';
            panel.style.borderRadius = '5px';
            panel.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
            panel.style.fontFamily = 'Arial, sans-serif';
            panel.style.width = '400px';
            panel.style.maxHeight = '80vh';
            panel.style.overflowY = 'auto';

            // 获取元素的实际样式
            const computedStyles = getElementStyles(hoveredElement);

            // 获取已保存的样式
            const savedStyles = getStyleModifications()[selector] || {};

            // 合并样式（已保存的优先）
            const styles = {...computedStyles, ...savedStyles};

            // 创建标题
            const title = document.createElement('h3');
            title.textContent = '编辑元素样式';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            panel.appendChild(title);

            // 显示元素选择器
            const selectorText = document.createElement('div');
            selectorText.textContent = `选择器: ${selector}`;
            selectorText.style.marginBottom = '10px';
            selectorText.style.fontSize = '14px';
            selectorText.style.color = '#666';
            panel.appendChild(selectorText);

            // 创建样式编辑器
            const editor = document.createElement('textarea');
            editor.style.width = '100%';
            editor.style.height = '200px';
            editor.style.marginBottom = '10px';
            editor.style.fontFamily = 'monospace';
            editor.style.padding = '5px';
            editor.value = JSON.stringify(styles, null, 2);
            panel.appendChild(editor);

            // 创建按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            panel.appendChild(buttonContainer);

            // 创建取消按钮
            const cancelButton = document.createElement('button');
            cancelButton.textContent = '取消';
            cancelButton.style.padding = '5px 10px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(panel);
                // 恢复高亮样式
                hoveredElement.style.outline = originalOutline;
                hoveredElement.style.backgroundColor = originalBackground;
                isEditingStyle = false;
            });
            buttonContainer.appendChild(cancelButton);

            // 创建应用按钮
            const applyButton = document.createElement('button');
            applyButton.textContent = '应用';
            applyButton.style.padding = '5px 10px';
            applyButton.style.cursor = 'pointer';
            applyButton.style.backgroundColor = '#4CAF50';
            applyButton.style.color = 'white';
            applyButton.style.border = 'none';
            applyButton.addEventListener('click', () => {
                try {
                    const newStyles = JSON.parse(editor.value);
                    // 只保存实际修改的样式属性
                    const modifiedStyles = {};
                    Object.keys(newStyles).forEach(key => {
                        if (newStyles[key] && newStyles[key] !== computedStyles[key]) {
                            modifiedStyles[key] = newStyles[key];
                        }
                    });

                    if (addStyleModification(selector, modifiedStyles)) {
                        applyStyleModifications();
                        document.body.removeChild(panel);
                        // 不再恢复高亮样式
                        isEditingStyle = false;
                    }
                } catch (e) {
                    alert('样式格式错误: ' + e.message);
                }
            });
            buttonContainer.appendChild(applyButton);

            // 创建重置按钮
            const resetButton = document.createElement('button');
            resetButton.textContent = '重置';
            resetButton.style.padding = '5px 10px';
            resetButton.style.cursor = 'pointer';
            resetButton.addEventListener('click', () => {
                removeStyleModification(selector);
                applyStyleModifications();
                document.body.removeChild(panel);
                // 不再恢复高亮样式
                isEditingStyle = false;
            });
            buttonContainer.appendChild(resetButton);

            document.body.appendChild(panel);
        }
    }

    // 生成元素选择器
    function generateSelector(element) {
        if (!element || !element.tagName) return null;

        const tagName = element.tagName.toLowerCase();
        if (tagName === 'html' || tagName === 'body') {
            return null;
        }

        let selector = tagName;

        if (element.id) {
            selector += `#${element.id}`;
            return selector;
        }

        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(/\s+/).filter(c => c.length > 0);
            if (classes.length > 0) {
                selector += `.${classes.join('.')}`;
            }
        }

        // 添加路径信息提高特异性
        const path = [];
        let current = element.parentNode;
        let sameTagSiblings = 0;
        let index = 0;

        while (current && current !== document) {
            if (current.tagName === element.tagName) {
                sameTagSiblings++;
            }
            current = current.parentNode;
        }

        if (sameTagSiblings > 0) {
            current = element;
            while (current.previousElementSibling) {
                if (current.previousElementSibling.tagName === element.tagName) {
                    index++;
                }
                current = current.previousElementSibling;
            }

            if (index > 0) {
                selector += `:nth-of-type(${index + 1})`;
            }
        }

        return selector;
    }

    // 切换修改模式
    function toggleEditMode() {
        editMode = !editMode;

        if (editMode) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('click', handleLeftClick, true);
            document.addEventListener('contextmenu', handleRightClick, true);
            alert('已进入修改模式：\n- 鼠标悬停元素会高亮显示\n- 左键点击隐藏元素\n- 右键点击编辑元素样式\n\n注意：不能隐藏或修改html/body元素！');
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleLeftClick, true);
            document.removeEventListener('contextmenu', handleRightClick, true);

            removeHighlight();
            alert('已退出修改模式');
        }
    }

    // 暂停/恢复修改
    function togglePauseModifications() {
        const currentlyPaused = getPauseState();
        const newPauseState = !currentlyPaused;

        // 保存新的暂停状态
        GM_setValue(PAUSE_STATE_KEY, newPauseState);

        if (newPauseState) {
            // 恢复所有隐藏元素的显示
            const modifications = getModifications();
            modifications.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        el.style.display = '';
                    });
                } catch (e) {
                    console.error('恢复显示失败:', e);
                }
            });

            // 恢复所有样式修改
            const styleModifications = getStyleModifications();
            Object.keys(styleModifications).forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        // 只清除之前修改过的样式属性
                        Object.keys(styleModifications[selector]).forEach(prop => {
                            el.style[prop] = '';
                        });
                    });
                } catch (e) {
                    console.error('恢复样式失败:', e);
                }
            });

            alert('已暂停所有修改，页面恢复原始状态');
        } else {
            // 重新应用所有修改
            applyModifications();
            applyStyleModifications();
            alert('已恢复所有修改');
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('开始/停止修改', toggleEditMode);
    GM_registerMenuCommand('管理修改', showManagementWindow);
    GM_registerMenuCommand('暂停/恢复修改', togglePauseModifications);

// 改进后的初始应用修改
function applyChangesWithRetry() {
    if (!getPauseState()) {
        applyModifications();
        applyStyleModifications();
    }
    // 5秒后再检查一次
    setTimeout(applyChangesWithRetry, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyChangesWithRetry();
        checkAndApplyDefaultModifications();
    });
} else {
    applyChangesWithRetry();
    checkAndApplyDefaultModifications();
}

})();
