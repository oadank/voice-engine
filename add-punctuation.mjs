#!/usr/bin/env node
/**
 * 中文标点恢复 - Node.js 版（纯正则，零依赖）
 * 用法: node add-punctuation.mjs "无标点文本"
 * 输出: 添加标点后的文本
 */

const text = process.argv[2];
if (!text) process.exit(0);

// 去掉中文标点（保留英文标点如 . , 以免破坏 Node.js 等缩写）
let clean = text.replace(/[，。！？、；：]+/g, '').trim();
if (!clean) process.exit(0);

let result = clean;

// === 规则 1: 疑问句尾 ===
// "吗/呢/吧/啊/哦/嗯/呀" + 后面还有中文内容 → 加句号
result = result.replace(/(吗|呢|吧|啊|哦|嗯|呀|哈|呵|嘛|啦|咯)(?=[\u4e00-\u9fff])/g, '$1。');

// === 规则 2: 转折/连接词前加逗号 ===
const conj = '但是|可是|然而|不过|而且|并且|同时|另外|此外|因此|所以|于是|然后|接着|最后|总之|比如|例如|如果|假如|要是|除非|即使|虽然|尽管|既然';
result = result.replace(new RegExp(`([\u4e00-\u9fff]{2,}?)(${conj})`, 'g'), '$1，$2');

// === 规则 3: 语气短语前加逗号 ===
const phrases = '就是|也就是说|其实|实际上|事实上|基本上';
result = result.replace(new RegExp(`([\u4e00-\u9fff]{3,}?)(${phrases})`, 'g'), '$1，$2');

// === 规则 3b: "的话" 后加逗号（条件从句标记）===
result = result.replace(/(的话)(?=[\u4e00-\u9fff]{2,})/g, '$1，');

// === 规则 4: 句式断句 ===
// "V一下/V起来/V出来/V过去" 等动补结构后加逗号
result = result.replace(/([\u4e00-\u9fff]{2,}(?:一下|起来|出来|过去|过来|下去|上去|回来|回去|下来))(?=[\u4e00-\u9fff]{3,})/g, '$1，');

// === 规则 5: 长句兜底 ===
// 连续中文超过 20 字没有标点，在中文字符边界加逗号
function breakLongSegments(text) {
  let out = '';
  let chineseRun = '';
  for (const char of text) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      chineseRun += char;
      if (chineseRun.length >= 20) {
        const breakAt = Math.floor(chineseRun.length * 0.6);
        out += chineseRun.substring(0, breakAt) + '，';
        chineseRun = chineseRun.substring(breakAt);
      }
    } else {
      out += chineseRun;
      chineseRun = '';
      out += char;
    }
  }
  out += chineseRun;
  return out;
}
result = breakLongSegments(result);

// === 句末加句号 ===
if (result && !'，。！？、；：'.includes(result[result.length - 1])) {
  result += '。';
}

console.log(result);
