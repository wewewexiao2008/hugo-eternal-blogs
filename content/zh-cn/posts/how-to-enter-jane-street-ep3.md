---
title: "如何进入 Jane Street（第3期）：从零开始学 OCaml"
date: 2026-06-06T00:00:00+08:00
description: "为什么一家自营交易公司用大多数开发者从未接触过的语言写了数百万行代码——以及如何入门 OCaml 的类型系统、模式匹配、模块系统和「让非法状态不可表达」的哲学。"
tags: ["Jane Street", "OCaml", "函数式编程", "类型系统", "面试准备"]
draft: false
series: jane-street
---

前两期我分别介绍了 Jane Street 是什么样的公司，以及他们面试中高频考察的概率基础。这次来聊房间里的大象：**OCaml**。Jane Street 用这门语言写了数百万行代码，整个交易技术栈——从策略到 FPGA 工具链——都是 OCaml。如果你想去那里工作，你需要理解这门语言，不是因为他们期望你第一天就是专家，而是因为它塑造了他们的思维方式。

这一期是我从零开始学 OCaml 的全过程。我会覆盖最重要的概念，并解释*为什么*它们对构建可靠的交易系统至关重要。

## 为什么是 OCaml？（所有人都会问的问题）

大多数交易公司用 C++、Python 或 Java。Jane Street 在 2002 年选择了 OCaml，之后再没换过。原因可以归结为他们的 CTO Yaron Minsky 的一句话：

> "让非法状态不可表达"（Make illegal states unrepresentable）

在大多数语言里，你靠测试来防 bug。在 OCaml 里，你靠**类型**来防 bug。编译器会拒绝可能进入无效状态的程序——不是在运行时，而是在编译时。当你的系统每秒处理数百万美元的交易，在代码跑起来之前就抓住 bug，价值巨大。

代价是：OCaml 的生态比 Python 小，会的人更少。但 Jane Street 把这视为优势而非劣势——语言强制执行的纪律在大规模下会自己回本。

## 概念一：真正有用的类型系统

OCaml 有**静态类型 + 完全推导**。你几乎不需要写类型注解：

```ocaml
let x = 42           (* 编译器推导: int *)
let name = "echo"    (* 编译器推导: string *)
let add a b = a + b  (* 编译器推导: int -> int -> int *)
```

但真正的杀手锏是**没有 null**。OCaml 用 `option` 代替：

```ocaml
let safe_divide a b =
  if b = 0 then None
  else Some (a / b)
```

每个调用者*必须*处理两种情况：

```ocaml
match safe_divide 10 0 with
| Some result -> Printf.printf "Result: %d\n" result
| None -> print_endline "Division by zero"
```

忘记处理 `None`？**编译器直接报错。** 这就是 Tony Hoare 所说的"十亿美元错误"（null 引用）被类型系统解决了。在交易系统里，每个可能缺失的字段——价格、数量、交易对手——都是 `option`，你字面意义上不可能忘记处理缺失的情况。

## 概念二：模式匹配——杀手特性

模式匹配是 `switch` 的究极形态，带**穷尽性检查**：

```ocaml
type order_status =
  | Pending
  | Partially_filled of int
  | Filled of int
  | Cancelled of string

let describe status = match status with
  | Pending -> "等待对手方..."
  | Partially_filled qty ->
    Printf.sprintf "已成交 %d 股，等待剩余" qty
  | Filled qty ->
    Printf.sprintf "完成: %d 股" qty
  | Cancelled reason ->
    Printf.sprintf "已取消: %s" reason
```

如果你以后加一个新变体——比如 `Rejected of string`——编译器会警告你每一个没处理它的 match。在大型代码库里，这价值连城。你可以放心重构。

我用模式匹配写了一个订单状态机，强制执行合法的状态转换：

```ocaml
let process_fill status new_fill =
  match status with
  | Pending -> Partially_filled new_fill
  | Partially_filled existing ->
    let total = existing + new_fill in
    if total >= 1000 then Filled total
    else Partially_filled total
  | Filled _ -> status  (* 已经完成了 *)
  | Cancelled _ -> status  (* 不能成交已取消的订单 *)
```

逻辑读起来就像业务规则：已取消的订单不能成交，已完成的订单保持完成。

## 概念三：代数数据类型——让非法状态不可表达

这是 Yaron Minsky 原则的核心。用支付方式举例：

```ocaml
type payment =
  | Cash
  | Card of string  (* 卡号 *)
```

用这个类型，你**无法**构造一个附带卡号的现金支付。类型系统在物理上阻止了它。对比典型的 OOP 方式：

```python
class Payment:
    def __init__(self, method, card_number=None):
        self.method = method       # "cash" 或 "card"
        self.card_number = card_number  # 现金支付也可能被设了值！
```

