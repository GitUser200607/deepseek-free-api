// ==UserScript==
// @name         DeepSeek Admin Page UI EN
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Translate DeepSeek Proxy admin panel to English
// @match        http://localhost:8000/admin
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============ CONTEXTUAL TRANSLATION RULES ============
    const rules = [
        // Tabs by onclick
        { selector: '.tab[onclick*="switchTab(\'phone\')"]', text: "手机号登录", to: "Phone Login" },
        { selector: '.tab[onclick*="switchTab(\'email\')"]', text: "邮箱登录", to: "Email Login" },
        { selector: '.tab[onclick*="switchTab(\'usage\')"]', text: "用量统计", to: "Usage Stats" },
        { selector: '.tab[onclick*="switchTab(\'accounts\')"]', text: "账号管理", to: "Accounts" },

        // Status
        { selector: '#st', text: "等待配置", to: "Waiting for config" },
        { selector: '#st', text: "已配置", to: "Configured" },
        { selector: '#st', text: "未配置", to: "Not configured" },
        { selector: '#st', text: "连接失败", to: "Connection failed" },
        { selector: '#acctStat', text: "加载中...", to: "Loading..." },

        // Placeholders
        { selector: '#mobile', attr: 'placeholder', text: "手机号", to: "Phone number" },
        { selector: '#pw1', attr: 'placeholder', text: "密码", to: "Password" },
        { selector: '#pw2', attr: 'placeholder', text: "密码", to: "Password" },
        { selector: '#email', attr: 'placeholder', text: "邮箱地址", to: "Email address" },
        { selector: '#curl', attr: 'placeholder', text: "粘贴 cURL ...", to: "Paste cURL..." },

        // Buttons
        { selector: '#btn1', text: "登录", to: "Login" },
        { selector: '#btn2', text: "登录", to: "Login" },
        { selector: '#btn3', text: "保存 cURL", to: "Save cURL" },
        { selector: '[onclick="reloginAll()"]', text: "全部重新登录", to: "Re-login All" },
        { selector: '[onclick="cleanupSessions()"]', text: "清理过期会话", to: "Cleanup Sessions" },
        { selector: '[onclick="refreshModels()"]', text: "刷新模型列表", to: "Refresh Models" },
        { selector: '#refreshBtn', text: "🔄 刷新模型列表", to: "🔄 Refresh Models" },
        { selector: '[onclick="loadUsage()"]', text: "刷新", to: "Refresh" },
        { selector: '[onclick="clearUsage()"]', text: "清空", to: "Clear" },

        // Usage table headers
        { selector: '.ut', text: "模型", to: "Model" },
        { selector: '.ut', text: "请求", to: "Requests" },
        { selector: '.ut', text: "输入", to: "Input" },
        { selector: '.ut', text: "输出", to: "Output" },
        { selector: '.ut', text: "总计", to: "Total" },

        // Accounts table headers
        { selector: '.acct-tbl', text: "账号", to: "Account" },
        { selector: '.acct-tbl', text: "状态", to: "Status" },
        { selector: '.acct-tbl', text: "Token", to: "Token" },
        { selector: '.acct-tbl', text: "登录时间", to: "Login Time" },
        { selector: '.acct-tbl', text: "操作", to: "Actions" },

        // Period buttons
        { selector: '#pbTotal', text: "全部", to: "All" },
        { selector: '#pbWeek', text: "本周", to: "This Week" },
        { selector: '#pbToday', text: "今日", to: "Today" },

        // API section
        { selector: '.sl', text: "API 配置", to: "API Configuration" },
        { selector: '.cr span', text: "API 地址", to: "API URL" },
        { selector: '.cr code', text: "任意填写", to: "Any value" },

        // Empty states
        { selector: '.acct-empty', text: "暂无账号，请在上方添加", to: "No accounts, please add above" },
        { selector: '.ue', text: "📊 暂无用量数据", to: "📊 No usage data yet" },

        // Account buttons
        { selector: '.acct-btn.rl', text: "重登", to: "Relogin" },
        { selector: '.acct-btn.rm', text: "删除", to: "Delete" },

        // Collapse
        { selector: '.collapse', text: "高级: 手动粘贴 cURL ▾", to: "Advanced: paste cURL ▾" }
    ];

    // ============ APPLY TRANSLATIONS ============
    function translate() {
        rules.forEach(rule => {
            const elements = document.querySelectorAll(rule.selector);
            elements.forEach(el => {
                if (rule.attr) {
                    if (el[rule.attr] === rule.text) {
                        el[rule.attr] = rule.to;
                    }
                } else {
                    if (el.textContent.trim() === rule.text) {
                        el.textContent = rule.to;
                    }
                }
            });
        });
        const info = document.getElementById('info');
        if (info && info.textContent.includes('失败:')) {
            info.textContent = info.textContent.replace('失败:', 'Error:');
        }
    }

    // ============ FIX MONOSPACE ============
    const style = document.createElement('style');
    style.textContent = `textarea#curl, textarea#curl::placeholder { font-family: system-ui, sans-serif !important; letter-spacing: normal !important; }`;
    document.head.appendChild(style);

    // ============ RUN ============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', translate);
    } else {
        translate();
    }

    new MutationObserver(translate).observe(document.body, {
        childList: true,
        subtree: true
    });

})();