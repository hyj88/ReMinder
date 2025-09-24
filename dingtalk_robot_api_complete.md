# 钉钉机器人API完整文档

## 1. 概述

钉钉机器人API允许通过Webhook向钉钉群聊发送各种类型的消息。通过自定义机器人，用户可以将第三方服务的信息推送到钉钉群聊中。

## 2. Webhook地址

```
https://oapi.dingtalk.com/robot/send?access_token=XXXXXX
```

其中`access_token`是在创建机器人时生成的唯一标识符。

## 3. 消息发送方式

通过POST请求向Webhook地址发送JSON格式数据：
```
POST https://oapi.dingtalk.com/robot/send?access_token=xxxx
Content-Type: application/json
```

## 4. 支持的消息类型

### 4.1 文本消息 (text)

#### 参数说明
- `msgtype`: "text"
- `text.content`: 消息内容
- `at`: @用户设置
  - `atMobiles`: 手机号列表
  - `atUserIds`: 用户ID列表
  - `isAtAll`: 是否@所有人

#### 示例代码
```json
{
    "msgtype": "text",
    "text": {
        "content": "杭州天气：晴，温度：15℃"
    },
    "at": {
        "atMobiles": ["13800138000"],
        "isAtAll": false
    }
}
```

### 4.2 链接消息 (link)

#### 参数说明
- `msgtype`: "link"
- `link.title`: 消息标题
- `link.text`: 消息内容
- `link.messageUrl`: 点击消息跳转链接
- `link.picUrl`: 图片URL

#### 示例代码
```json
{
    "msgtype": "link",
    "link": {
        "text": "这个即将发布的新版本，创始人陈航（花名“无招”）称它为“红树林”。",
        "title": "时代的火车向前开",
        "picUrl": "https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png",
        "messageUrl": "https://www.dingtalk.com/"
    }
}
```

### 4.3 Markdown消息 (markdown)

#### 参数说明
- `msgtype`: "markdown"
- `markdown.title`: 消息标题
- `markdown.text`: Markdown格式文本
- `at`: @用户设置（同文本消息）

#### 示例代码
```json
{
    "msgtype": "markdown",
    "markdown": {
        "title": "杭州天气",
        "text": "#### 杭州天气  \n > 9度，西北风1级，空气良89，相对温度73%  \n > ![screenshot](https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png)  \n > ###### 10点20分发布 [天气](https://www.dingtalk.com/)  \n"
    },
    "at": {
        "atMobiles": ["13800138000"],
        "isAtAll": false
    }
}
```

### 4.4 ActionCard消息 (actionCard)

#### 参数说明
- `msgtype`: "actionCard"
- `actionCard.title`: 消息标题
- `actionCard.text`: 消息内容（支持Markdown）
- `actionCard.singleTitle`: 单按钮标题
- `actionCard.singleURL`: 单按钮链接
- `actionCard.btnOrientation`: 按钮排列方式（0-横向，1-纵向）
- `actionCard.btns`: 按钮数组
  - `title`: 按钮标题
  - `actionURL`: 按钮链接

#### 示例代码（单按钮）
```json
{
    "msgtype": "actionCard",
    "actionCard": {
        "title": "乔布斯 20 年前想打造一间苹果咖啡厅，而它正是 Apple Store 的前身",
        "text": "![screenshot](https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png) \n\n #### 乔布斯 20 年前想打造的苹果咖啡厅 \n\n Apple Store 的设计正从原来满满的科技感走向生活化，而其生活化的走向其实可以追溯到 20 年前苹果一个很不起眼的商业决定，从 Apple Store 第一家店开始，乔布斯就让其从一开始给人们的感觉定调了。",
        "singleTitle": "阅读全文",
        "singleURL": "https://www.dingtalk.com/"
    }
}
```

