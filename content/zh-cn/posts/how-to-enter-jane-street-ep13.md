---
title: "如何进入 Jane Street（第13期）：完整申请攻略——从投递到 offer 的每一环，系列收官"
date: 2026-09-02T00:00:00+08:00
description: "系列最后一期。Jane Street 到底在筛什么、六条入口、完整的申请与面试流程、简历策略、时间线倒推、被拒之后怎么办——全部基于官网与官方问答的可核实信息。十三期备考在这里收官：概率、估算、微结构、OCaml、模拟器，最终都要穿过同一扇门——和一个人坐下来，一起把问题想清楚。"
tags: ["Jane Street", "申请攻略", "面试", "简历", "量化", "求职"]
draft: false
series: jane-street
series_order: 13
---

十三期前，我从一个问题开始：为什么一家交易公司用 OCaml 写所有东西？（[第1期](how-to-enter-jane-street-ep1.md)）十二期过去，桌上摆满了零件：概率、费米估算、市场微结构、系统设计、OCaml、编程题、ML 陷阱、一台审计过账目的交易模拟器。这一期是最后一期，处理唯一剩下的问题：怎么把你自己送进那扇门。

先重申编号：ML 和 Kaggle 的深挖并入了第8期，所以已发布系列是第1-9期加第12期，本篇第13期收官。全部素材来自 Jane Street 官网三个页面（[Interviewing](https://www.janestreet.com/join-jane-street/interviewing/)、[Internships](https://www.janestreet.com/join-jane-street/internships/)、[Open Roles](https://www.janestreet.com/join-jane-street/open-roles/)，2026-09 核实），加上这个系列十二期攒下的备考地图。

## 他们到底在筛什么

把 Interviewing 页读三遍，最醒目的始终是同一句："asking great questions is more important than knowing all the answers." 下面几条全部来自该页 FAQ：

- **不考金融。** Quantitative Trading 方向写明 "We won't test you on knowledge of finance or economics"——面试官想了解的是和你一起解题是什么感觉。
- **不要求 OCaml。** "Most of the software engineers we hire come in without any OCaml or even functional programming experience"，而且他们"强烈建议"不要在面试里第一次用 OCaml。
- **没有 GPA 或学位门槛。** 官方实习项目去年覆盖 70+ 所大学；2025 暑期实习班来自 103+ 所大学、24+ 个国家（[Internships 页](https://www.janestreet.com/join-jane-street/internships/)）。
- **一次申请，全方向评估。** "We consider applicants for every open role, not just the one you apply for"——recruiter 会主动帮你找合适的方向，候选人在流程中被多个团队考虑是常事。

一句话总结：他们筛的是解题方式、协作方式和好奇心，简历上的标签排在其后。Open Roles 页的标语把这件事说到了标题里："We look for smart people with curious minds from any background." 对没进过"目标学校"清单的人，这是结构性利好。

## 六扇门

Interviewing 页把入口分成六个方向，各自的官方定位：

| 方向 | 官方一句话 | 面试里会碰到的 |
|------|-----------|---------------|
| Quantitative Trading | 解题心态：必需；金融背景：可选 | 概率、期望、条件推理、合作解题 |
| Quantitative Research | "Part trader, part engineer, all encompassing" | 交易与技术两种面试的混合 |
| Technology | 好奇而自律的工程师 | 编码挑战，用你顺手的工具和 setup |
| Machine Learning | 把 ML 应用到市场级数据 | 一起做贴近日常工作的建模问题 |
| Strategy & Product | 评估学习速度和拆解问题的路数 | 分析与战略思维，考框架之外的直觉 |
| Trading Desk Operations | 技术 + 组织 + 沟通 | 快节奏环境的适应力 |

办公室在纽约、伦敦、香港；实习通常 5-9 月间 10-12 周，另有按学期安排的 off-cycle 选项。

Quant Research 那行值得多看一眼：交易和工程的重叠地带，面试流程干脆就是两个部门的混合。这个系列一直在训练的正是这个交叉点。

## 流程长什么样

官方 FAQ 加上 recruiting 团队 Kristen 的公开问答，拼出的完整时间线：

1. **在线申请。** 滚动审核，没有固定 deadline，官方建议尽早。什么时候算"准备好"？Kristen 给的标准很好用：接下来几周内就能进面试的状态。
2. **recruiter 反馈。** 几天之内就有回音。
3. **电话/视频轮。** 面试只在周一到周五的工作时间进行——周末不面试，官方理由直接指向 work-life balance。
4. **现场轮。** 多轮。差旅和酒店全部由公司预订并支付。着装随意：牛仔裤 T 恤即可。
5. **每轮一周内给反馈。** 原话是 "no one likes to be left hanging"——无论过没过都答复。

另外三个实用细节。有竞争 offer 的 deadline 可以直说，他们常能加急流程；申请表底部有一个自由文本框，官方明确鼓励放简历装不下的东西；官方招聘邮件永远来自 `@janestreet.com` 域名、绝不索要银行信息，拿不准可以直接发 `recruiting-security@janestreet.com` 核实。

## 面试是一场合作解题

"Collaborative problem solving" 在官网的位置太核心了，值得当成一份技术规格来读。它意味着：题目是互动的、渐进式的，面试官会提示和引导；同一道题鼓励多种解法；你的思考过程是主要观察对象；卡住时开口求助是正确操作，沉默才是减分项。

按这个规格，前十二期的备考恰好各就各位：

| 面试题型 | 对应期数 |
|---------|---------|
| 概率、期望、贝叶斯 | [第2期](how-to-enter-jane-street-ep2.md)：16 个经典题型 + 模拟对账 |
| 费米估算 | [第7期](how-to-enter-jane-street-ep7.md) |
| Puzzle 式巧题 | [第5期](how-to-enter-jane-street-ep5.md)：六步方法论 + Hamming 码帽子博弈 |
| 市场微结构、做市 | [第6期](how-to-enter-jane-street-ep6.md) |
| 白板编程 | [第9期](how-to-enter-jane-street-ep9.md)：六大题型全部本地实现 |
| 系统设计 | [第4期](how-to-enter-jane-street-ep4.md)：延迟层次、并发模型 |
| "你搭过什么" | [第12期](how-to-enter-jane-street-ep12.md)：模拟器 + 三个 bug 的审计故事 |

官方还提供几个方向的 mock interview 视频，Kristen 明确建议先看。准备技术之外，练一件常被忽略的事：边想边说。协作式面试里，一段沉默的完美推导，价值低于一段出声的合格推导。

## 简历：Show, don't tell

原则只有三条。

1. **展示而非声称。** "strong analytical skills" 一文不值；"用 Hamming 码策略把 n 人帽子博弈胜率提到 n/(n+1)，10^6 次模拟验证 0.9375" 是证据。
2. **量化一切。** 行数、场景数、种子数、误差——还记得[第12期](how-to-enter-jane-street-ep12.md)那 28 美分的成本对账吗？那种精度的对账本身就是简历语言。
3. **项目大于课程。** 自己搭过的东西最有说服力，因为面试的下一问天然就是"讲讲你做了什么"。

拿这个系列自身当例子。如果由我来投，简历和文本框里能放：

- 概率 16+ 题型的理论推导 + Python 模拟对账（第2期）
- 六步 puzzle 方法论：计数、期望、信息论、协作博弈全覆盖（第5期）
- OCaml 订单匹配引擎，Async 并发（第3期起步、第8期实操）
- 8 模块交易模拟器：行情 → 信号 → 风控 → 执行 → 组合 → 分析，五场景压力测试，修复三个仓位记账 bug 后做到分级的成本闭合（第12期）
- Kaggle 2020 竞赛方法论复盘：utility ≠ accuracy、MLP 集成、CPCV（第8期）

每一条都经得起十五分钟的追问——这才是真正的筛选标准：你写上去的每样东西，都得能现场重建。做不到的，删掉。

## 时间线倒推

滚动录取把"什么时候投"变成了策略题。名额随时间递减，官方建议尽早；Kristen 的"几周内可面试"标准又把"早"约束在"不慌"之内。假设目标锁定下一个暑期实习季，一张倒推表：

| 阶段 | 重点 |
|------|------|
| T-3 月 | 概率、估算回到秒答；编程题手感，LeetCode Medium-Hard |
| T-2 月 | 每月 JS puzzle 做起来；项目收尾，把"可讲的故事"写顺 |
| T-1 月 | 简历 + 文本框打磨；官方 mock interview 视频；找人模拟边想边说 |
| T-0 | 投递。之后每轮一周内有回音 |
| 面试中 | think out loud；先给正确解再优化；edge cases 主动列；卡住就问 |

## 被拒之后

官方 FAQ 有一段原话值得整段引用：

> "Plenty of people who currently work at Jane Street didn't make it through our interview process their first time around."

他们的建议：在校学生等约一年，有经验者等到履历有实质变化再投；Kristen 的版本是 "several success stories of people who are hired their second or even third time around"。这把"被拒"从终审判决重新定义成了校准信息——当时的信号不够，一年后带着新的作品再来。对以 puzzle 和模拟器为日常的公司，这个安排毫不意外：他们自己就相信迭代。

## 文化信号，以及为什么这些也该准备

面试是双向的，你也在评估他们。官方页面上能读到的文化常数：每晚 6:30 办公室基本空了；着装随意；月度 puzzle 就挂在官网导航栏里；实习一天的官方课表里有扑克、模拟交易、"为什么 Jane Street 用 OCaml"、启发式与偏差。做市商把博弈类游戏当成训练，把博弈论课程开进实习——这些细节拼出的图景，和面试里"我们一起解题"的语气完全一致。

Signals & Threads 播客有一期 "An Inside Look at Jane Street's Tech Internship"，几位从实习转正的工程师聊项目细节——想验证上面这些是不是宣传话术，听一期就够。交易员 Sandor Lehoczky（《The Art of Problem Solving》合著者）对实习项目的评价是："打磨了超过十五年，而且一年比一年好。"

读完这些如果觉得"这像我想待的地方"，面试里自然流露的兴趣就是真的；如果不觉得，这个判断本身也有价值——它替你省下了几轮面试。

## 收官：十三期地图

| # | 主题 | 一句话 |
|---|------|--------|
| 1 | [Why Jane Street](how-to-enter-jane-street-ep1.md) | OCaml 全栈的公司哲学 |
| 2 | [Probability Bootcamp](how-to-enter-jane-street-ep2.md) | 16 题型 + 模拟对账 |
| 3 | [OCaml from Zero](how-to-enter-jane-street-ep3.md) | 类型系统、模块、pattern matching |
| 4 | [Systems Thinking](how-to-enter-jane-street-ep4.md) | 延迟层次、并发、缓存布局 |
| 5 | [Puzzles Deep Dive](how-to-enter-jane-street-ep5.md) | 六步方法论、Hamming 码帽子博弈 |
| 6 | [Market Microstructure](how-to-enter-jane-street-ep6.md) | 订单簿、做市、价差、滑点 |
| 7 | [Art of Estimation](how-to-enter-jane-street-ep7.md) | 费米问题与数量级 |
| 8 | [ML at Trading Scale](how-to-enter-jane-street-ep8.md) | 低信噪比、Kaggle、de Prado 工具箱 |
| 9 | [Coding Interview](how-to-enter-jane-street-ep9.md) | 六大题型本地实现 |
| 10-11 | （并入第8期） | — |
| 12 | [Trading Simulator](how-to-enter-jane-street-ep12.md) | 8 模块流水线 + 3 个 bug 审计 |
| 13 | 申请攻略（本篇） | 从投递到 offer |

从第1期的"为什么是 OCaml"到这里，这个系列给我的最终答案和官网那句标语严丝合缝："smart people with curious minds from any background"。备考的全部意义，在于把自己变成这句话的可验证版本——每一次推导、每一轮模拟对账、每一个修掉又归因的 bug，都在给 "curious mind" 这个词提供可追问的证据。

门在那里。下一步是投出去。

---

*这是我的 Jane Street 备考系列第 13 期，也是最后一期。全系列从[第1期](how-to-enter-jane-street-ep1.md)的 OCaml 之问开始，途经[概率](how-to-enter-jane-street-ep2.md)、[估算](how-to-enter-jane-street-ep7.md)、[微结构](how-to-enter-jane-street-ep6.md)、[编程](how-to-enter-jane-street-ep9.md)，落在[那台修过三个 bug 的模拟器](how-to-enter-jane-street-ep12.md)上。所有官方引文均于 2026-09 从 janestreet.com 核实。*