Python 版本靠自律和测试来防止无效组合。OCaml 版本靠编译器。在 Jane Street 的规模下，编译器赢。

## 概念四：管道操作符

OCaml 的 `|>` 操作符把操作从左到右串联，像 Unix 管道：

```ocaml
let result =
  [1; 2; 3; 4; 5; 6; 7; 8; 9; 10]
  |> List.filter (fun x -> x mod 2 = 0)
  |> List.map (fun x -> x * x)
  |> List.fold_left (+) 0
(* result = 4 + 16 + 36 + 64 + 100 = 220 *)
```

从上往下读：筛偶数，平方，求和。这是 OCaml 的惯用风格——替代了大多数函数式代码里深层嵌套的函数调用。

## 概念五：模块与函子

OCaml 的模块系统是秘密武器。**模块**将相关类型和函数分组。**模块类型（signature）**定义接口。**函子（functor）**是参数化模块——类似泛型，但作用于整个模块：

```ocaml
module type COMPARABLE = sig
  type t
  val compare : t -> t -> int
end

module MakeSortedSet (Elt : COMPARABLE) = struct
  type t = Elt.t list
  let empty = []
  let rec add x = function
    | [] -> [x]
    | y :: ys as lst ->
      match Elt.compare x y with
      | 0 -> lst
      | n when n < 0 -> x :: lst
      | _ -> y :: add x ys
end

(* 为整数实例化 *)
module IntSet = MakeSortedSet(struct
  type t = int
  let compare = Stdlib.compare
end)
```

Jane Street 的 `Core` 库就是这么建的——它是标准库的替代品，以清晰的 signature 组织的模块集合。读他们的代码时，你能看到每个模块暴露了什么，仅此而已。

## 概念六：不用异常的错误处理

OCaml 的 `result` 类型强制显式错误处理：

```ocaml
type ('a, 'e) result = Ok of 'a | Error of 'e

let parse_price s =
  try Ok (float_of_string s)
  with Failure _ -> Error "invalid price"
```

每个调用者必须确认两条路径：

```ocaml
match parse_price input with
| Ok price -> (* 用有效价格继续 *)
| Error msg -> (* 处理错误 *)
```

这比异常更啰嗦，但它让每个潜在的失败点**在类型签名中可见**。对于一个静默吞掉错误可能意味着百万美元损失的交易系统，这种可见性至关重要。

## 我实际写了什么

为了练习这些概念，我写了七个练习，覆盖上面的模式：

1. **Option 类型**——不会崩溃的安全除法
2. **状态机**——订单生命周期与模式匹配
3. **二叉搜索树**——递归数据结构
4. **高阶函数**——从零实现 map/filter/fold
5. **交易簿**——record 类型跟踪持仓和平均成本
6. **函子排序集合**——通过模块参数化的泛型数据结构
7. **概率数学**——二项分布计算

全部一次编译通过并运行，这就是 OCaml 的体验：编译器很严格，但一旦编译通过，通常就能工作。

## OCaml vs 其他选择

| 维度 | OCaml | Haskell | F# | Scala |
|------|-------|---------|-----|-------|
| 求值策略 | 严格（立即） | 惰性 | 严格 | 严格 |
| 副作用 | 隐式 | 显式（Monad） | 隐式 | 隐式 |
| 模块系统 | 强大 | Type classes | .NET | Mixin traits |
| 学习曲线 | 中等 | 陡峭 | 低（C# 背景） | 中等 |
| 工业验证 | Jane Street（20+ 年） | 金融/区块链 | 微软 | 数据工程 |
| 原生编译 | 是 | 是 | .NET | JVM |

OCaml 的独特定位：**严格求值 + 强类型 + 实用主义**。它不会像 Haskell 那样把你逼进 Monad 教程的螺旋。你可以毫不费力地写副作用。纪律来自类型系统，而非纯度教条。

## 如何开始

1. **安装**：`opam init && opam switch create 5.3.0`（macOS 用 `brew install opam`）
2. **阅读**：[Real World OCaml](https://dev.realworldocaml.org/)（免费在线，Jane Street 工程师维护）
3. **练习**：[ocaml.org/exercises](https://ocaml.org/exercises)——99 道题，对初学者友好
4. **研究 Jane Street 的代码**：[github.com/janestreet](https://github.com/janestreet)——Core、Async、Bignum 全部开源

## 下一步

第 4 期将覆盖**交易员的系统思维**——为什么 Jane Street 关注延迟、内存布局、并发模型和数据结构选择。关联在于：OCaml 给你类型安全，系统思维给你性能。两者缺一不可。

---

*这是一个 13 期系列的第三期，关于如何准备 Jane Street。[第 1 期](/zh-cn/posts/how-to-enter-jane-street-ep1/)介绍了公司本身。[第 2 期](/zh-cn/posts/how-to-enter-jane-street-ep2/)是概率训练营。下期：系统思维。*
