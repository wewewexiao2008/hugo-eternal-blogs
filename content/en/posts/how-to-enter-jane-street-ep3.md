---
title: "How to Enter Jane Street (Ep.3): OCaml from Zero"
date: 2026-06-06T00:00:00+08:00
description: "Why a proprietary trading firm runs millions of lines of a language most developers have never touched — and how to get started with OCaml's type system, pattern matching, modules, and the philosophy of 'make illegal states unrepresentable'."
tags: ["Jane Street", "OCaml", "Functional Programming", "Type Systems", "Interview Preparation"]
draft: false
series: jane-street
---

In the last two episodes I covered what Jane Street is and the probability foundations they test. Now let's talk about the elephant in the room: **OCaml**. Jane Street has written millions of lines of it. Their entire trading stack — from strategies to FPGA tooling — is OCaml. If you want to work there, you need to understand this language, not because they expect you to be an expert on day one, but because it shapes how they think.

This episode is my journey from zero OCaml knowledge to writing working code. I'll cover the concepts that matter most and explain *why* they matter for building reliable trading systems.

## Why OCaml? (The Question Everyone Asks)

Most trading firms use C++, Python, or Java. Jane Street chose OCaml in 2002 and has never looked back. The reason comes down to one principle from their CTO, Yaron Minsky:

> "Make illegal states unrepresentable."

In most languages, you prevent bugs with tests. In OCaml, you prevent bugs with **types**. The compiler rejects programs that could reach invalid states — not at runtime, but at compile time. When you're processing millions of dollars in transactions per second, catching a bug before it runs is worth a lot.

The trade-off: OCaml has a smaller ecosystem than Python and fewer developers know it. But Jane Street views this as a feature, not a bug — the language enforces a discipline that pays for itself at scale.

## Concept 1: Types That Actually Help

OCaml has **static types with full inference**. You rarely need to write type annotations:

```ocaml
let x = 42           (* compiler infers: int *)
let name = "echo"    (* compiler infers: string *)
let add a b = a + b  (* compiler infers: int -> int -> int *)
```

But the real power is **no null**. Instead of `null`, OCaml uses `option`:

```ocaml
(* A value that might not exist *)
let safe_divide a b =
  if b = 0 then None
  else Some (a / b)
```

Every caller *must* handle both cases:

```ocaml
match safe_divide 10 0 with
| Some result -> Printf.printf "Result: %d\n" result
| None -> print_endline "Division by zero"
```

