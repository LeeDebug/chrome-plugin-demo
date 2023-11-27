console.log('这是content script!');

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function()
{
	// 注入自定义JS
	injectCustomJs();
	// 给谷歌搜索结果的超链接增加 _target="blank"
	if(location.host == 'www.google.com.tw')
	{
		var objs = document.querySelectorAll('h3.r a');
		for(var i=0; i<objs.length; i++)
		{
			objs[i].setAttribute('_target', 'blank');
		}
		console.log('已处理谷歌超链接！');
	}
	else if(location.host == 'www.baidu.com')
	{
		function fuckBaiduAD()
		{
			if(document.getElementById('my_custom_css')) return;
			var temp = document.createElement('style');
			temp.id = 'my_custom_css';
			(document.head || document.body).appendChild(temp);
			var css = `
			/* 移除百度右侧广告 */
			#content_right{display:none;}
			/* 覆盖整个屏幕的相关推荐 */
			.rrecom-btn-parent{display:none;}'
			/* 难看的按钮 */
			.result-op.xpath-log{display:none !important;}`;
			temp.innerHTML = css;
			console.log('已注入自定义CSS！');
			// 屏蔽百度推广信息
			removeAdByJs();
			// 这种必须用JS移除的广告一般会有延迟，干脆每隔一段时间清楚一次
			interval = setInterval(removeAdByJs, 2000);
			
			// 重新搜索时页面不会刷新，但是被注入的style会被移除，所以需要重新执行
			temp.addEventListener('DOMNodeRemoved', function(e)
			{
				console.log('自定义CSS被移除，重新注入！');
				if(interval) clearInterval(interval);
				fuckBaiduAD();
			});
		}
		let interval = 0;
		function removeAdByJs()
		{
			$('[data-tuiguang]').parents('[data-click]').remove();
		}
		fuckBaiduAD();
		initCustomPanel();
		initCustomEventListen();
	}
});

function initCustomPanel()
{
	var panel = document.createElement('div');
	panel.className = 'chrome-plugin-demo-panel';
	panel.innerHTML = `
		<h2>injected-script操作content-script演示区：</h2>
		<div class="btn-area">
			<a href="javascript:sendMessageToContentScriptByPostMessage('你好，我是普通页面！')">通过postMessage发送消息给content-script</a><br>
			<a href="javascript:sendMessageToContentScriptByEvent('你好啊！我是通过DOM事件发送的消息！')">通过DOM事件发送消息给content-script</a><br>
			<a href="javascript:invokeContentScript('sendMessageToBackground()')">发送消息到后台或者popup</a><br>
		</div>
		<div id="my_custom_log">
		</div>
	`;
	document.body.appendChild(panel);
}

// 向页面注入JS
function injectCustomJs(jsPath)
{
	jsPath = jsPath || 'js/inject.js';
	var temp = document.createElement('script');
	temp.setAttribute('type', 'text/javascript');
	// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
	temp.src = chrome.extension.getURL(jsPath);
	temp.onload = function()
	{
		// 放在页面不好看，执行完后移除掉
		this.parentNode.removeChild(this);
	};
	document.body.appendChild(temp);
}

// 接收来自后台的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
	console.log('收到来自 ' + (sender.tab ? "content-script(" + sender.tab.url + ")" : "popup或者background") + ' 的消息：', request);
	if(request.cmd == 'update_font_size') {
		var ele = document.createElement('style');
		ele.innerHTML = `* {font-size: ${request.size}px !important;}`;
		document.head.appendChild(ele);
	}
	else {
		tip(JSON.stringify(request));
		sendResponse('我收到你的消息了：'+JSON.stringify(request));
	}
	console.log('=-=-=-> 触发 tab 页的 onMessage 方法: ', 33333333333, request.action)
    if (request.action === 'openPictures') {
        downloadPictures('open');
    }
    if (request.action === 'downloadPictures') {
        downloadPictures('download');
    }
});

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground(message) {
	chrome.runtime.sendMessage({greeting: message || '你好，我是content-script呀，我主动发消息给后台！'}, function(response) {
		tip('收到来自后台的回复：' + response);
	});
}

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
	console.log(port);
	if(port.name == 'test-connect') {
		port.onMessage.addListener(function(msg) {
			console.log('收到长连接消息：', msg);
			tip('收到长连接消息：' + JSON.stringify(msg));
			if(msg.question == '你是谁啊？') port.postMessage({answer: '我是你爸！'});
		});
	}
});

// window.addEventListener("message", function(e)
// {
// 	console.log('收到消息：', e.data);
// 	if(e.data && e.data.cmd == 'invoke') {
// 		eval('('+e.data.code+')');
// 	}
// 	else if(e.data && e.data.cmd == 'message') {
// 		tip(e.data.data);
// 	}
// }, false);


function initCustomEventListen() {
	var hiddenDiv = document.getElementById('myCustomEventDiv');
	if(!hiddenDiv) {
		hiddenDiv = document.createElement('div');
		hiddenDiv.style.display = 'none';
		hiddenDiv.id = 'myCustomEventDiv';
		document.body.appendChild(hiddenDiv);
	}
	hiddenDiv.addEventListener('myCustomEvent', function() {
		var eventData = document.getElementById('myCustomEventDiv').innerText;
		tip('收到自定义事件：' + eventData);
	});
}