#### 示例代码（多按钮）
```json
{
    "msgtype": "actionCard",
    "actionCard": {
        "title": "乔布斯 20 年前想打造一间苹果咖啡厅，而它正是 Apple Store 的前身",
        "text": "![screenshot](https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png) \n\n #### 乔布斯 20 年前想打造的苹果咖啡厅 \n\n Apple Store 的设计正从原来满满的科技感走向生活化，而其生活化的走向其实可以追溯到 20 年前苹果一个很不起眼的商业决定，从 Apple Store 第一家店开始，乔布斯就让其从一开始给人们的感觉定调了。",
        "btns": [
            {
                "title": "内容不错",
                "actionURL": "https://www.dingtalk.com/"
            },
            {
                "title": "不感兴趣",
                "actionURL": "https://www.dingtalk.com/"
            }
        ],
        "btnOrientation": "0"
    }
}
```

### 4.5 FeedCard消息 (feedCard)

#### 参数说明
- `msgtype`: "feedCard"
- `feedCard.links`: 链接数组
  - `title`: 单条信息文本
  - `messageURL`: 点击单条信息跳转链接
  - `picURL`: 单条信息图片URL

#### 示例代码
```json
{
    "msgtype": "feedCard",
    "feedCard": {
        "links": [
            {
                "title": "时代的火车向前开1",
                "messageURL": "https://www.dingtalk.com/",
                "picURL": "https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png"
            },
            {
                "title": "时代的火车向前开2",
                "messageURL": "https://www.dingtalk.com/",
                "picURL": "https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png"
            }
        ]
    }
}
```

## 5. 完整实现示例

### 5.1 Python实现
```python
import requests
import json

def send_dingtalk_message(webhook_url, message_data):
    """
    发送钉钉机器人消息
    
    Args:
        webhook_url (str): 钉钉机器人的Webhook地址
        message_data (dict): 消息内容字典
    
    Returns:
        dict: 钉钉API响应结果
    """
    headers = {'Content-Type': 'application/json'}
    response = requests.post(webhook_url, data=json.dumps(message_data), headers=headers)
    return response.json()

# 示例：发送文本消息
webhook_url = "https://oapi.dingtalk.com/robot/send?access_token=your_token"
text_message = {
    "msgtype": "text",
    "text": {
        "content": "测试消息发送"
    }
}

result = send_dingtalk_message(webhook_url, text_message)
print(result)
```

### 5.2 JavaScript实现
```javascript
async function sendDingTalkMessage(webhookUrl, messageData) {
    /**
     * 发送钉钉机器人消息
     * 
     * @param {string} webhookUrl - 钉钉机器人的Webhook地址
     * @param {Object} messageData - 消息内容对象
     * @returns {Promise<Object>} 钉钉API响应结果
     */
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        return await response.json();
    } catch (error) {
        console.error('发送消息失败:', error);
        throw error;
    }
}

// 示例：发送Markdown消息
const webhookUrl = "https://oapi.dingtalk.com/robot/send?access_token=your_token";
const markdownMessage = {
    "msgtype": "markdown",
    "markdown": {
        "title": "测试标题",
        "text": "## 测试消息  \n > 这是一条测试消息"
    }
};

sendDingTalkMessage(webhookUrl, markdownMessage)
    .then(result => console.log(result))
    .catch(error => console.error(error));
```

## 6. 安全设置

### 6.1 签名验证

签名验证是一种基于密钥的安全机制，用于验证请求的合法性。

#### 实现原理
1. 在创建机器人时，钉钉会生成一个密钥（secret）。
2. 当机器人发送请求时，需要在请求头中包含签名信息。
3. 签名的计算方法为：将时间戳和密钥作为参数，通过HMAC-SHA256算法计算出签名值。
4. 钉钉服务器收到请求后，会使用相同的算法和密钥计算签名，并与请求中的签名进行对比，验证请求的合法性。

#### 配置步骤
1. 登录钉钉开放平台，进入机器人管理页面。
2. 选择需要配置的机器人，点击"编辑"按钮。
3. 在安全设置中，勾选"签名验证"选项。
4. 保存配置后，系统会生成一个密钥（secret），请妥善保管。