Forget to handle `None`? **The compiler rejects your code.** This is the "billion-dollar mistake" (Tony Hoare's term for null references) solved by the type system. In a trading system, every field that could be missing — price, quantity, counterparty — is an `option`. You literally cannot forget to handle the missing case.

## Concept 2: Pattern Matching — The Killer Feature

Pattern matching is `switch` on steroids, with **exhaustiveness checking**:

```ocaml
type order_status =
  | Pending
  | Partially_filled of int
  | Filled of int
  | Cancelled of string

let describe status = match status with
  | Pending -> "Waiting for counterparty..."
  | Partially_filled qty ->
    Printf.sprintf "Filled %d shares, waiting for rest" qty
  | Filled qty ->
    Printf.sprintf "Complete: %d shares" qty
  | Cancelled reason ->
    Printf.sprintf "Cancelled: %s" reason
```

If you add a new variant later — say `Rejected of string` — the compiler will warn you about every match that doesn't handle it. In a large codebase, this is invaluable. You can refactor without fear.

I built a state machine for order processing that uses pattern matching to enforce valid transitions:

```ocaml
let process_fill status new_fill =
  match status with
  | Pending -> Partially_filled new_fill
  | Partially_filled existing ->
    let total = existing + new_fill in
    if total >= 1000 then Filled total
    else Partially_filled total
  | Filled _ -> status  (* already done *)
  | Cancelled _ -> status  (* can't fill a cancelled order *)
```

The logic reads like the business rule: you can't fill a cancelled order, and a filled order stays filled.

## Concept 3: Algebraic Data Types — Make Illegal States Unrepresentable

This is the core of Yaron Minsky's principle. Consider representing a payment method:

```ocaml
type payment =
  | Cash
  | Card of string  (* card number *)
```

With this type, you **cannot** construct a cash payment with a card number attached. The type system makes it physically impossible. Contrast with a typical OOP approach:

```python
class Payment:
    def __init__(self, method, card_number=None):
        self.method = method       # "cash" or "card"
        self.card_number = card_number  # could be set for cash payments!
```

The Python version relies on discipline and tests to prevent invalid combinations. The OCaml version relies on the compiler. At Jane Street's scale, the compiler wins.

## Concept 4: The Pipeline Operator

OCaml's `|>` operator chains operations left-to-right, like a Unix pipeline:

```ocaml
let result =
  [1; 2; 3; 4; 5; 6; 7; 8; 9; 10]
  |> List.filter (fun x -> x mod 2 = 0)
  |> List.map (fun x -> x * x)
  |> List.fold_left (+) 0
(* result = 4 + 16 + 36 + 64 + 100 = 220 *)
```

Read top-to-bottom: filter evens, square them, sum them. This style is idiomatic OCaml — it replaced the deeply nested function calls you'd see in most functional code.

## Concept 5: Modules and Functors

OCaml's module system is its secret weapon. **Modules** group related types and functions. **Module types (signatures)** define interfaces. **Functors** are parameterized modules — like generics, but for entire modules:

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
  let mem x = List.exists (fun y -> Elt.compare x y = 0)
end

(* Instantiate for integers *)
module IntSet = MakeSortedSet(struct
  type t = int
  let compare = Stdlib.compare
end)
```

Jane Street's `Core` library is built this way — it's a replacement for the standard library, organized as a collection of modules with clean signatures. When you read their code, you see exactly what each module exposes and nothing more.

## Concept 6: Error Handling Without Exceptions

OCaml's `result` type forces explicit error handling:

```ocaml
type ('a, 'e) result = Ok of 'a | Error of 'e

let parse_price s =
  try Ok (float_of_string s)
  with Failure _ -> Error "invalid price"
```

Every caller must acknowledge both paths:

```ocaml
match parse_price input with
| Ok price -> (* proceed with valid price *)
| Error msg -> (* handle the error *)
```

This is more verbose than exceptions, but it makes every potential failure point **visible in the type signature**. For a trading system where a silently swallowed error could mean a million-dollar mistake, this visibility is critical.

## What I Actually Built

To practice these concepts, I wrote seven exercises covering the patterns above:

1. **Option type** — safe division that can't crash
2. **State machine** — order lifecycle with pattern matching
3. **Binary search tree** — recursive data structures
4. **Higher-order functions** — implementing map/filter/fold from scratch
5. **Trade book** — record types tracking position and average cost
6. **Functor-based sorted set** — generic data structure via module parameterization
7. **Probability math** — binomial distribution calculation

All compiled and ran on the first try, which is the OCaml experience: the compiler is strict, but once your code compiles, it usually works.

## OCaml vs The Alternatives

| Dimension | OCaml | Haskell | F# | Scala |
|-----------|-------|---------|-----|-------|
| Evaluation | Strict (eager) | Lazy | Strict | Strict |
| Side effects | Implicit | Explicit (Monad) | Implicit | Implicit |
| Module system | Strong | Type classes | .NET | Mixin traits |
| Learning curve | Medium | Steep | Low (C# bg) | Medium |
| Production proven | Jane Street (20+ yrs) | Finance/Crypto | Microsoft | Data engineering |
| Native compilation | Yes | Yes | .NET | JVM |

OCaml's niche: **strict + strong types + practical**. It doesn't force you into the monad tutorial spiral that Haskell does. You can have side effects without ceremony. The discipline comes from the type system, not from purity dogma.

## Getting Started

1. **Install**: `opam init && opam switch create 5.3.0` (or `brew install opam` on macOS)
2. **Read**: [Real World OCaml](https://dev.realworldocaml.org/) (free online, maintained by Jane Street engineers)
3. **Practice**: [ocaml.org/exercises](https://ocaml.org/exercises) — 99 problems, beginner-friendly
4. **Explore Jane Street's code**: [github.com/janestreet](https://github.com/janestreet) — Core, Async, Bignum are all open source

## What's Next

Episode 4 will cover **Systems Thinking for Traders** — why Jane Street cares about latency, memory layout, concurrency models, and data structure choices. The connection: OCaml gives you the type safety, but systems thinking gives you the performance. Both are necessary.

---

*This is part of a 13-episode series on preparing for Jane Street. [Ep.1](/en/posts/how-to-enter-jane-street-ep1/) covered the company itself. [Ep.2](/en/posts/how-to-enter-jane-street-ep2/) was a probability bootcamp. Next time: systems thinking.*
