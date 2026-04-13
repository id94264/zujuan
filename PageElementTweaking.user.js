// ==UserScript==
// @name        网页元素修改工具
// @namespace   Tampermonkey Scripts
// @match       https://zujuan.xkw.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_registerMenuCommand
// @grant       GM_download
// @icon        
// @version     3.6.24
// @author      AI & id94264
// @description 允许隐藏和修改网页元素
// @updateURL   https://github.com/id94264/zujuan/raw/main/PageElementTweaking.user.js
// @downloadURL https://github.com/id94264/zujuan/raw/main/PageElementTweaking.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 存储键名
    const STORAGE_KEYS = {
        HIDE: 'element_modifications_v3',
        STYLE: 'element_style_modifications_v3',
        DEFAULT: 'default_element_modifications_v3',
        PAUSE: 'modifications_paused_v3'
    };

    // UI配置
    const UI_CONFIG = {
        PANEL: {
            width: '420px',
            maxHeight: '80vh',
            bgColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '15px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        BUTTON: {
            primary: {
                bg: '#4285f4',
                color: '#fff',
                hover: '#3367d6'
            },
            danger: {
                bg: '#ea4335',
                color: '#fff',
                hover: '#d33426'
            },
            secondary: {
                bg: '#f1f3f4',
                color: '#3c4043',
                hover: '#e0e0e0'
            }
        },
        TAB: {
            activeBg: '#f1f3f4',
            inactiveBg: 'transparent'
        }
    };

    // 工具函数
    const Utils = {
        getPageId: () => window.location.hostname + window.location.pathname,
        escapeHtml: (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
        debounce: (func, delay) => {
            let timeout;
            return function() {
                const context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), delay);
            };
        },
        escapeRegExp: (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    };

    // 存储管理器
    class StorageManager {
        static getHideModifications() {
            const pageId = Utils.getPageId();
            const allModifications = GM_getValue(STORAGE_KEYS.HIDE, {});
            return allModifications[pageId] || [];
        }

        static saveHideModifications(modifications) {
            const pageId = Utils.getPageId();
            const allModifications = GM_getValue(STORAGE_KEYS.HIDE, {});
            allModifications[pageId] = modifications;
            GM_setValue(STORAGE_KEYS.HIDE, allModifications);
        }

        static getStyleModifications() {
            const pageId = Utils.getPageId();
            const allModifications = GM_getValue(STORAGE_KEYS.STYLE, {});
            return allModifications[pageId] || {};
        }

        static saveStyleModifications(modifications) {
            const pageId = Utils.getPageId();
            const allModifications = GM_getValue(STORAGE_KEYS.STYLE, {});
            allModifications[pageId] = modifications;
            GM_setValue(STORAGE_KEYS.STYLE, allModifications);
        }

        static getPauseState() {
            return GM_getValue(STORAGE_KEYS.PAUSE, false);
        }

        static setPauseState(state) {
            GM_setValue(STORAGE_KEYS.PAUSE, state);
        }

        static getDefaultModifications() {
            return GM_getValue(STORAGE_KEYS.DEFAULT, {});
        }

        static saveDefaultModifications(modifications) {
            GM_setValue(STORAGE_KEYS.DEFAULT, modifications);
        }
    }

    // 元素修改器
    class ElementModifier {
        static addHideModification(selector) {
            const lowerSelector = selector.toLowerCase();
            if (lowerSelector === 'html' || lowerSelector === 'body') {
                return false;
            }

            const modifications = StorageManager.getHideModifications();
            if (!modifications.includes(selector)) {
                modifications.push(selector);
                StorageManager.saveHideModifications(modifications);
                return true;
            }
            return false;
        }

        static removeHideModification(selector) {
            const modifications = StorageManager.getHideModifications();
            const index = modifications.indexOf(selector);
            if (index !== -1) {
                modifications.splice(index, 1);
                StorageManager.saveHideModifications(modifications);
            }
        }

        static addStyleModification(selector, styles) {
            const lowerSelector = selector.toLowerCase();
            if ((lowerSelector === 'html' || lowerSelector === 'body') && styles.display === 'none') {
                return false;
            }

            const modifications = StorageManager.getStyleModifications();
            const currentStyles = modifications[selector] || {};
            const newStyles = {...currentStyles};

            Object.keys(styles).forEach(key => {
                if (styles[key] && styles[key] !== '') {
                    newStyles[key] = styles[key];
                } else {
                    delete newStyles[key];
                }
            });

            modifications[selector] = newStyles;
            StorageManager.saveStyleModifications(modifications);
            return true;
        }

        static removeStyleModification(selector) {
            const modifications = StorageManager.getStyleModifications();
            delete modifications[selector];
            StorageManager.saveStyleModifications(modifications);
        }

        static applyHideModifications() {
            if (StorageManager.getPauseState()) return;

            const modifications = StorageManager.getHideModifications();
            modifications.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = 'none';
                    });
                } catch (e) {
                    console.error('应用隐藏修改失败:', e);
                }
            });
        }

        static applyStyleModifications() {
            if (StorageManager.getPauseState()) return;

            const modifications = StorageManager.getStyleModifications();
            Object.keys(modifications).forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        Object.keys(modifications[selector]).forEach(prop => {
                            el.style[prop] = modifications[selector][prop];
                        });
                    });
                } catch (e) {
                    console.error('应用样式修改失败:', e);
                }
            });
        }

        static checkAndApplyDefaultModifications() {
            const defaultMods = StorageManager.getDefaultModifications();
            const pageUrl = window.location.href;
            const pageId = Utils.getPageId();

            for (const [pattern, mods] of Object.entries(defaultMods)) {
                try {
                    const regex = new RegExp(pattern);
                    if (regex.test(pageUrl)) {
                        const allHideMods = GM_getValue(STORAGE_KEYS.HIDE, {});
                        const allStyleMods = GM_getValue(STORAGE_KEYS.STYLE, {});

                        if (!allHideMods[pageId] && mods.hideModifications) {
                            allHideMods[pageId] = mods.hideModifications;
                            GM_setValue(STORAGE_KEYS.HIDE, allHideMods);
                        }

                        if (!allStyleMods[pageId] && mods.styleModifications) {
                            allStyleMods[pageId] = mods.styleModifications;
                            GM_setValue(STORAGE_KEYS.STYLE, allStyleMods);
                        }

                        this.applyHideModifications();
                        this.applyStyleModifications();
                        break;
                    }
                } catch (e) {
                    console.error('应用默认修改失败:', e);
                }
            }
        }
    }

    // UI管理器
    class UIManager {
        static createButton(text, type = 'secondary', onClick = null) {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.padding = '8px 16px';
            button.style.borderRadius = '4px';
            button.style.border = 'none';
            button.style.cursor = 'pointer';
            button.style.fontSize = '14px';
            button.style.transition = 'background-color 0.2s';
            button.style.margin = '0 4px';

            const config = UI_CONFIG.BUTTON[type] || UI_CONFIG.BUTTON.secondary;
            button.style.backgroundColor = config.bg;
            button.style.color = config.color;

            if (onClick) {
                button.addEventListener('click', onClick);
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = config.hover;
                });
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = config.bg;
                });
            }

            return button;
        }

        static createInput(placeholder, type = 'text') {
            const input = document.createElement('input');
            input.type = type;
            input.placeholder = placeholder;
            input.style.padding = '8px';
            input.style.border = '1px solid #dadce0';
            input.style.borderRadius = '4px';
            input.style.width = '100%';
            input.style.marginBottom = '8px';
            input.style.boxSizing = 'border-box';
            return input;
        }

        static createTextarea(placeholder) {
            const textarea = document.createElement('textarea');
            textarea.placeholder = placeholder;
            textarea.style.padding = '8px';
            textarea.style.border = '1px solid #dadce0';
            textarea.style.borderRadius = '4px';
            textarea.style.width = '95%';
            textarea.style.marginBottom = '8px';
            textarea.style.boxSizing = 'border-box';
            textarea.style.resize = 'vertical';
            textarea.style.minHeight = '100px';
            return textarea;
        }

        static getElementPath(element) {
            if (!element || element.nodeType !== 1) return '';

            const path = [];
            let current = element;

            while (current && current.nodeType === 1) {
                let selector = current.nodeName.toLowerCase();

                // 优先使用ID
                if (current.id) {
                    selector += '#' + current.id;
                    path.unshift(selector);
                    break;
                }

                // 使用class
                if (current.className && typeof current.className === 'string') {
                    const classes = current.className.split(/\s+/).filter(c => c.length > 0);
                    if (classes.length > 0) {
                        selector += '.' + classes[0];
                    }
                }

                // 如果有兄弟元素，添加:nth-child()
                if (current.parentNode) {
                    const children = Array.from(current.parentNode.children);
                    const index = children.indexOf(current) + 1;
                    if (children.length > 1) {
                        selector += `:nth-child(${index})`;
                    }
                }

                path.unshift(selector);
                current = current.parentNode;

                // 最多向上追溯5层
                if (path.length >= 5) break;
            }

            return path.join(' > ');
        }

        static createPanel() {
            const panel = document.createElement('div');
            panel.style.position = 'fixed';
            panel.style.top = '60px';
            panel.style.right = '15px';
            panel.style.zIndex = '999999';
            panel.style.width = UI_CONFIG.PANEL.width;
            panel.style.maxHeight = UI_CONFIG.PANEL.maxHeight;
            panel.style.backgroundColor = UI_CONFIG.PANEL.bgColor;
            panel.style.border = UI_CONFIG.PANEL.border;
            panel.style.borderRadius = UI_CONFIG.PANEL.borderRadius;
            panel.style.boxShadow = UI_CONFIG.PANEL.boxShadow;
            panel.style.padding = UI_CONFIG.PANEL.padding;
            panel.style.fontFamily = UI_CONFIG.PANEL.fontFamily;
            panel.style.display = 'flex';
            panel.style.flexDirection = 'column';

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#5f6368';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(panel);
            });
            panel.appendChild(closeButton);

            // 标签页
            const tabContainer = document.createElement('div');
            tabContainer.style.display = 'flex';
            tabContainer.style.marginBottom = '15px';
            tabContainer.style.borderBottom = '1px solid #e0e0e0';
            tabContainer.style.flexShrink = '0';

            const tabs = [
                { id: 'hide', text: '隐藏元素' },
                { id: 'style', text: '样式修改' },
                { id: 'importExport', text: '导入/导出' },
                { id: 'default', text: '默认修改' }
            ];

            tabs.forEach(tab => {
                const tabButton = document.createElement('button');
                tabButton.textContent = tab.text;
                tabButton.dataset.tab = tab.id;
                tabButton.style.padding = '8px 16px';
                tabButton.style.marginRight = '4px';
                tabButton.style.cursor = 'pointer';
                tabButton.style.border = 'none';
                tabButton.style.borderRadius = '4px 4px 0 0';
                tabButton.style.backgroundColor = tab.id === 'hide' ?
                    UI_CONFIG.TAB.activeBg : UI_CONFIG.TAB.inactiveBg;
                tabButton.style.fontSize = '14px';
                tabButton.style.transition = 'background-color 0.2s';

                tabButton.addEventListener('click', () => {
                    tabContainer.querySelectorAll('button').forEach(btn => {
                        btn.style.backgroundColor = UI_CONFIG.TAB.inactiveBg;
                    });
                    tabButton.style.backgroundColor = UI_CONFIG.TAB.activeBg;
                    UIManager.updateTabContent(tab.id, contentContainer);
                });

                tabContainer.appendChild(tabButton);
            });

            panel.appendChild(tabContainer);

            // 内容容器
            const contentContainer = document.createElement('div');
            contentContainer.style.overflowY = 'auto';
            contentContainer.style.flexGrow = '1';
            contentContainer.style.padding = '5px';
            panel.appendChild(contentContainer);

            // 初始显示隐藏元素标签页
            UIManager.updateTabContent('hide', contentContainer);

            document.body.appendChild(panel);
            return panel;
        }

        static updateTabContent(tabId, container) {
            container.innerHTML = '';

            switch (tabId) {
                case 'hide':
                    UIManager.showHideTab(container);
                    break;
                case 'style':
                    UIManager.showStyleTab(container);
                    break;
                case 'importExport':
                    UIManager.showImportExportTab(container);
                    break;
                case 'default':
                    UIManager.showDefaultModificationsTab(container);
                    break;
            }
        }

        static showHideTab(container) {
            // 清空容器内容
            container.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '已隐藏的元素';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            title.style.color = '#202124';
            container.appendChild(title);

            // 批量操作按钮
            const bulkEditButton = UIManager.createButton('批量编辑', 'primary', () => {
                UIManager.showBulkEditModal(
                    JSON.stringify(StorageManager.getHideModifications(), null, 2),
                    (newModifications) => {
                        if (Array.isArray(newModifications)) {
                            StorageManager.saveHideModifications(newModifications);
                            ElementModifier.applyHideModifications();
                            this.showToast('批量修改已保存', 'success');
                            this.showHideTab(container);
                        }
                    }
                );
            });
            bulkEditButton.style.marginBottom = '10px';
            container.appendChild(bulkEditButton);

            // 隐藏元素列表
            const modifications = StorageManager.getHideModifications();

            if (modifications.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '没有已保存的隐藏元素';
                emptyMsg.style.margin = '0';
                emptyMsg.style.fontSize = '14px';
                emptyMsg.style.color = '#666';
                container.appendChild(emptyMsg);
                return;
            }

            const listContainer = document.createElement('div');
            listContainer.style.maxHeight = '300px';
            listContainer.style.overflowY = 'auto';
            listContainer.style.border = '1px solid #e0e0e0';
            listContainer.style.borderRadius = '4px';
            listContainer.style.padding = '8px';

            modifications.forEach((selector, index) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.marginBottom = '8px';
                item.style.padding = '8px';
                item.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                item.style.borderRadius = '4px';

                const selectorText = document.createElement('span');
                selectorText.textContent = `${index + 1}. ${selector}`;
                selectorText.style.overflow = 'hidden';
                selectorText.style.textOverflow = 'ellipsis';
                selectorText.style.whiteSpace = 'nowrap';
                selectorText.style.maxWidth = '200px';

                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.gap = '4px';

                const editButton = UIManager.createButton('编辑', 'secondary', () => {
                    const newSelector = prompt('编辑选择器:', selector);
                    if (newSelector && newSelector.trim()) {
                        try {
                            document.querySelectorAll(newSelector.trim());
                            ElementModifier.removeHideModification(selector);
                            if (ElementModifier.addHideModification(newSelector.trim())) {
                                ElementModifier.applyHideModifications();
                                this.showHideTab(container);
                            }
                        } catch (e) {
                            this.showToast('无效的选择器: ' + e.message, 'error');
                        }
                    }
                });
                editButton.style.padding = '4px 8px';
                editButton.style.fontSize = '12px';

                const deleteButton = UIManager.createButton('删除', 'danger', () => {
                    ElementModifier.removeHideModification(selector);
                    ElementModifier.applyHideModifications();
                    this.showHideTab(container);
                });
                deleteButton.style.padding = '4px 8px';
                deleteButton.style.fontSize = '12px';

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(deleteButton);

                item.appendChild(selectorText);
                item.appendChild(buttonsContainer);
                listContainer.appendChild(item);
            });

            container.appendChild(listContainer);
        }

        static showStyleTab(container) {
            // 清空容器内容
            container.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '样式修改';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            title.style.color = '#202124';
            container.appendChild(title);

            // 批量操作按钮
            const bulkEditButton = UIManager.createButton('批量编辑', 'primary', () => {
                UIManager.showBulkEditModal(
                    JSON.stringify(StorageManager.getStyleModifications(), null, 2),
                    (newModifications) => {
                        if (typeof newModifications === 'object') {
                            StorageManager.saveStyleModifications(newModifications);
                            ElementModifier.applyStyleModifications();
                            this.showToast('批量修改已保存', 'success');
                            this.showStyleTab(container);
                        }
                    }
                );
            });
            bulkEditButton.style.marginBottom = '10px';
            container.appendChild(bulkEditButton);

            // 样式修改列表
            const modifications = StorageManager.getStyleModifications();
            const selectors = Object.keys(modifications);

            if (selectors.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '没有已保存的样式修改';
                emptyMsg.style.margin = '0';
                emptyMsg.style.fontSize = '14px';
                emptyMsg.style.color = '#666';
                container.appendChild(emptyMsg);
                return;
            }

            const listContainer = document.createElement('div');
            listContainer.style.maxHeight = '400px';
            listContainer.style.overflowY = 'auto';
            listContainer.style.border = '1px solid #e0e0e0';
            listContainer.style.borderRadius = '4px';
            listContainer.style.marginTop = '10px';

            selectors.forEach((selector, index) => {
                const item = document.createElement('div');
                item.style.padding = '12px';
                item.style.borderBottom = '1px solid #eee';
                item.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';

                const selectorInfo = document.createElement('div');
                selectorInfo.style.flex = '1';
                selectorInfo.style.overflow = 'hidden';

                const selectorTitle = document.createElement('div');
                selectorTitle.textContent = `${index + 1}. ${selector}`;
                selectorTitle.style.fontWeight = 'bold';
                selectorTitle.style.marginBottom = '5px';
                selectorTitle.style.whiteSpace = 'nowrap';
                selectorTitle.style.textOverflow = 'ellipsis';
                selectorTitle.style.overflow = 'hidden';
                selectorInfo.appendChild(selectorTitle);

                const styleCount = document.createElement('div');
                styleCount.textContent = `样式属性: ${Object.keys(modifications[selector]).length}`;
                styleCount.style.fontSize = '12px';
                styleCount.style.color = '#666';
                selectorInfo.appendChild(styleCount);

                item.appendChild(selectorInfo);

                const buttonsContainer = document.createElement('div');
                buttonsContainer.style.display = 'flex';
                buttonsContainer.style.gap = '5px';

                // 编辑按钮
                const editButton = UIManager.createButton('编辑', 'secondary', () => {
                    this.showStyleEditor(selector, modifications[selector], () => {
                        this.showStyleTab(container);
                    });
                });
                editButton.style.padding = '5px 10px';
                editButton.style.fontSize = '12px';

                // 删除按钮
                const deleteButton = UIManager.createButton('删除', 'danger', () => {
                    if (confirm(`确定要删除 ${selector} 的所有样式修改吗？`)) {
                        ElementModifier.removeStyleModification(selector);
                        ElementModifier.applyStyleModifications();
                        this.showToast('样式修改已删除', 'success');
                        this.showStyleTab(container);
                    }
                });
                deleteButton.style.padding = '5px 10px';
                deleteButton.style.fontSize = '12px';

                buttonsContainer.appendChild(editButton);
                buttonsContainer.appendChild(deleteButton);
                item.appendChild(buttonsContainer);

                listContainer.appendChild(item);
            });

            container.appendChild(listContainer);
        }

        static showStyleEditor(selector, styles, onSaveCallback) {
            const panel = document.createElement('div');
            panel.style.position = 'fixed';
            panel.style.top = '50%';
            panel.style.left = '50%';
            panel.style.transform = 'translate(-50%, -50%)';
            panel.style.zIndex = '999999';
            panel.style.backgroundColor = '#ffffff';
            panel.style.padding = '20px';
            panel.style.borderRadius = '8px';
            panel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            panel.style.width = '700px';
            panel.style.maxHeight = '80vh';
            panel.style.overflowY = 'auto';
            panel.style.display = 'flex';
            panel.style.flexDirection = 'column';

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#5f6368';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(panel);
                if (onSaveCallback) onSaveCallback();
            });
            panel.appendChild(closeButton);

            const title = document.createElement('h3');
            title.textContent = '编辑样式';
            title.style.margin = '0 0 15px 0';
            panel.appendChild(title);

            // 选择器编辑区域
            const selectorContainer = document.createElement('div');
            selectorContainer.style.marginBottom = '15px';
            selectorContainer.style.display = 'flex';
            selectorContainer.style.alignItems = 'center';
            selectorContainer.style.gap = '10px';

            const selectorLabel = document.createElement('span');
            selectorLabel.textContent = '选择器:';
            selectorLabel.style.fontWeight = 'bold';
            selectorContainer.appendChild(selectorLabel);

            const selectorInput = document.createElement('input');
            selectorInput.type = 'text';
            selectorInput.value = selector;
            selectorInput.style.flex = '1';
            selectorInput.style.padding = '8px';
            selectorInput.style.border = '1px solid #dadce0';
            selectorInput.style.borderRadius = '4px';
            selectorContainer.appendChild(selectorInput);

            // 选择器类型选项
            const selectorTypeContainer = document.createElement('div');
            selectorTypeContainer.style.marginBottom = '15px';
            selectorTypeContainer.style.display = 'flex';
            selectorTypeContainer.style.alignItems = 'center';
            selectorTypeContainer.style.gap = '10px';

            const selectorTypeLabel = document.createElement('span');
            selectorTypeLabel.textContent = '选择器类型:';
            selectorTypeLabel.style.fontWeight = 'bold';
            selectorTypeContainer.appendChild(selectorTypeLabel);

            const idRadio = document.createElement('input');
            idRadio.type = 'radio';
            idRadio.id = 'selector-type-id';
            idRadio.name = 'selector-type';
            idRadio.value = 'id';
            idRadio.checked = false;
            selectorTypeContainer.appendChild(idRadio);

            const idLabel = document.createElement('label');
            idLabel.htmlFor = 'selector-type-id';
            idLabel.textContent = 'ID';
            selectorTypeContainer.appendChild(idLabel);

            const classRadio = document.createElement('input');
            classRadio.type = 'radio';
            classRadio.id = 'selector-type-class';
            classRadio.name = 'selector-type';
            classRadio.value = 'class';
            classRadio.checked = true;
            selectorTypeContainer.appendChild(classRadio);

            const classLabel = document.createElement('label');
            classLabel.htmlFor = 'selector-type-class';
            classLabel.textContent = 'Class';
            selectorTypeContainer.appendChild(classLabel);

            // 初始化按钮状态
            const updateButtonState = () => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        const element = elements[0];

                        // 根据元素是否有ID来设置按钮状态
                        if (element.id) {
                            idRadio.disabled = false;
                            idLabel.style.color = '#202124';
                            idLabel.style.cursor = 'pointer';
                        } else {
                            idRadio.disabled = true;
                            idLabel.style.color = '#9aa0a6';
                            idLabel.style.cursor = 'not-allowed';
                        }

                        // 根据元素是否有class来设置按钮状态
                        if (element.className && typeof element.className === 'string' &&
                            element.className.trim().length > 0) {
                            classRadio.disabled = false;
                            classLabel.style.color = '#202124';
                            classLabel.style.cursor = 'pointer';
                        } else {
                            classRadio.disabled = true;
                            classLabel.style.color = '#9aa0a6';
                            classLabel.style.cursor = 'not-allowed';
                        }
                    }
                } catch (e) {
                    console.error('获取元素信息失败:', e);
                }
            };

            // 选择器类型切换事件
            const updateSelectorInput = () => {
                let currentValue = selectorInput.value.trim();

                // 获取当前元素的实际ID或Class
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        const element = elements[0];

                        if (idRadio.checked) {
                            // 如果元素有ID，只使用ID选择器
                            if (element.id) {
                                selectorInput.value = `#${element.id}`;
                            } else if (currentValue && !currentValue.startsWith('#')) {
                                selectorInput.value = `#${currentValue}`;
                            }
                        } else if (classRadio.checked) {
                            // 如果元素有Class，使用所有class
                            if (element.className && typeof element.className === 'string') {
                                const classes = element.className.split(/\s+/).filter(c => c.length > 0);
                                if (classes.length > 0) {
                                    // 使用标签名和所有class
                                    const tagName = element.tagName.toLowerCase();
                                    selectorInput.value = `${tagName}.${classes.join('.')}`;
                                } else if (currentValue && !currentValue.startsWith('.')) {
                                    selectorInput.value = `.${currentValue}`;
                                }
                            } else if (currentValue && !currentValue.startsWith('.')) {
                                selectorInput.value = `.${currentValue}`;
                            }
                        }
                    } else {
                        // 如果没有找到元素，使用简单的添加前缀方式
                        if (idRadio.checked && !currentValue.startsWith('#')) {
                            selectorInput.value = `#${currentValue}`;
                        } else if (classRadio.checked) {
                            // 对于class选择器，如果已经有标签名，不需要额外加点
                            if (!currentValue.includes('.') && !currentValue.startsWith('#')) {
                                // 如果没有标签名，添加默认的div标签
                                selectorInput.value = `div.${currentValue}`;
                            }
                        }
                    }
                } catch (e) {
                    console.error('获取元素信息失败:', e);
                    // 出错时使用简单的添加前缀方式
                    if (idRadio.checked && !currentValue.startsWith('#')) {
                        selectorInput.value = `#${currentValue}`;
                    } else if (classRadio.checked) {
                        // 对于class选择器，如果已经有标签名，不需要额外加点
                        if (!currentValue.includes('.') && !currentValue.startsWith('#')) {
                            // 如果没有标签名，添加默认的div标签
                            selectorInput.value = `div.${currentValue}`;
                        }
                    }
                }
            };

            // 初始化按钮状态
            updateButtonState();

            idRadio.addEventListener('change', updateSelectorInput);
            classRadio.addEventListener('change', updateSelectorInput);

            panel.appendChild(selectorContainer);
            panel.appendChild(selectorTypeContainer);

            // 样式编辑区域
            const editorContainer = document.createElement('div');
            editorContainer.style.display = 'flex';
            editorContainer.style.marginBottom = '15px';
            editorContainer.style.gap = '15px';

            // 左侧样式列表
            const styleList = document.createElement('div');
            styleList.style.flex = '1';
            styleList.style.border = '1px solid #e0e0e0';
            styleList.style.borderRadius = '4px';
            styleList.style.padding = '10px';
            styleList.style.overflowY = 'auto';
            styleList.style.maxHeight = '300px';

            const styleListTitle = document.createElement('h4');
            styleListTitle.textContent = '当前样式';
            styleListTitle.style.margin = '0 0 10px 0';
            styleListTitle.style.fontSize = '14px';
            styleList.appendChild(styleListTitle);

            // 右侧样式值编辑区
            const styleEditArea = document.createElement('div');
            styleEditArea.style.flex = '1';
            styleEditArea.style.border = '1px solid #e0e0e0';
            styleEditArea.style.borderRadius = '4px';
            styleEditArea.style.padding = '10px';

            const styleEditTitle = document.createElement('h4');
            styleEditTitle.textContent = '编辑样式值';
            styleEditTitle.style.margin = '0 0 10px 0';
            styleEditTitle.style.fontSize = '14px';
            styleEditArea.appendChild(styleEditTitle);

            const styleValueInput = document.createElement('input');
            styleValueInput.type = 'text';
            styleValueInput.style.width = 'calc(100% - 16px)';
            styleValueInput.style.padding = '8px';
            styleValueInput.style.marginBottom = '10px';
            styleValueInput.style.border = '1px solid #dadce0';
            styleValueInput.style.borderRadius = '4px';
            styleValueInput.style.boxSizing = 'border-box';
            styleEditArea.appendChild(styleValueInput);

            const styleDescription = document.createElement('div');
            styleDescription.style.fontSize = '12px';
            styleDescription.style.color = '#5f6368';
            styleDescription.style.marginBottom = '10px';
            styleEditArea.appendChild(styleDescription);

            // 修改样式按钮
            const addStyleButton = UIManager.createButton('修改样式', 'primary', () => {
                if (currentEditingProp) {
                    const newValue = styleValueInput.value.trim();
                    if (newValue) {
                        styles[currentEditingProp] = newValue;
                        renderStyleList(styles);
                        this.showToast('样式值已更新', 'success');
                    } else {
                        this.showToast('请输入有效的样式值', 'warning');
                    }
                } else {
                    this.showToast('请先选择一个样式属性进行编辑', 'warning');
                }
            });
            styleEditArea.appendChild(addStyleButton);

            editorContainer.appendChild(styleList);
            editorContainer.appendChild(styleEditArea);
            panel.appendChild(editorContainer);

            // 添加新样式区域
            const addStyleContainer = document.createElement('div');
            addStyleContainer.style.marginBottom = '15px';
            addStyleContainer.style.padding = '10px';
            addStyleContainer.style.border = '1px solid #e0e0e0';
            addStyleContainer.style.borderRadius = '4px';

            const addStyleTitle = document.createElement('h4');
            addStyleTitle.textContent = '添加新样式';
            addStyleTitle.style.margin = '0 0 10px 0';
            addStyleTitle.style.fontSize = '14px';
            addStyleContainer.appendChild(addStyleTitle);

            // 获取当前元素的样式列表
            const getCurrentElementStyles = () => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length === 0) return [];

                    const computedStyles = window.getComputedStyle(elements[0]);
                    const styleProps = [];

                    // 常见的CSS属性列表
                    const commonProps = [
                        'color', 'background-color', 'font-size', 'font-family', 'font-weight',
                        'margin', 'padding', 'border', 'border-radius', 'width', 'height',
                        'display', 'position', 'top', 'left', 'right', 'bottom',
                        'opacity', 'visibility', 'z-index', 'text-align', 'line-height',
                        'box-shadow', 'text-shadow', 'cursor', 'overflow', 'transition'
                    ];

                    commonProps.forEach(prop => {
                        const value = computedStyles.getPropertyValue(prop);
                        if (value && value !== 'none' && value !== 'auto' && value !== '0px') {
                            styleProps.push({
                                property: prop,
                                value: value
                            });
                        }
                    });

                    return styleProps;
                } catch (e) {
                    console.error('获取元素样式失败:', e);
                    return [];
                }
            };

            const currentStyles = getCurrentElementStyles();

            const newStyleRow = document.createElement('div');
            newStyleRow.style.display = 'flex';
            newStyleRow.style.flexDirection = 'column';
            newStyleRow.style.gap = '10px';
            newStyleRow.style.marginBottom = '10px';

            // 样式属性选择部分
            const stylePropSection = document.createElement('div');
            stylePropSection.style.display = 'flex';
            stylePropSection.style.flexDirection = 'column';
            stylePropSection.style.gap = '5px';

            const stylePropLabel = document.createElement('span');
            stylePropLabel.textContent = '样式属性:';
            stylePropLabel.style.fontSize = '12px';
            stylePropLabel.style.color = '#5f6368';
            stylePropSection.appendChild(stylePropLabel);

            // 样式属性选择下拉框
            const stylePropSelect = document.createElement('select');
            stylePropSelect.style.padding = '8px';
            stylePropSelect.style.border = '1px solid #dadce0';
            stylePropSelect.style.borderRadius = '4px';
            stylePropSelect.style.backgroundColor = '#ffffff';
            stylePropSelect.style.width = '100%';
            stylePropSelect.style.boxSizing = 'border-box';

            // 添加空选项
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '选择样式属性或手动输入';
            stylePropSelect.appendChild(emptyOption);

            // 添加当前元素已有的样式选项（移到前面）
            if (currentStyles.length > 0) {
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '--- 当前元素样式 ---';
                stylePropSelect.appendChild(separator);

                currentStyles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style.property;
                    option.textContent = `${style.property} (${style.value})`;
                    stylePropSelect.appendChild(option);
                });

                // 添加分隔线
                const separator2 = document.createElement('option');
                separator2.disabled = true;
                separator2.textContent = '--- 常用样式属性 ---';
                stylePropSelect.appendChild(separator2);
            }

            // 添加常用样式属性选项
            const commonProperties = [
                'color', 'background-color', 'font-size', 'font-family', 'font-weight',
                'margin', 'padding', 'border', 'border-radius', 'width', 'height',
                'display', 'position', 'top', 'left', 'right', 'bottom',
                'opacity', 'visibility', 'z-index', 'text-align', 'line-height',
                'box-shadow', 'text-shadow', 'cursor', 'overflow', 'transition'
            ];

            commonProperties.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop;
                option.textContent = prop;
                stylePropSelect.appendChild(option);
            });

            stylePropSection.appendChild(stylePropSelect);

            // 手动输入样式属性
            const manualInputSection = document.createElement('div');
            manualInputSection.style.display = 'flex';
            manualInputSection.style.flexDirection = 'column';
            manualInputSection.style.gap = '5px';

            const manualInputLabel = document.createElement('span');
            manualInputLabel.textContent = '手动输入样式属性:';
            manualInputLabel.style.fontSize = '12px';
            manualInputLabel.style.color = '#5f6368';
            manualInputSection.appendChild(manualInputLabel);

            const newStylePropInput = document.createElement('input');
            newStylePropInput.type = 'text';
            newStylePropInput.placeholder = '输入样式属性名称';
            newStylePropInput.style.padding = '8px';
            newStylePropInput.style.border = '1px solid #dadce0';
            newStylePropInput.style.borderRadius = '4px';
            newStylePropInput.style.width = '100%';
            newStylePropInput.style.boxSizing = 'border-box';
            manualInputSection.appendChild(newStylePropInput);

            // 样式值输入部分
            const styleValueSection = document.createElement('div');
            styleValueSection.style.display = 'flex';
            styleValueSection.style.flexDirection = 'column';
            styleValueSection.style.gap = '5px';

            const styleValueLabel = document.createElement('span');
            styleValueLabel.textContent = '样式值:';
            styleValueLabel.style.fontSize = '12px';
            styleValueLabel.style.color = '#5f6368';
            styleValueSection.appendChild(styleValueLabel);

            const newStyleValueInput = document.createElement('input');
            newStyleValueInput.type = 'text';
            newStyleValueInput.placeholder = '输入样式值';
            newStyleValueInput.style.padding = '8px';
            newStyleValueInput.style.border = '1px solid #dadce0';
            newStyleValueInput.style.borderRadius = '4px';
            newStyleValueInput.style.width = '100%';
            newStyleValueInput.style.boxSizing = 'border-box';
            styleValueSection.appendChild(newStyleValueInput);

            // 下拉框选择事件
            stylePropSelect.addEventListener('change', () => {
                if (stylePropSelect.value) {
                    newStylePropInput.value = stylePropSelect.value;

                    // 获取当前元素的样式值
                    try {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            const computedStyles = window.getComputedStyle(elements[0]);
                            const styleValue = computedStyles.getPropertyValue(stylePropSelect.value);

                            // 如果样式值有效，自动填充
                            if (styleValue && styleValue !== 'none' && styleValue !== 'auto' && styleValue !== '0px') {
                                newStyleValueInput.value = styleValue;
                            } else {
                                // 如果当前元素没有该样式，提供常用默认值
                                const defaultValues = {
                                    'color': '#000000',
                                    'background-color': '#ffffff',
                                    'font-size': '14px',
                                    'font-family': 'Arial, sans-serif',
                                    'font-weight': 'normal',
                                    'margin': '0px',
                                    'padding': '0px',
                                    'border': '1px solid #ccc',
                                    'border-radius': '4px',
                                    'width': 'auto',
                                    'height': 'auto',
                                    'display': 'block',
                                    'position': 'static',
                                    'opacity': '1',
                                    'visibility': 'visible',
                                    'z-index': 'auto',
                                    'text-align': 'left',
                                    'line-height': 'normal',
                                    'box-shadow': 'none',
                                    'text-shadow': 'none',
                                    'cursor': 'default',
                                    'overflow': 'visible',
                                    'transition': 'none'
                                };

                                if (defaultValues[stylePropSelect.value]) {
                                    newStyleValueInput.value = defaultValues[stylePropSelect.value];
                                } else {
                                    newStyleValueInput.value = '';
                                }
                            }
                        }
                    } catch (e) {
                        console.error('获取样式值失败:', e);
                        newStyleValueInput.value = '';
                    }
                }
            });

            newStyleRow.appendChild(stylePropSection);
            newStyleRow.appendChild(manualInputSection);
            newStyleRow.appendChild(styleValueSection);
            addStyleContainer.appendChild(newStyleRow);

            const addButton = UIManager.createButton('添加', 'primary', () => {
                const newProp = newStylePropInput.value.trim();
                const newValue = newStyleValueInput.value.trim();

                if (newProp && newValue) {
                    styles[newProp] = newValue;
                    renderStyleList(styles);
                    newStylePropInput.value = '';
                    newStyleValueInput.value = '';
                    stylePropSelect.value = '';
                    this.showToast('样式添加成功', 'success');
                } else {
                    this.showToast('请填写完整的样式属性和值', 'warning');
                }
            });
            addStyleContainer.appendChild(addButton);
            panel.appendChild(addStyleContainer);

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';

            const cancelButton = UIManager.createButton('取消', 'secondary', () => {
                document.body.removeChild(panel);
                if (onSaveCallback) onSaveCallback();
            });

            const saveButton = UIManager.createButton('保存', 'primary', () => {
                const newSelector = selectorInput.value.trim();
                if (!newSelector) {
                    this.showToast('请输入有效的选择器', 'error');
                    return;
                }

                // 根据选择的类型更新选择器
                let finalSelector = newSelector;
                if (idRadio.checked && !newSelector.startsWith('#')) {
                    finalSelector = `#${newSelector}`;
                } else if (classRadio.checked) {
                    // 对于class选择器，如果已经有标签名，不需要额外加点
                    if (!newSelector.includes('.') && !newSelector.startsWith('#')) {
                        // 如果没有标签名，添加默认的div标签
                        finalSelector = `div.${newSelector}`;
                    }
                }

                // 如果选择器改变了，先删除旧的
                if (finalSelector !== selector) {
                    ElementModifier.removeStyleModification(selector);
                }

                if (ElementModifier.addStyleModification(finalSelector, styles)) {
                    ElementModifier.applyStyleModifications();
                    document.body.removeChild(panel);
                    this.showToast('样式修改已保存', 'success');
                    if (onSaveCallback) onSaveCallback();
                }
            });

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);
            panel.appendChild(buttonContainer);

            // 渲染样式列表
            const renderStyleList = (styles) => {
                styleList.innerHTML = '';
                styleList.appendChild(styleListTitle);

                Object.keys(styles).forEach(prop => {
                    const styleItem = document.createElement('div');
                    styleItem.style.display = 'flex';
                    styleItem.style.justifyContent = 'space-between';
                    styleItem.style.alignItems = 'center';
                    styleItem.style.marginBottom = '8px';
                    styleItem.style.padding = '8px';
                    styleItem.style.backgroundColor = '#f8f9fa';
                    styleItem.style.borderRadius = '4px';

                    const leftContainer = document.createElement('div');
                    leftContainer.style.display = 'flex';
                    leftContainer.style.flexDirection = 'column';
                    leftContainer.style.flex = '1';
                    leftContainer.style.cursor = 'pointer';

                    const propText = document.createElement('span');
                    propText.textContent = prop;
                    propText.style.fontWeight = 'bold';

                    const valueText = document.createElement('span');
                    valueText.textContent = styles[prop];
                    valueText.style.color = '#5f6368';
                    valueText.style.fontSize = '12px';

                    leftContainer.appendChild(propText);
                    leftContainer.appendChild(valueText);

                    // 删除样式按钮
                    const deleteButton = UIManager.createButton('删除', 'danger', (e) => {
                        e.stopPropagation(); // 阻止事件冒泡
                        if (confirm(`确定要删除 ${prop} 样式吗？`)) {
                            // 直接更新存储中的样式数据
                            const selector = selectorInput.value.trim();
                            if (selector) {
                                const modifications = StorageManager.getStyleModifications();
                                const currentStyles = modifications[selector] || {};

                                // 创建新的样式对象，不包含要删除的属性
                                const newStyles = {...currentStyles};
                                delete newStyles[prop];

                                if (Object.keys(newStyles).length === 0) {
                                    // 如果所有样式都被删除了，完全移除该选择器的样式修改
                                    ElementModifier.removeStyleModification(selector);
                                } else {
                                    // 还有样式存在，直接更新存储
                                    modifications[selector] = newStyles;
                                    StorageManager.saveStyleModifications(modifications);
                                }
                                ElementModifier.applyStyleModifications();

                                // 更新当前编辑的样式对象
                                Object.keys(styles).forEach(key => delete styles[key]);
                                Object.assign(styles, newStyles);

                                renderStyleList(styles);
                                styleValueInput.value = '';
                                styleDescription.textContent = '';
                                currentEditingProp = null;

                                this.showToast('样式已删除', 'success');
                            }
                        }
                    });
                    deleteButton.style.padding = '4px 8px';
                    deleteButton.style.fontSize = '12px';

                    styleItem.appendChild(leftContainer);
                    styleItem.appendChild(deleteButton);

                    leftContainer.addEventListener('click', () => {
                        styleValueInput.value = styles[prop];
                        styleDescription.textContent = `正在编辑: ${prop}`;
                        currentEditingProp = prop;
                    });

                    styleList.appendChild(styleItem);
                });
            };

            let currentEditingProp = null;
            renderStyleList(styles);

            // 样式值修改事件
            styleValueInput.addEventListener('change', () => {
                if (currentEditingProp) {
                    styles[currentEditingProp] = styleValueInput.value;
                    renderStyleList(styles);
                    this.showToast('样式值已更新', 'info');
                }
            });

            document.body.appendChild(panel);
        }

        static showImportExportTab(container) {
            const title = document.createElement('h3');
            title.textContent = '导入/导出修改';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            title.style.color = '#202124';
            container.appendChild(title);

            // 导出部分
            const exportSection = document.createElement('div');
            exportSection.style.marginBottom = '20px';

            const exportButton = UIManager.createButton('导出修改', 'primary', () => {
                const pageId = Utils.getPageId();
                const data = {
                    type: 'page_modifications',
                    hideModifications: StorageManager.getHideModifications(),
                    styleModifications: StorageManager.getStyleModifications(),
                    pageUrl: window.location.href,
                    exportedAt: new Date().toISOString()
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
            container.appendChild(exportSection);

            // 导入部分
            const importSection = document.createElement('div');

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';

            const importButton = UIManager.createButton('导入修改', 'primary', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length === 0) return;

                const file = fileInput.files[0];
                const reader = new FileReader();

                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);

                        if (!data.hideModifications || !data.styleModifications) {
                            throw new Error('无效的导入文件格式');
                        }

                        if (confirm(`确定要导入${data.pageUrl || '未知页面'}的修改到当前页面吗？`)) {
                            const pageId = Utils.getPageId();
                            const allHideModifications = GM_getValue(STORAGE_KEYS.HIDE, {});
                            allHideModifications[pageId] = data.hideModifications;
                            GM_setValue(STORAGE_KEYS.HIDE, allHideModifications);

                            const allStyleModifications = GM_getValue(STORAGE_KEYS.STYLE, {});
                            allStyleModifications[pageId] = data.styleModifications;
                            GM_setValue(STORAGE_KEYS.STYLE, allStyleModifications);

                            ElementModifier.applyHideModifications();
                            ElementModifier.applyStyleModifications();
                            this.showToast('导入成功！', 'success');
                            UIManager.updateTabContent('hide', container);
                        }
                    } catch (e) {
                        this.showToast('导入失败: ' + e.message, 'error');
                    }
                };

                reader.readAsText(file);
            });

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '8px';
            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(importButton);
            importSection.appendChild(buttonContainer);
            importSection.appendChild(fileInput);
            container.appendChild(importSection);
        }

        static showDefaultModificationsTab(container) {
            // 清空容器，避免重复渲染
            container.innerHTML = '';

            const title = document.createElement('h3');
            title.textContent = '默认修改管理';
            title.style.margin = '0 0 15px 0';
            title.style.fontSize = '16px';
            title.style.color = '#202124';
            container.appendChild(title);

            // 添加/编辑按钮
            const addButton = UIManager.createButton('添加/编辑默认修改', 'primary', () => {
                this.showDefaultModificationModal();
            });
            addButton.style.marginBottom = '20px';
            container.appendChild(addButton);

            // 导入导出部分
            const importExportSection = document.createElement('div');
            importExportSection.style.marginBottom = '20px';

            const importExportTitle = document.createElement('h4');
            importExportTitle.textContent = '导入/导出默认修改';
            importExportTitle.style.margin = '0 0 10px 0';
            importExportTitle.style.fontSize = '14px';
            importExportSection.appendChild(importExportTitle);

            const exportButton = UIManager.createButton('导出所有默认修改', 'primary', () => {
                const defaultMods = StorageManager.getDefaultModifications();
                if (Object.keys(defaultMods).length === 0) {
                    this.showToast('没有可导出的默认修改', 'warning');
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

            const importButton = UIManager.createButton('导入默认修改', 'primary', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length === 0) return;

                const file = fileInput.files[0];
                const reader = new FileReader();

                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        let importedMods = {};

                        if (data.type === 'default_modifications' && data.modifications) {
                            importedMods = data.modifications;
                        } else if (data.type === 'page_modifications') {
                            const pattern = Utils.escapeRegExp(window.location.href);
                            importedMods[pattern] = {
                                hideModifications: data.hideModifications || [],
                                styleModifications: data.styleModifications || {}
                            };
                        } else if (typeof data === 'object' && data !== null) {
                            importedMods = data;
                        } else {
                            throw new Error('无法识别的导入文件格式');
                        }

                        if (confirm(`确定要导入 ${Object.keys(importedMods).length} 个默认修改吗？`)) {
                            const currentMods = StorageManager.getDefaultModifications();
                            const mergedMods = {...currentMods, ...importedMods};
                            StorageManager.saveDefaultModifications(mergedMods);
                            this.showToast('导入成功！', 'success');
                            this.showDefaultModificationsTab(container);
                        }
                    } catch (e) {
                        this.showToast('导入失败: ' + e.message, 'error');
                    }
                };

                reader.readAsText(file);
            });

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '8px';
            buttonContainer.appendChild(exportButton);
            buttonContainer.appendChild(importButton);
            importExportSection.appendChild(buttonContainer);
            importExportSection.appendChild(fileInput);
            container.appendChild(importExportSection);

            // 显示现有的默认修改
            const listSection = document.createElement('div');

            const listTitle = document.createElement('h4');
            listTitle.textContent = '现有的默认修改';
            listTitle.style.margin = '0 0 10px 0';
            listTitle.style.fontSize = '14px';
            listSection.appendChild(listTitle);

            const defaultMods = StorageManager.getDefaultModifications();
            const patterns = Object.keys(defaultMods);

            if (patterns.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '没有已保存的默认修改';
                emptyMsg.style.margin = '0';
                emptyMsg.style.fontSize = '14px';
                emptyMsg.style.color = '#666';
                listSection.appendChild(emptyMsg);
            } else {
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.marginBottom = '15px';
                table.style.fontSize = '14px';

                // 表头
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headerRow.style.backgroundColor = '#f1f3f4';

                ['序号', '备注', '操作'].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    th.style.padding = '8px';
                    th.style.textAlign = 'left';
                    th.style.borderBottom = '1px solid #ddd';
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                // 表体
                const tbody = document.createElement('tbody');

                patterns.forEach((pattern, index) => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #eee';

                    if (index % 2 === 0) {
                        row.style.backgroundColor = '#f8f9fa';
                    }

                    // 序号
                    const indexCell = document.createElement('td');
                    indexCell.textContent = index + 1;
                    indexCell.style.padding = '8px';
                    indexCell.style.textAlign = 'center';
                    row.appendChild(indexCell);

                    // 备注
                    const noteCell = document.createElement('td');
                    const note = defaultMods[pattern].note || '无备注';
                    noteCell.textContent = note;
                    noteCell.style.padding = '8px';
                    noteCell.style.maxWidth = '200px';
                    noteCell.style.overflow = 'hidden';
                    noteCell.style.textOverflow = 'ellipsis';
                    noteCell.style.whiteSpace = 'nowrap';
                    row.appendChild(noteCell);

                    // 操作
                    const actionCell = document.createElement('td');
                    actionCell.style.padding = '8px';

                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.gap = '5px';
                    buttonContainer.style.flexWrap = 'wrap';

                    // 查看按钮
                    const viewButton = UIManager.createButton('查看', 'secondary', () => {
                        const mods = defaultMods[pattern];
                        UIManager.showDefaultModificationViewModal(pattern, mods);
                    });
                    viewButton.style.padding = '2px 5px';
                    viewButton.style.fontSize = '12px';

                    // 编辑按钮
                    const editButton = UIManager.createButton('编辑', 'secondary', () => {
                        const mods = defaultMods[pattern];
                        UIManager.showDefaultModificationModal(pattern, mods);
                    });
                    editButton.style.padding = '2px 5px';
                    editButton.style.fontSize = '12px';

                    // 应用按钮
                    const applyButton = UIManager.createButton('应用', 'secondary', () => {
                        const mods = defaultMods[pattern];
                        const pageId = Utils.getPageId();
                        const allHideMods = GM_getValue(STORAGE_KEYS.HIDE, {});
                        allHideMods[pageId] = mods.hideModifications || [];
                        GM_setValue(STORAGE_KEYS.HIDE, allHideMods);

                        const allStyleMods = GM_getValue(STORAGE_KEYS.STYLE, {});
                        allStyleMods[pageId] = mods.styleModifications || {};
                        GM_setValue(STORAGE_KEYS.STYLE, allStyleMods);

                        ElementModifier.applyHideModifications();
                        ElementModifier.applyStyleModifications();
                        this.showToast('默认修改已应用到当前页面！', 'success');
                    });
                    applyButton.style.padding = '2px 5px';
                    applyButton.style.fontSize = '12px';

                    // 测试按钮
                    const testButton = UIManager.createButton('测试', 'secondary', () => {
                        try {
                            const regex = new RegExp(pattern);
                            const currentUrl = window.location.href;
                            const matches = regex.test(currentUrl);
                            this.showToast(`URL模式: ${pattern}<br>当前URL: ${currentUrl}<br>匹配结果: ${matches ? '匹配成功' : '匹配失败'}`, 'info');
                        } catch (e) {
                            this.showToast('测试失败: ' + e.message, 'error');
                        }
                    });
                    testButton.style.padding = '2px 5px';
                    testButton.style.fontSize = '12px';

                    // 删除按钮
                    const deleteButton = UIManager.createButton('删除', 'danger', () => {
                        if (confirm('确定要删除这个默认修改吗？')) {
                            const defaultMods = StorageManager.getDefaultModifications();
                            delete defaultMods[pattern];
                            StorageManager.saveDefaultModifications(defaultMods);
                            this.showDefaultModificationsTab(container);
                        }
                    });
                    deleteButton.style.padding = '2px 5px';
                    deleteButton.style.fontSize = '12px';

                    buttonContainer.appendChild(viewButton);
                    buttonContainer.appendChild(editButton);
                    buttonContainer.appendChild(applyButton);
                    buttonContainer.appendChild(testButton);
                    buttonContainer.appendChild(deleteButton);
                    actionCell.appendChild(buttonContainer);
                    row.appendChild(actionCell);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                listSection.appendChild(table);
            }

            container.appendChild(listSection);
        }

        static showBulkEditModal(content, onSave) {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.zIndex = '999999';
            modal.style.backgroundColor = '#ffffff';
            modal.style.padding = '25px';
            modal.style.borderRadius = '10px';
            modal.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            modal.style.width = '700px';
            modal.style.maxHeight = '85vh';
            modal.style.overflowY = 'auto';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '15px';
            closeButton.style.right = '15px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '24px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#5f6368';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            modal.appendChild(closeButton);

            const title = document.createElement('h3');
            title.textContent = '批量编辑';
            title.style.margin = '0 0 20px 0';
            title.style.fontSize = '20px';
            title.style.color = '#202124';
            title.style.fontWeight = '600';
            modal.appendChild(title);

            // 说明文本
            const description = document.createElement('p');
            description.textContent = '在此编辑JSON格式的数据。请确保格式正确，否则保存将失败。';
            description.style.margin = '0 0 15px 0';
            description.style.fontSize = '14px';
            description.style.color = '#5f6368';
            description.style.lineHeight = '1.5';
            modal.appendChild(description);

            // 文本区域容器
            const textareaContainer = document.createElement('div');
            textareaContainer.style.flex = '1';
            textareaContainer.style.display = 'flex';
            textareaContainer.style.flexDirection = 'column';

            const textarea = document.createElement('textarea');
            textarea.style.width = '95%';
            textarea.style.height = '350px';
            textarea.style.marginBottom = '15px';
            textarea.style.padding = '15px';
            textarea.style.border = '1px solid #dadce0';
            textarea.style.borderRadius = '6px';
            textarea.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
            textarea.style.fontSize = '13px';
            textarea.style.lineHeight = '1.4';
            textarea.style.resize = 'vertical';
            textarea.value = content;
            // 防止默认选中文字
            textarea.addEventListener('focus', () => {
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
                }, 0);
            });
            textareaContainer.appendChild(textarea);

            // 操作按钮区域
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.marginTop = '10px';

            // 左侧按钮组
            const leftButtons = document.createElement('div');
            leftButtons.style.display = 'flex';
            leftButtons.style.gap = '8px';

            // 格式化按钮
            const formatButton = UIManager.createButton('格式化', 'secondary', () => {
                try {
                    const parsed = JSON.parse(textarea.value);
                    textarea.value = JSON.stringify(parsed, null, 2);
                    this.showToast('JSON已格式化', 'success');
                } catch (e) {
                    this.showToast('JSON格式错误，无法格式化: ' + e.message, 'error');
                }
            });
            formatButton.style.padding = '8px 16px';

            // 验证按钮
            const validateButton = UIManager.createButton('验证', 'secondary', () => {
                try {
                    JSON.parse(textarea.value);
                    this.showToast('JSON格式正确', 'success');
                } catch (e) {
                    this.showToast('JSON格式错误: ' + e.message, 'error');
                }
            });
            validateButton.style.padding = '8px 16px';

            leftButtons.appendChild(formatButton);
            leftButtons.appendChild(validateButton);

            // 右侧按钮组
            const rightButtons = document.createElement('div');
            rightButtons.style.display = 'flex';
            rightButtons.style.gap = '8px';

            const cancelButton = UIManager.createButton('取消', 'secondary', () => {
                document.body.removeChild(modal);
            });
            cancelButton.style.padding = '10px 20px';

            const saveButton = UIManager.createButton('保存', 'primary', () => {
                try {
                    const parsed = JSON.parse(textarea.value);
                    onSave(parsed);
                    document.body.removeChild(modal);
                    this.showToast('批量修改已保存', 'success');
                } catch (e) {
                    this.showToast('保存失败: ' + e.message, 'error');
                }
            });
            saveButton.style.padding = '10px 20px';

            rightButtons.appendChild(cancelButton);
            rightButtons.appendChild(saveButton);

            buttonContainer.appendChild(leftButtons);
            buttonContainer.appendChild(rightButtons);

            textareaContainer.appendChild(buttonContainer);
            modal.appendChild(textareaContainer);

            // 自动聚焦到文本区域
            setTimeout(() => {
                textarea.focus();
                textarea.select();
            }, 100);

            document.body.appendChild(modal);
        }

        static showDefaultModificationModal(existingPattern = null, existingMods = null) {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.zIndex = '999999';
            modal.style.backgroundColor = '#ffffff';
            modal.style.padding = '25px';
            modal.style.borderRadius = '10px';
            modal.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            modal.style.width = '700px';
            modal.style.maxHeight = '85vh';
            modal.style.overflowY = 'auto';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '15px';
            closeButton.style.right = '15px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '24px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#5f6368';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            modal.appendChild(closeButton);

            const title = document.createElement('h3');
            title.textContent = existingPattern ? '编辑默认修改' : '添加默认修改';
            title.style.margin = '0 0 20px 0';
            title.style.fontSize = '20px';
            title.style.color = '#202124';
            title.style.fontWeight = '600';
            modal.appendChild(title);

            // 表单容器
            const formContainer = document.createElement('div');
            formContainer.style.flex = '1';
            formContainer.style.display = 'flex';
            formContainer.style.flexDirection = 'column';
            formContainer.style.gap = '15px';

            // 备注输入框
            const noteContainer = document.createElement('div');
            noteContainer.style.display = 'flex';
            noteContainer.style.flexDirection = 'column';
            noteContainer.style.gap = '5px';

            const noteLabel = document.createElement('label');
            noteLabel.textContent = '备注（可选）';
            noteLabel.style.fontWeight = '500';
            noteLabel.style.fontSize = '14px';
            noteContainer.appendChild(noteLabel);

            const noteInput = document.createElement('input');
            noteInput.type = 'text';
            noteInput.placeholder = '输入备注信息，便于识别这个默认修改';
            noteInput.style.padding = '10px';
            noteInput.style.border = '1px solid #dadce0';
            noteInput.style.borderRadius = '6px';
            noteInput.style.fontSize = '14px';
            // 如果存在现有修改，填充备注
            if (existingMods && existingMods.note) {
                noteInput.value = existingMods.note;
            }
            noteContainer.appendChild(noteInput);

            // URL模式输入框
            const urlContainer = document.createElement('div');
            urlContainer.style.display = 'flex';
            urlContainer.style.flexDirection = 'column';
            urlContainer.style.gap = '5px';

            const urlLabel = document.createElement('label');
            urlLabel.textContent = 'URL模式（正则表达式）*';
            urlLabel.style.fontWeight = '500';
            urlLabel.style.fontSize = '14px';
            urlContainer.appendChild(urlLabel);

            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = '例如：baidu.com/*';
            urlInput.style.padding = '10px';
            urlInput.style.border = '1px solid #dadce0';
            urlInput.style.borderRadius = '6px';
            urlInput.style.fontSize = '14px';
            urlInput.required = true;
            if (existingPattern) {
                urlInput.value = existingPattern;
            }
            urlContainer.appendChild(urlInput);

            // JSON数据输入区域
            const jsonContainer = document.createElement('div');
            jsonContainer.style.display = 'flex';
            jsonContainer.style.flexDirection = 'column';
            jsonContainer.style.gap = '5px';

            const jsonLabel = document.createElement('label');
            jsonLabel.textContent = '修改数据（JSON格式）*';
            jsonLabel.style.fontWeight = '500';
            jsonLabel.style.fontSize = '14px';
            jsonContainer.appendChild(jsonLabel);

            const jsonTextarea = document.createElement('textarea');
            jsonTextarea.style.width = '95%';
            jsonTextarea.style.height = '200px';
            jsonTextarea.style.padding = '10px';
            jsonTextarea.style.border = '1px solid #dadce0';
            jsonTextarea.style.borderRadius = '6px';
            jsonTextarea.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
            jsonTextarea.style.fontSize = '13px';
            jsonTextarea.style.lineHeight = '1.4';
            jsonTextarea.style.resize = 'vertical';
            jsonTextarea.required = true;

            // 设置默认JSON模板
            const defaultJson = {
                hideModifications: [],
                styleModifications: {}
            };

            if (existingMods) {
                jsonTextarea.value = JSON.stringify(existingMods, null, 2);
            } else {
                jsonTextarea.value = JSON.stringify(defaultJson, null, 2);
            }
            jsonContainer.appendChild(jsonTextarea);

            // JSON格式说明
            const jsonHelp = document.createElement('div');
            jsonHelp.innerHTML = 'JSON格式说明：<br>' +
                '• <code>hideModifications</code> - 要隐藏的元素选择器数组<br>' +
                '• <code>styleModifications</code> - 样式修改对象，键为选择器，值为样式对象';
            jsonHelp.style.fontSize = '12px';
            jsonHelp.style.color = '#5f6368';
            jsonHelp.style.padding = '8px';
            jsonHelp.style.backgroundColor = '#f8f9fa';
            jsonHelp.style.borderRadius = '4px';
            jsonHelp.style.marginTop = '5px';
            jsonContainer.appendChild(jsonHelp);

            // 操作按钮区域
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.marginTop = '20px';

            // 左侧按钮组
            const leftButtons = document.createElement('div');
            leftButtons.style.display = 'flex';
            leftButtons.style.gap = '8px';

            // 格式化按钮
            const formatButton = UIManager.createButton('格式化JSON', 'secondary', () => {
                try {
                    const parsed = JSON.parse(jsonTextarea.value);
                    jsonTextarea.value = JSON.stringify(parsed, null, 2);
                    this.showToast('JSON已格式化', 'success');
                } catch (e) {
                    this.showToast('JSON格式错误，无法格式化: ' + e.message, 'error');
                }
            });
            formatButton.style.padding = '8px 16px';

            // 验证按钮
            const validateButton = UIManager.createButton('验证JSON', 'secondary', () => {
                try {
                    JSON.parse(jsonTextarea.value);
                    this.showToast('JSON格式正确', 'success');
                } catch (e) {
                    this.showToast('JSON格式错误: ' + e.message, 'error');
                }
            });
            validateButton.style.padding = '8px 16px';

            // 从当前页面导入按钮
            const importButton = UIManager.createButton('从当前页面导入', 'secondary', () => {
                const currentHideMods = StorageManager.getHideModifications();
                const currentStyleMods = StorageManager.getStyleModifications();

                const mods = {
                    hideModifications: currentHideMods,
                    styleModifications: currentStyleMods
                };

                jsonTextarea.value = JSON.stringify(mods, null, 2);
                this.showToast('已从当前页面导入修改数据', 'success');
            });
            importButton.style.padding = '8px 16px';

            leftButtons.appendChild(formatButton);
            leftButtons.appendChild(validateButton);
            leftButtons.appendChild(importButton);

            // 右侧按钮组
            const rightButtons = document.createElement('div');
            rightButtons.style.display = 'flex';
            rightButtons.style.gap = '8px';

            const cancelButton = UIManager.createButton('取消', 'secondary', () => {
                document.body.removeChild(modal);
            });
            cancelButton.style.padding = '10px 20px';

            const saveButton = UIManager.createButton('保存', 'primary', () => {
                // 验证必填字段
                if (!urlInput.value.trim()) {
                    this.showToast('请输入URL模式', 'error');
                    urlInput.focus();
                    return;
                }

                if (!jsonTextarea.value.trim()) {
                    this.showToast('请输入修改数据', 'error');
                    jsonTextarea.focus();
                    return;
                }

                try {
                    // 验证URL模式是否为有效的正则表达式
                    new RegExp(urlInput.value.trim());
                } catch (e) {
                    this.showToast('URL模式不是有效的正则表达式: ' + e.message, 'error');
                    urlInput.focus();
                    return;
                }

                try {
                    // 验证JSON格式
                    const mods = JSON.parse(jsonTextarea.value);

                    // 验证JSON结构
                    if (typeof mods !== 'object' || mods === null) {
                        throw new Error('修改数据必须是有效的JSON对象');
                    }

                    // 保存到默认修改
                    const defaultMods = StorageManager.getDefaultModifications();
                    const pattern = urlInput.value.trim();

                    // 如果URL发生变化，删除旧的记录
                    if (existingPattern && existingPattern !== pattern) {
                        delete defaultMods[existingPattern];
                    }

                    defaultMods[pattern] = {
                        ...mods,
                        note: noteInput.value.trim() || null,
                        createdAt: existingMods ? existingMods.createdAt : new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    StorageManager.saveDefaultModifications(defaultMods);

                    document.body.removeChild(modal);
                    this.showToast(existingPattern ? '默认修改已更新' : '默认修改已添加', 'success');

                    // 刷新默认修改页面
                    const panels = document.querySelectorAll('[style*="position: fixed"][style*="right: 15px"]');
                    if (panels.length > 0) {
                        const panel = panels[0];
                        const contentContainer = panel.querySelector('div[style*="overflow-y: auto"]');
                        if (contentContainer) {
                            this.showDefaultModificationsTab(contentContainer);
                        }
                    }
                } catch (e) {
                    this.showToast('保存失败: ' + e.message, 'error');
                }
            });
            saveButton.style.padding = '10px 20px';

            rightButtons.appendChild(cancelButton);
            rightButtons.appendChild(saveButton);

            buttonContainer.appendChild(leftButtons);
            buttonContainer.appendChild(rightButtons);

            // 组装表单
            formContainer.appendChild(noteContainer);
            formContainer.appendChild(urlContainer);
            formContainer.appendChild(jsonContainer);
            formContainer.appendChild(buttonContainer);
            modal.appendChild(formContainer);

            document.body.appendChild(modal);

            // 自动聚焦到URL输入框
            setTimeout(() => {
                if (!existingPattern) {
                    urlInput.focus();
                } else {
                    noteInput.focus();
                }
            }, 100);
        }

        static showDefaultModificationViewModal(pattern, mods) {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.zIndex = '999999';
            modal.style.backgroundColor = '#ffffff';
            modal.style.padding = '25px';
            modal.style.borderRadius = '10px';
            modal.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            modal.style.width = '700px';
            modal.style.maxHeight = '85vh';
            modal.style.overflowY = 'auto';
            modal.style.display = 'flex';
            modal.style.flexDirection = 'column';

            // 关闭按钮
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '15px';
            closeButton.style.right = '15px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.fontSize = '24px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.color = '#5f6368';
            closeButton.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
            modal.appendChild(closeButton);

            const title = document.createElement('h3');
            title.textContent = '查看默认修改';
            title.style.margin = '0 0 20px 0';
            title.style.fontSize = '20px';
            title.style.color = '#202124';
            title.style.fontWeight = '600';
            modal.appendChild(title);

            // 内容容器
            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            contentContainer.style.display = 'flex';
            contentContainer.style.flexDirection = 'column';
            contentContainer.style.gap = '15px';

            // 基本信息区域
            const infoSection = document.createElement('div');
            infoSection.style.padding = '15px';
            infoSection.style.backgroundColor = '#f8f9fa';
            infoSection.style.borderRadius = '6px';

            // 备注
            const noteItem = document.createElement('div');
            noteItem.style.marginBottom = '10px';
            const noteLabel = document.createElement('strong');
            noteLabel.textContent = '备注：';
            noteLabel.style.color = '#5f6368';
            const noteValue = document.createElement('span');
            noteValue.textContent = mods.note || '无备注';
            noteItem.appendChild(noteLabel);
            noteItem.appendChild(noteValue);
            infoSection.appendChild(noteItem);

            // URL模式
            const urlItem = document.createElement('div');
            urlItem.style.marginBottom = '10px';
            const urlLabel = document.createElement('strong');
            urlLabel.textContent = 'URL模式：';
            urlLabel.style.color = '#5f6368';
            const urlValue = document.createElement('code');
            urlValue.textContent = pattern;
            urlValue.style.backgroundColor = '#e8f0fe';
            urlValue.style.padding = '2px 6px';
            urlValue.style.borderRadius = '3px';
            urlValue.style.fontSize = '13px';
            urlItem.appendChild(urlLabel);
            urlItem.appendChild(urlValue);
            infoSection.appendChild(urlItem);

            // 创建时间
            if (mods.createdAt) {
                const createdAtItem = document.createElement('div');
                createdAtItem.style.marginBottom = '10px';
                const createdAtLabel = document.createElement('strong');
                createdAtLabel.textContent = '创建时间：';
                createdAtLabel.style.color = '#5f6368';
                const createdAtValue = document.createElement('span');
                createdAtValue.textContent = new Date(mods.createdAt).toLocaleString();
                createdAtItem.appendChild(createdAtLabel);
                createdAtItem.appendChild(createdAtValue);
                infoSection.appendChild(createdAtItem);
            }

            // 更新时间
            if (mods.updatedAt) {
                const updatedAtItem = document.createElement('div');
                updatedAtItem.style.marginBottom = '10px';
                const updatedAtLabel = document.createElement('strong');
                updatedAtLabel.textContent = '更新时间：';
                updatedAtLabel.style.color = '#5f6368';
                const updatedAtValue = document.createElement('span');
                updatedAtValue.textContent = new Date(mods.updatedAt).toLocaleString();
                updatedAtItem.appendChild(updatedAtLabel);
                updatedAtItem.appendChild(updatedAtValue);
                infoSection.appendChild(updatedAtItem);
            }

            contentContainer.appendChild(infoSection);

            // 隐藏规则区域
            const hideSection = document.createElement('div');
            hideSection.style.padding = '15px';
            hideSection.style.backgroundColor = '#fff3e0';
            hideSection.style.borderRadius = '6px';
            hideSection.style.border = '1px solid #ffb74d';

            const hideTitle = document.createElement('h4');
            hideTitle.textContent = '隐藏规则';
            hideTitle.style.margin = '0 0 10px 0';
            hideTitle.style.color = '#e65100';
            hideSection.appendChild(hideTitle);

            if (mods.hideModifications && mods.hideModifications.length > 0) {
                const hideList = document.createElement('ul');
                hideList.style.margin = '0';
                hideList.style.paddingLeft = '20px';

                mods.hideModifications.forEach(selector => {
                    const listItem = document.createElement('li');
                    listItem.textContent = selector;
                    listItem.style.marginBottom = '5px';
                    listItem.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
                    listItem.style.fontSize = '13px';
                    hideList.appendChild(listItem);
                });

                hideSection.appendChild(hideList);
            } else {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '无隐藏规则';
                emptyMsg.style.margin = '0';
                emptyMsg.style.color = '#666';
                hideSection.appendChild(emptyMsg);
            }

            contentContainer.appendChild(hideSection);

            // 样式修改区域
            const styleSection = document.createElement('div');
            styleSection.style.padding = '15px';
            styleSection.style.backgroundColor = '#e8f5e8';
            styleSection.style.borderRadius = '6px';
            styleSection.style.border = '1px solid #4caf50';

            const styleTitle = document.createElement('h4');
            styleTitle.textContent = '样式修改';
            styleTitle.style.margin = '0 0 10px 0';
            styleTitle.style.color = '#2e7d32';
            styleSection.appendChild(styleTitle);

            if (mods.styleModifications && Object.keys(mods.styleModifications).length > 0) {
                Object.keys(mods.styleModifications).forEach(selector => {
                    const selectorItem = document.createElement('div');
                    selectorItem.style.marginBottom = '15px';

                    const selectorLabel = document.createElement('div');
                    selectorLabel.textContent = selector;
                    selectorLabel.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
                    selectorLabel.style.fontSize = '13px';
                    selectorLabel.style.fontWeight = 'bold';
                    selectorLabel.style.marginBottom = '5px';
                    selectorItem.appendChild(selectorLabel);

                    const styles = mods.styleModifications[selector];
                    const styleList = document.createElement('ul');
                    styleList.style.margin = '0';
                    styleList.style.paddingLeft = '20px';

                    Object.keys(styles).forEach(styleKey => {
                        const styleItem = document.createElement('li');
                        styleItem.textContent = `${styleKey}: ${styles[styleKey]}`;
                        styleItem.style.marginBottom = '3px';
                        styleItem.style.fontSize = '12px';
                        styleList.appendChild(styleItem);
                    });

                    selectorItem.appendChild(styleList);
                    styleSection.appendChild(selectorItem);
                });
            } else {
                const emptyMsg = document.createElement('p');
                emptyMsg.textContent = '无样式修改';
                emptyMsg.style.margin = '0';
                emptyMsg.style.color = '#666';
                styleSection.appendChild(emptyMsg);
            }

            contentContainer.appendChild(styleSection);

            // 操作按钮区域
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.marginTop = '20px';

            const cancelButton = UIManager.createButton('取消', 'secondary', () => {
                document.body.removeChild(modal);
            });
            cancelButton.style.padding = '10px 20px';

            const editButton = UIManager.createButton('编辑', 'primary', () => {
                document.body.removeChild(modal);
                UIManager.showDefaultModificationModal(pattern, mods);
            });
            editButton.style.padding = '10px 20px';

            const deleteButton = UIManager.createButton('删除', 'danger', () => {
                if (confirm('确定要删除这个默认修改吗？')) {
                    const defaultMods = StorageManager.getDefaultModifications();
                    delete defaultMods[pattern];
                    StorageManager.saveDefaultModifications(defaultMods);
                    document.body.removeChild(modal);
                    this.showToast('默认修改已删除', 'success');

                    // 刷新默认修改页面
                    const panels = document.querySelectorAll('[style*="position: fixed"][style*="right: 15px"]');
                    if (panels.length > 0) {
                        const panel = panels[0];
                        const contentContainer = panel.querySelector('div[style*="overflow-y: auto"]');
                        if (contentContainer) {
                            this.showDefaultModificationsTab(contentContainer);
                        }
                    }
                }
            });
            deleteButton.style.padding = '10px 20px';

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(editButton);
            buttonContainer.appendChild(deleteButton);

            contentContainer.appendChild(buttonContainer);
            modal.appendChild(contentContainer);

            document.body.appendChild(modal);
        }

        static showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.innerHTML = message;
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.padding = '12px 24px';
            toast.style.borderRadius = '4px';
            toast.style.backgroundColor = this.getToastColor(type);
            toast.style.color = '#ffffff';
            toast.style.zIndex = '999999';
            toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            toast.style.transition = 'opacity 0.3s ease-in-out';
            toast.style.opacity = '0';
            toast.style.whiteSpace = 'pre-line';

            document.body.appendChild(toast);

            // 显示动画
            setTimeout(() => {
                toast.style.opacity = '1';
            }, 10);

            // 3秒后自动消失
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }

        static getToastColor(type) {
            const colors = {
                'info': '#2196F3',
                'success': '#4CAF50',
                'warning': '#FF9800',
                'error': '#F44336'
            };
            return colors[type] || colors.info;
        }
    }

    // 元素编辑器
    class ElementEditor {
        constructor() {
            this.editMode = false;
            this.hoveredElement = null;
            this.isEditingStyle = false;
        }

        highlightElement(element) {
            if (this.hoveredElement) {
                this.hoveredElement.style.outline = '';
                this.hoveredElement.style.backgroundColor = '';
            }

            const tagName = element.tagName.toLowerCase();
            if (tagName === 'html' || tagName === 'body') return;

            this.hoveredElement = element;
            element.style.outline = '2px solid #4285f4';
            element.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
        }

        removeHighlight() {
            if (this.hoveredElement) {
                this.hoveredElement.style.outline = '';
                this.hoveredElement.style.backgroundColor = '';
                this.hoveredElement = null;
            }
        }

        handleMouseMove(e) {
            if (!this.editMode || this.isEditingStyle) return;

            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (element && element !== this.hoveredElement) {
                const tagName = element.tagName.toLowerCase();
                if (tagName !== 'html' && tagName !== 'body') {
                    this.highlightElement(element);
                }
            }
        }

        handleLeftClick(e) {
            if (!this.editMode || e.button !== 0 || this.isEditingStyle) return;

            e.preventDefault();
            e.stopPropagation();

            if (this.hoveredElement) {
                const tagName = this.hoveredElement.tagName.toLowerCase();
                if (tagName === 'html' || tagName === 'body') {
                    this.showToast('不能隐藏html或body元素！', 'error');
                    return;
                }

                // 使用和修改样式相同的选择器生成机制
                const selector = this.generateSelector(this.hoveredElement);
                if (selector && ElementModifier.addHideModification(selector)) {
                    // 应用隐藏到所有匹配的元素
                    try {
                        document.querySelectorAll(selector).forEach(el => {
                            el.style.display = 'none';
                        });
                        this.removeHighlight();
                    } catch (error) {
                        this.showToast('隐藏元素失败: ' + error.message, 'error');
                    }
                }
            }
        }

        handleRightClick(e) {
            if (!this.editMode || e.button !== 2 || this.isEditingStyle) return;

            e.preventDefault();
            e.stopPropagation();

            if (this.hoveredElement) {
                const tagName = this.hoveredElement.tagName.toLowerCase();
                if (tagName === 'html' || tagName === 'body') {
                    this.showToast('不能修改html或body元素的样式！', 'error');
                    return;
                }

                this.isEditingStyle = true;
                const selector = this.generateSelector(this.hoveredElement);
                if (!selector) {
                    this.isEditingStyle = false;
                    return;
                }

                const originalOutline = this.hoveredElement.style.outline;
                const originalBackground = this.hoveredElement.style.backgroundColor;
                this.hoveredElement.style.outline = '';
                this.hoveredElement.style.backgroundColor = '';

                // 只获取已保存的样式修改，不自动获取计算样式
                const savedStyles = StorageManager.getStyleModifications()[selector] || {};

                UIManager.showStyleEditor(selector, savedStyles, () => {
                    this.hoveredElement.style.outline = originalOutline;
                    this.hoveredElement.style.backgroundColor = originalBackground;
                    this.isEditingStyle = false;
                });
            }
        }

        generateSelector(element) {
            if (!element || !element.tagName) return null;

            const tagName = element.tagName.toLowerCase();
            if (tagName === 'html' || tagName === 'body') return null;

            let selector = tagName;

            // 优先使用class选择器
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.split(/\s+/).filter(c => c.length > 0);
                if (classes.length > 0) {
                    // 正确的CSS选择器格式：标签名.类名.类名（如 div.header.main）
                    selector += `.${classes.join('.')}`;
                    return selector;
                }
            }

            // 其次使用ID选择器
            if (element.id) {
                selector += `#${element.id}`;
                return selector;
            }

            // 如果只有标签名，添加父级选择器来确保唯一性
            if (selector === tagName) {
                // 向上查找父级元素，直到找到有ID或Class的父级
                let parent = element.parentNode;
                let levels = 0;

                while (parent && parent !== document && levels < 3) {
                    if (parent.id) {
                        selector = `#${parent.id} > ${selector}`;
                        break;
                    } else if (parent.className && typeof parent.className === 'string') {
                        const parentClasses = parent.className.split(/\s+/).filter(c => c.length > 0);
                        if (parentClasses.length > 0) {
                            selector = `${parent.tagName.toLowerCase()}.${parentClasses[0]} > ${selector}`;
                            break;
                        }
                    }
                    parent = parent.parentNode;
                    levels++;
                }

                // 如果还是没有找到合适的父级，使用:nth-child()来定位
                if (selector === tagName && element.parentNode) {
                    const children = Array.from(element.parentNode.children);
                    const index = children.indexOf(element) + 1;
                    selector += `:nth-child(${index})`;
                }
            }

            return selector;
        }

        generateUniqueSelector(element) {
            if (!element || !element.tagName) return null;

            const tagName = element.tagName.toLowerCase();
            if (tagName === 'html' || tagName === 'body') return null;

            // 生成基于元素在DOM中位置的唯一选择器
            let selector = '';
            let current = element;
            const path = [];

            while (current && current !== document) {
                let part = current.tagName.toLowerCase();

                if (current.id) {
                    part += `#${current.id}`;
                    path.unshift(part);
                    break;
                }

                if (current.className && typeof current.className === 'string') {
                    const classes = current.className.split(/\s+/).filter(c => c.length > 0);
                    if (classes.length > 0) {
                        part += `.${classes.join('.')}`;
                    }
                }

                // 添加:nth-child()来精确定位
                if (current.parentNode) {
                    const children = Array.from(current.parentNode.children);
                    const index = children.indexOf(current) + 1;
                    part += `:nth-child(${index})`;
                }

                path.unshift(part);
                current = current.parentNode;

                // 最多向上追溯3层
                if (path.length >= 3) break;
            }

            selector = path.join(' > ');

            // 如果选择器仍然不够具体，添加更多层级
            if (selector.split(' > ').length < 2) {
                let parent = element.parentNode;
                let levels = 0;
                while (parent && parent !== document && levels < 2) {
                    if (parent.id) {
                        selector = `#${parent.id} > ${selector}`;
                        break;
                    }
                    parent = parent.parentNode;
                    levels++;
                }
            }

            return selector;
        }

        toggleEditMode() {
            this.editMode = !this.editMode;

            if (this.editMode) {
                document.addEventListener('mousemove', this.handleMouseMove.bind(this));
                document.addEventListener('click', this.handleLeftClick.bind(this), true);
                document.addEventListener('contextmenu', this.handleRightClick.bind(this), true);
                this.showToast('已进入修改模式：<br>- 鼠标悬停元素会高亮显示<br>- 左键点击隐藏元素<br>- 右键点击编辑元素样式<br><br>注意：不能隐藏或修改html/body元素！', 'info');
            } else {
                document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
                document.removeEventListener('click', this.handleLeftClick.bind(this), true);
                document.removeEventListener('contextmenu', this.handleRightClick.bind(this), true);
                this.removeHighlight();
                this.showToast('已退出修改模式', 'info');
            }
        }

        showToast(message, type = 'info') {
            UIManager.showToast(message, type);
        }
    }

    // 主控制器
    class MainController {
        static init() {
            this.elementEditor = new ElementEditor();
            this.setupEventListeners();
            this.applyModificationsWithRetry();
            ElementModifier.checkAndApplyDefaultModifications();
        }

        static setupEventListeners() {
            // 注册菜单命令
            GM_registerMenuCommand('开始/停止修改', () => {
                this.elementEditor.toggleEditMode();
            });

            GM_registerMenuCommand('管理修改', () => {
                UIManager.createPanel();
            });

            GM_registerMenuCommand('暂停/恢复修改', () => {
                const currentlyPaused = StorageManager.getPauseState();
                const newPauseState = !currentlyPaused;
                StorageManager.setPauseState(newPauseState);

                if (newPauseState) {
                    // 恢复所有隐藏元素的显示
                    const modifications = StorageManager.getHideModifications();
                    modifications.forEach(selector => {
                        try {
                            document.querySelectorAll(selector).forEach(el => {
                                el.style.display = '';
                            });
                        } catch (e) {
                            console.error('恢复显示失败:', e);
                        }
                    });

                    // 恢复所有样式修改
                    const styleModifications = StorageManager.getStyleModifications();
                    Object.keys(styleModifications).forEach(selector => {
                        try {
                            document.querySelectorAll(selector).forEach(el => {
                                Object.keys(styleModifications[selector]).forEach(prop => {
                                    el.style[prop] = '';
                                });
                            });
                        } catch (e) {
                            console.error('恢复样式失败:', e);
                        }
                    });

                    this.elementEditor.showToast('已暂停所有修改，页面恢复原始状态', 'info');
                } else {
                    // 重新应用所有修改
                    ElementModifier.applyHideModifications();
                    ElementModifier.applyStyleModifications();
                    this.elementEditor.showToast('已恢复所有修改', 'info');
                }
            });
        }

        static applyModificationsWithRetry() {
            if (!StorageManager.getPauseState()) {
                ElementModifier.applyHideModifications();
                ElementModifier.applyStyleModifications();
            }
            setTimeout(this.applyModificationsWithRetry.bind(this), 5000);
        }
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MainController.init());
    } else {
        MainController.init();
    }
})();