#### 代码示例（Python）
```python
import time
import hmac
import hashlib
import base64
import urllib.parse

timestamp = str(round(time.time() * 1000))
secret = 'your_secret_here'
secret_enc = secret.encode('utf-8')
string_to_sign = '{}\n{}'.format(timestamp, secret)
string_to_sign_enc = string_to_sign.encode('utf-8')
hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
print(timestamp)
print(sign)
```

### 6.2 IP白名单

IP白名单是一种限制访问来源的安全机制。通过配置IP白名单，可以确保只有指定IP地址的请求才能访问机器人。

#### 配置步骤
1. 登录钉钉开放平台，进入机器人管理页面。
2. 选择需要配置的机器人，点击"编辑"按钮。
3. 在安全设置中，勾选"IP白名单"选项。
4. 添加允许访问的IP地址或IP段。
5. 保存配置。

## 7. 常见错误码

### 7.1 公共错误码

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 404 | 请求的API不存在 | 请求的API地址不存在。 |
| 401 | 请求的API需要认证 | 请求的API需要进行身份认证。 |
| 403 | 请求的API不允许访问 | 请求的API没有权限访问。 |
| 400 | 请求参数错误 | 请求参数有误，请检查参数格式和内容。 |
| 500 | 服务端内部错误 | 服务端出现异常，请稍后再试。 |

### 7.2 机器人相关错误码

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 300001 | 机器人被禁用 | 机器人已被管理员禁用，无法发送消息。 |
| 300002 | 机器人未激活 | 机器人未激活，请先激活机器人。 |
| 300003 | 机器人发送消息频率超限 | 机器人发送消息的频率超过限制，请降低发送频率。 |
| 300004 | 机器人发送的消息内容为空 | 发送的消息内容不能为空。 |
| 300005 | 机器人发送的消息内容过长 | 发送的消息内容超过最大长度限制。 |
| 300006 | 机器人发送的消息类型不支持 | 发送的消息类型不在支持范围内。 |
| 300007 | 机器人发送的消息格式错误 | 发送的消息格式不符合要求。 |
| 300008 | 机器人发送的消息包含敏感词 | 发送的消息中包含敏感词，无法发送。 |

### 7.3 Access Token相关错误码

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 400001 | access_token无效 | 提供的access_token无效，请检查是否正确获取并传递了access_token。 |
| 400002 | access_token已过期 | 提供的access_token已过期，请重新获取新的access_token。 |
| 400003 | access_token权限不足 | 提供的access_token权限不足以执行当前操作，请检查权限配置。 |
| 400004 | access_token被禁用 | 提供的access_token已被禁用，请联系管理员。 |

### 7.4 签名相关错误码

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 400101 | 签名错误 | 提供的签名不正确，请检查签名算法和参数。 |
| 400102 | 签名时间戳过期 | 签名时间戳已过期，请使用当前时间重新生成签名。 |
| 400103 | 签名参数缺失 | 签名所需的参数缺失，请检查请求参数。 |
| 400104 | 签名参数错误 | 签名参数有误，请检查参数格式和内容。 |

### 7.5 请求频率限制相关错误码

| 错误码 | 错误信息 | 描述 |
|--------|----------|------|
| 410001 | 请求频率超限 | 请求频率超过限制，请降低请求频率。 |
| 410002 | IP地址被限制 | 请求的IP地址被限制，请检查IP地址是否在白名单中。 |
| 410003 | 用户请求频率超限 | 用户请求频率超过限制，请降低请求频率。 |
| 410004 | 应用请求频率超限 | 应用请求频率超过限制，请降低请求频率。 |
| 410005 | 机器人请求频率超限 | 机器人请求频率超过限制，请降低请求频率。 |

## 8. 注意事项

1. 每个机器人每分钟最多发送20条消息
2. 消息发送成功后，接口会返回`{"errcode":0,"errmsg":"ok"}`
3. 发送失败时会返回相应的错误码和错误信息
4. 使用签名机制可以提高安全性，需要在Webhook地址后添加`&sign=xxx`参数
5. 消息内容中的特殊字符需要进行转义处理
6. 图片URL必须是可公开访问的地址