var tipCount = 0;
// 简单的消息通知
function tip(info) {
	info = info || '';
	var ele = document.createElement('div');
	ele.className = 'chrome-plugin-simple-tip slideInLeft';
	ele.style.top = tipCount * 70 + 20 + 'px';
	ele.innerHTML = `<div>${info}</div>`;
	document.body.appendChild(ele);
	ele.classList.add('animated');
	tipCount++;
	setTimeout(() => {
		ele.style.top = '-100px';
		setTimeout(() => {
			ele.remove();
			tipCount--;
		}, 400);
	}, 3000);
}

/**
 * TODO By Edan: 开发插件函数
 */

// 打开 picture 类型图片
async function openPictures(pictures, operate) {
    let count = 0
    for (let i = 0; i < pictures.length; i++) {
        const highSrc = pictures[i].getAttribute('data-highres-images')
        console.log(i, highSrc)
        await new Promise((resolve) => {
            if(highSrc) {
                // 有效图片计数器+1
                count++
                // 打开高清图片
                setTimeout(() => {
					if (operate === 'download') {
						// 方法 1: 使用 chrome 插件的方法下载
						// chrome.downloads.download({
						// 	url: highSrc // 替换为你要下载的文件 URL
						// 	// filename: 'downloaded_image.jpg', // 你可以自定义文件名
						// 	// saveAs: false // 如果设为 true，则会弹出保存对话框
						// });
						// 方法 2: 创建 a 标签下载
						// var link = document.createElement('a');
						// link.href = highSrc;
						// // 可以自定义文件名
						// link.download = highSrc;
						// // 模拟点击下载
						// link.click();
						// 方法 3: 使用 fetch 请求下载
						downloadFunction(highSrc)
					}
					if (operate === 'open') window.open(highSrc)
				}, 500)
            }
            resolve()
        });
    }
    // 打印检测结果
    setTimeout(() => {
        alert(`共检测到 ${pictures.length} 张 picture 类型原始图片，最终成功打开 ${count} 张有效图片！`)
    }, 1000)
}

// 下载某张图片
function downloadFunction(imageUrl) {
	// 发送 GET 请求获取图片数据
	fetch(imageUrl)
		.then(response => response.blob())
		.then(blob => {
			// 创建 Blob 对象
			var blobUrl = URL.createObjectURL(blob);
			console.log('=-=-=-> imageUrl: ', imageUrl)
			console.log('=-=-=-> blobUrl: ', blobUrl)

			// 创建下载链接
			var link = document.createElement('a');
			link.href = blobUrl;
			link.download = `${extractString(imageUrl)}.png`; // 可以自定义文件名 'downloaded_image.jpg'

			// 模拟点击下载
			link.click();

			// 释放 Blob 对象
			URL.revokeObjectURL(blobUrl);
		})
		.catch(error => console.error('Error downloading image:', error));
}

// 获取文件名
function extractString(inputString) {
	// 查找最后一个 / 的位置
	var lastSlashIndex = inputString.lastIndexOf('/');

	// 查找第一个 ? 的位置
	var firstQuestionMarkIndex = inputString.indexOf('?');

	// 如果不存在 ?，或者 ? 在 / 后面，则取字符串的最后一个 / 之后的内容
	if (firstQuestionMarkIndex === -1 || lastSlashIndex > firstQuestionMarkIndex) {
		return inputString.substring(lastSlashIndex + 1);
	}

	// 否则，取字符串的最后一个 / 之后到第一个 ? 之前的内容
	return inputString.substring(lastSlashIndex + 1, firstQuestionMarkIndex);
}

// 打开 img 类型的图片
async function openImgs(pictures, operate) {
    let count = 0
    for (let i = 0; i < pictures.length; i++) {
        const isHigh = pictures[i].getAttribute('importance')
        console.log('isHigh: ', isHigh)
        if (isHigh !== 'high') continue
        const highSrc = pictures[i].getAttribute('src')
        console.log('i: ', i, '; highSrc: ', highSrc)
        await new Promise((resolve) => {
            if(highSrc) {
                // 有效图片计数器+1
                count++
                // 打开高清图片
                setTimeout(() => {
					if (operate === 'download') {
						// 方法 3: 使用 fetch 请求下载
						downloadFunction(highSrc.split('?')[0])
					}
					if (operate === 'open') window.open(highSrc.split('?')[0])
				}, 500)
            }
            resolve()
        });
    }
    // 打印检测结果
    setTimeout(() => {
        alert(`共检测到 ${pictures.length} 张 img 类型原始图片，最终成功打开 ${count} 张有效图片！`)
    }, 1000)
}

async function downloadPictures(operate) {
    // // 获取当前时间
    // const currentDate = new Date();
    // // 设置目标日期为 2023 年 11 月 30 日 23 点 59 分
    // const targetDate = new Date('2023-11-30T23:59:00');
    // if (currentDate >= targetDate) {
    //     alert('使用结束，请使用正式版本！')
    //     return false
    // }

    // 找 picture 类型的图片
    let pictures = document.getElementsByTagName('picture')
    if (pictures.length) {
        await openPictures(pictures, operate)
        return true
    }

    // 找 img 类型的图片
    pictures = document.getElementsByTagName('img')
    console.log(pictures)
    if (pictures.length) {
        await openImgs(pictures, operate)
        return true
    }

    // 如果什么都没找到
    alert('未找到有效图片，请更换 VPN 或联系技术开发人员！感谢使用！')
    return false
}

// 正式执行流程
// main()