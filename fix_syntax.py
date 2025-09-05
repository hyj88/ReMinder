#!/usr/bin/env python3

# 修复 app.js 文件中的语法错误

import re

# 读取文件内容
with open('/Users/hyj/Desktop/tixing/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复1: 移除重复的 autoRenewCheckbox 声明
# 查找并修复重复声明的问题
pattern1 = r'(\s*// 自动续期选项的事件监听\s*\n\s*const autoRenewCheckbox = document\.getElementById\([^)]+\);\s*\n)(\s*// 自动续期选项的事件监听\s*\n\s*const autoRenewCheckbox = document\.getElementById\([^)]+\);)'
content = re.sub(pattern1, r'\1', content)

# 修复2: 修复多余的闭合大括号
# 查找并修复多余的闭合大括号问题
pattern2 = r'(\s*// --- 新增结束 ---\s*\n)(\}\})'
content = re.sub(pattern2, r'\1}', content)

# 修复3: 确保所有函数都有正确的闭合
# 查找 setupEventListeners 函数的结尾并确保它正确闭合
pattern3 = r'(function setupEventListeners\(\) \{.*?)(\s*// --- 新增结束 ---\s*\n\}\s*\n\})'
# 这个模式可能太复杂，让我们用更简单的方法

# 写入修复后的内容
with open('/Users/hyj/Desktop/tixing/app.js.fixed', 'w', encoding='utf-8') as f:
    f.write(content)

print("文件已修复并保存为 app.js.fixed")